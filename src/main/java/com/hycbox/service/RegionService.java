package com.hycbox.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hycbox.dto.resp.RegionImportResult;
import com.hycbox.dto.resp.RegionResp;
import com.hycbox.entity.RegionEntity;
import com.hycbox.exception.BizException;
import com.hycbox.repository.RegionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * 全国省市区县名录：从阿里云 DataV GeoAtlas 拉取并落库。
 * 只存 adcode/名称/层级/中心点，边界多边形留给后期经纬度反查。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class RegionService {

    /** 全国根编码；省级 parent 指向它 */
    public static final String ROOT_ADCODE = "100000";

    private static final String DATAV_BOUND =
            "https://geo.datav.aliyun.com/areas_v3/bound/%s_full.json";
    private static final String DATAV_BOUND_PLAIN =
            "https://geo.datav.aliyun.com/areas_v3/bound/%s.json";
    private static final long REQUEST_GAP_MS = 80L;

    private final RegionRepository regionRepository;
    private final ObjectMapper objectMapper;
    private final AtomicBoolean importing = new AtomicBoolean(false);

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    public List<RegionResp> listByParent(String parentAdcode) {
        String parent = (parentAdcode == null || parentAdcode.isBlank())
                ? ROOT_ADCODE : parentAdcode.trim();
        return regionRepository.findByParentAdcodeOrderByAdcodeAsc(parent).stream()
                .map(this::toResp)
                .toList();
    }

    public RegionImportResult stats() {
        RegionImportResult r = new RegionImportResult();
        r.setProvinceCount((int) regionRepository.countByLevel(1));
        r.setCityCount((int) regionRepository.countByLevel(2));
        r.setDistrictCount((int) regionRepository.countByLevel(3));
        r.setTotal((int) regionRepository.count());
        r.setSource("admin_region");
        return r;
    }

    /**
     * 全量导入：从 DataV 递归拉取省→市→区县并 upsert。
     * 耗时约 1～3 分钟，需外网访问 geo.datav.aliyun.com。
     */
    public RegionImportResult importFromDataV() {
        if (!importing.compareAndSet(false, true)) {
            throw new BizException("行政区划正在导入中，请稍后再试");
        }
        long start = System.currentTimeMillis();
        log.info("开始导入全国行政区划（DataV GeoAtlas）");
        try {
            List<RegionEntity> provinces = fetchChildren(ROOT_ADCODE);
            int saved = 0;
            for (RegionEntity province : provinces) {
                regionRepository.save(province);
                saved++;
                if (province.getChildrenNum() != null && province.getChildrenNum() > 0) {
                    saved += importSubtree(province.getAdcode());
                }
            }
            RegionImportResult result = stats();
            result.setElapsedMs(System.currentTimeMillis() - start);
            result.setSource("datav.aliyun.com/areas_v3");
            log.info("行政区划导入完成: total={}, province={}, city={}, district={}, elapsedMs={}, savedApprox={}",
                    result.getTotal(), result.getProvinceCount(), result.getCityCount(),
                    result.getDistrictCount(), result.getElapsedMs(), saved);
            return result;
        } catch (BizException e) {
            throw e;
        } catch (Exception e) {
            log.error("行政区划导入失败: {}", e.getMessage(), e);
            throw new BizException("行政区划导入失败: " + e.getMessage());
        } finally {
            importing.set(false);
        }
    }

    /** 导入某上级下的全部下级（市或区县），有孙级则继续递归 */
    private int importSubtree(String parentAdcode) throws Exception {
        List<RegionEntity> children = fetchChildren(parentAdcode);
        int count = 0;
        for (RegionEntity child : children) {
            regionRepository.save(child);
            count++;
            // 区县不再往下拉；无下级也不拉
            if (child.getLevel() != null && child.getLevel() >= 3) {
                continue;
            }
            if (child.getChildrenNum() != null && child.getChildrenNum() > 0) {
                count += importSubtree(child.getAdcode());
            }
        }
        return count;
    }

    private List<RegionEntity> fetchChildren(String parentAdcode) throws Exception {
        JsonNode root = fetchGeoJson(parentAdcode);
        List<RegionEntity> list = new ArrayList<>();
        if (root == null) {
            return list;
        }
        JsonNode features = root.path("features");
        if (!features.isArray()) {
            log.warn("DataV 无 features: adcode={}", parentAdcode);
            return list;
        }
        LocalDateTime now = LocalDateTime.now();
        for (JsonNode feature : features) {
            JsonNode props = feature.path("properties");
            if (props.isMissingNode()) {
                continue;
            }
            RegionEntity entity = parseFeature(props, parentAdcode, now);
            if (entity != null) {
                list.add(entity);
            }
        }
        log.info("DataV 拉取下级: parent={}, count={}", parentAdcode, list.size());
        return list;
    }

    private RegionEntity parseFeature(JsonNode props, String fallbackParent, LocalDateTime now) {
        String adcode = textOrNumber(props.get("adcode"));
        String name = props.path("name").asText(null);
        if (adcode == null || adcode.isBlank() || name == null || name.isBlank()) {
            return null;
        }
        String levelName = props.path("level").asText("");
        int level = mapLevel(levelName, adcode);
        String parent = fallbackParent;
        JsonNode parentNode = props.path("parent");
        if (parentNode.isObject()) {
            String p = textOrNumber(parentNode.get("adcode"));
            if (p != null && !p.isBlank()) {
                parent = p;
            }
        }
        RegionEntity entity = new RegionEntity();
        entity.setAdcode(adcode);
        entity.setName(name.trim());
        entity.setLevel(level);
        entity.setLevelName(levelName.isBlank() ? null : levelName);
        entity.setParentAdcode(parent);
        entity.setChildrenNum(props.has("childrenNum") ? props.get("childrenNum").asInt(0) : 0);
        JsonNode center = props.path("center");
        if (center.isArray() && center.size() >= 2) {
            entity.setCenterLng(center.get(0).asDouble());
            entity.setCenterLat(center.get(1).asDouble());
        }
        entity.setUpdatedAt(now);
        return entity;
    }

    private JsonNode fetchGeoJson(String adcode) throws Exception {
        sleepGap();
        String fullUrl = String.format(DATAV_BOUND, adcode);
        HttpResponse<String> response = get(fullUrl);
        if (response.statusCode() == 404) {
            sleepGap();
            String plainUrl = String.format(DATAV_BOUND_PLAIN, adcode);
            response = get(plainUrl);
        }
        if (response.statusCode() < 200 || response.statusCode() >= 300) {
            log.warn("DataV HTTP 异常: adcode={}, status={}", adcode, response.statusCode());
            return null;
        }
        return objectMapper.readTree(response.body());
    }

    private HttpResponse<String> get(String url) throws Exception {
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .timeout(Duration.ofSeconds(30))
                .header("User-Agent", "hycBoxServer/region-import")
                .GET()
                .build();
        return httpClient.send(request, HttpResponse.BodyHandlers.ofString());
    }

    private static void sleepGap() {
        try {
            Thread.sleep(REQUEST_GAP_MS);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }

    static int mapLevel(String levelName, String adcode) {
        if ("province".equalsIgnoreCase(levelName)) {
            return 1;
        }
        if ("city".equalsIgnoreCase(levelName)) {
            return 2;
        }
        if ("district".equalsIgnoreCase(levelName)) {
            return 3;
        }
        if (adcode != null && adcode.length() >= 6) {
            if (adcode.endsWith("0000")) {
                return 1;
            }
            if (adcode.endsWith("00")) {
                return 2;
            }
        }
        return 3;
    }

    private static String textOrNumber(JsonNode node) {
        if (node == null || node.isNull() || node.isMissingNode()) {
            return null;
        }
        if (node.isNumber()) {
            return String.valueOf(node.asLong());
        }
        String t = node.asText();
        return t == null || t.isBlank() ? null : t.trim();
    }

    private RegionResp toResp(RegionEntity e) {
        RegionResp r = new RegionResp();
        r.setAdcode(e.getAdcode());
        r.setName(e.getName());
        r.setLevel(e.getLevel());
        r.setLevelName(e.getLevelName());
        r.setParentAdcode(e.getParentAdcode());
        r.setChildrenNum(e.getChildrenNum());
        r.setCenterLng(e.getCenterLng());
        r.setCenterLat(e.getCenterLat());
        r.setUpdatedAt(e.getUpdatedAt());
        return r;
    }
}
