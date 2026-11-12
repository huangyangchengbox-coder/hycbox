package com.hycbox.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hycbox.dto.resp.RoomResp;
import com.hycbox.exception.BizException;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * 小区楼栋数据：支持多小区扩展。当前内置宜昌·恒大名都。
 */
@Slf4j
@Service
public class CommunityService {

    private static final List<Integer> DEFAULT_SKIP_FLOORS = List.of(4, 13, 14, 24);
    public static final String DEFAULT_COMMUNITY_ID = "hengda_mingdu";

    private final ObjectMapper objectMapper;
    private JsonNode rootData;
    private String defaultCommunityId = DEFAULT_COMMUNITY_ID;
    private List<RoomResp> roomCache;

    public CommunityService(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @PostConstruct
    public void init() {
        try {
            ClassPathResource resource = new ClassPathResource("buildings.json");
            rootData = objectMapper.readTree(resource.getInputStream());
            // 兼容旧单小区结构 → 统一为 communities[]
            if (!rootData.has("communities")) {
                rootData = wrapLegacyCommunity(rootData);
                log.info("楼栋数据已从旧结构兼容为多小区结构");
            }
            if (rootData.has("defaultCommunityId")) {
                defaultCommunityId = rootData.get("defaultCommunityId").asText(DEFAULT_COMMUNITY_ID);
            }
            if (!rootData.has("communities") || !rootData.get("communities").isArray()
                    || rootData.get("communities").isEmpty()) {
                throw new BizException("楼栋数据缺少 communities");
            }
            roomCache = buildAllRooms();
            log.info("楼栋数据加载完成，小区数={}, 门牌数={}", rootData.get("communities").size(), roomCache.size());
        } catch (BizException e) {
            throw e;
        } catch (Exception e) {
            log.error("楼栋数据加载失败", e);
            throw new BizException("楼栋数据加载失败");
        }
    }

    /** 旧结构 { communityName, phases } 包装为多小区 */
    private JsonNode wrapLegacyCommunity(JsonNode legacy) throws Exception {
        com.fasterxml.jackson.databind.node.ObjectNode root = objectMapper.createObjectNode();
        root.put("defaultCommunityId", DEFAULT_COMMUNITY_ID);
        com.fasterxml.jackson.databind.node.ArrayNode communities = objectMapper.createArrayNode();
        com.fasterxml.jackson.databind.node.ObjectNode community = objectMapper.createObjectNode();
        community.put("id", DEFAULT_COMMUNITY_ID);
        community.put("name", legacy.has("communityName")
                ? legacy.get("communityName").asText("宜昌·恒大名都")
                : "宜昌·恒大名都");
        community.put("address", legacy.has("address") ? legacy.get("address").asText("") : "");
        if (legacy.has("phases")) {
            community.set("phases", legacy.get("phases"));
        } else {
            community.set("phases", objectMapper.createArrayNode());
        }
        communities.add(community);
        root.set("communities", communities);
        return root;
    }

    public String getDefaultCommunityId() {
        return defaultCommunityId;
    }

    /** 小区列表（供选择，不含完整楼栋明细） */
    public List<Map<String, Object>> listCommunities() {
        List<Map<String, Object>> list = new ArrayList<>();
        for (JsonNode c : rootData.get("communities")) {
            Map<String, Object> item = new HashMap<>();
            item.put("id", c.get("id").asText());
            item.put("name", c.get("name").asText());
            item.put("address", c.has("address") ? c.get("address").asText() : "");
            JsonNode phases = c.get("phases");
            boolean hasPhases = phases != null && phases.isArray() && phases.size() > 0;
            item.put("hasPhases", hasPhases);
            List<Map<String, Object>> phaseBrief = new ArrayList<>();
            if (hasPhases) {
                for (JsonNode p : phases) {
                    Map<String, Object> pb = new HashMap<>();
                    pb.put("id", p.get("id").asText());
                    pb.put("name", p.get("name").asText());
                    phaseBrief.add(pb);
                }
            }
            item.put("phases", phaseBrief);
            list.add(item);
        }
        return list;
    }

    public Map<String, Object> getCommunityInfo(String communityId) {
        JsonNode c = requireCommunity(communityId);
        Map<String, Object> info = new HashMap<>();
        info.put("id", c.get("id").asText());
        info.put("communityName", c.get("name").asText());
        info.put("name", c.get("name").asText());
        info.put("address", c.has("address") ? c.get("address").asText() : "");
        JsonNode phases = c.get("phases");
        int phaseCount = phases == null ? 0 : phases.size();
        info.put("phaseCount", phaseCount);
        info.put("hasPhases", phaseCount > 0);
        int buildingCount = 0;
        if (phases != null) {
            for (JsonNode phase : phases) {
                buildingCount += phase.get("buildings").size();
            }
        }
        info.put("buildingCount", buildingCount);
        return info;
    }

    /** 兼容旧接口：默认小区信息 */
    public Map<String, Object> getCommunityInfo() {
        return getCommunityInfo(defaultCommunityId);
    }

    public List<Map<String, Object>> getPhases(String communityId) {
        JsonNode c = requireCommunity(communityId);
        List<Map<String, Object>> phases = new ArrayList<>();
        JsonNode phaseNodes = c.get("phases");
        if (phaseNodes == null || !phaseNodes.isArray() || phaseNodes.isEmpty()) {
            return phases;
        }
        for (JsonNode phase : phaseNodes) {
            Map<String, Object> phaseMap = new HashMap<>();
            phaseMap.put("id", phase.get("id").asText());
            phaseMap.put("name", phase.get("name").asText());
            List<Map<String, Object>> buildings = new ArrayList<>();
            for (JsonNode building : phase.get("buildings")) {
                Map<String, Object> buildingMap = new HashMap<>();
                buildingMap.put("id", building.get("id").asText());
                buildingMap.put("name", building.get("name").asText());
                buildingMap.put("units", building.get("units").asInt());
                buildingMap.put("maxFloor", building.get("maxFloor").asInt());
                buildingMap.put("roomsPerFloor", building.get("roomsPerFloor").asInt());
                buildings.add(buildingMap);
            }
            phaseMap.put("buildings", buildings);
            phases.add(phaseMap);
        }
        return phases;
    }

    /** 兼容旧接口 */
    public List<Map<String, Object>> getPhases() {
        return getPhases(defaultCommunityId);
    }

    public List<RoomResp> getRoomsByBuilding(String communityId, String phaseId, String buildingId, Integer unit) {
        String cid = StringUtils.hasText(communityId) ? communityId : defaultCommunityId;
        return roomCache.stream()
                .filter(room -> cid.equals(room.getCommunityId()))
                .filter(room -> room.getPhaseId().equals(phaseId))
                .filter(room -> room.getBuildingId().equals(buildingId))
                .filter(room -> unit == null || room.getUnit().equals(unit))
                .collect(Collectors.toList());
    }

    public List<RoomResp> getRoomsByBuilding(String phaseId, String buildingId, Integer unit) {
        return getRoomsByBuilding(defaultCommunityId, phaseId, buildingId, unit);
    }

    public RoomResp getRoomById(String roomId) {
        return roomCache.stream()
                .filter(room -> room.getId().equals(roomId))
                .findFirst()
                .orElse(null);
    }

    public List<RoomResp> searchRooms(String keyword, int limit) {
        return searchRooms(defaultCommunityId, keyword, limit);
    }

    public List<RoomResp> searchRooms(String communityId, String keyword, int limit) {
        String cid = StringUtils.hasText(communityId) ? communityId : defaultCommunityId;
        String key = keyword == null ? "" : keyword.trim().toLowerCase(Locale.ROOT);
        if (key.isEmpty()) {
            return List.of();
        }
        return roomCache.stream()
                .filter(room -> cid.equals(room.getCommunityId()))
                .filter(room -> room.getLabel().toLowerCase(Locale.ROOT).contains(key)
                        || room.getRoomNo().contains(key)
                        || room.getBuildingName().contains(keyword.trim()))
                .limit(limit)
                .collect(Collectors.toList());
    }

    public Map<String, String> resolveCommunity(String communityId) {
        JsonNode c = requireCommunity(communityId);
        Map<String, String> map = new HashMap<>();
        map.put("id", c.get("id").asText());
        map.put("name", c.get("name").asText());
        return map;
    }

    public Map<String, String> resolvePhase(String communityId, String phaseId) {
        if (!StringUtils.hasText(phaseId)) {
            return Map.of();
        }
        JsonNode c = requireCommunity(communityId);
        JsonNode phases = c.get("phases");
        if (phases == null) {
            throw new BizException("该小区无期数");
        }
        for (JsonNode p : phases) {
            if (phaseId.equals(p.get("id").asText())) {
                Map<String, String> map = new HashMap<>();
                map.put("id", p.get("id").asText());
                map.put("name", p.get("name").asText());
                return map;
            }
        }
        throw new BizException("期数不存在");
    }

    private JsonNode requireCommunity(String communityId) {
        String id = StringUtils.hasText(communityId) ? communityId : defaultCommunityId;
        for (JsonNode c : rootData.get("communities")) {
            if (id.equals(c.get("id").asText())) {
                return c;
            }
        }
        throw new BizException("小区不存在");
    }

    private List<RoomResp> buildAllRooms() {
        List<RoomResp> rooms = new ArrayList<>();
        for (JsonNode community : rootData.get("communities")) {
            String communityId = community.get("id").asText();
            String communityName = community.get("name").asText();
            JsonNode phases = community.get("phases");
            if (phases == null || !phases.isArray() || phases.isEmpty()) {
                continue;
            }
            boolean isDefault = defaultCommunityId.equals(communityId);
            for (JsonNode phase : phases) {
                String phaseId = phase.get("id").asText();
                String phaseName = phase.get("name").asText();
                for (JsonNode building : phase.get("buildings")) {
                    String buildingId = building.get("id").asText();
                    String buildingName = building.get("name").asText();
                    int units = building.get("units").asInt();
                    int maxFloor = building.get("maxFloor").asInt();
                    int roomsPerFloor = building.get("roomsPerFloor").asInt();
                    for (int unit = 1; unit <= units; unit++) {
                        for (int floor = 1; floor <= maxFloor; floor++) {
                            if (DEFAULT_SKIP_FLOORS.contains(floor)) {
                                continue;
                            }
                            for (int roomIndex = 1; roomIndex <= roomsPerFloor; roomIndex++) {
                                String roomNo = String.format("%d%02d", floor, roomIndex);
                                // 默认小区保持旧 roomId，兼容演示订单
                                String roomId = isDefault
                                        ? (phaseId + "_" + buildingId + "_" + unit + "_" + roomNo)
                                        : (communityId + "_" + phaseId + "_" + buildingId + "_" + unit + "_" + roomNo);
                                RoomResp room = new RoomResp();
                                room.setId(roomId);
                                room.setCommunityId(communityId);
                                room.setCommunityName(communityName);
                                room.setPhaseId(phaseId);
                                room.setPhaseName(phaseName);
                                room.setBuildingId(buildingId);
                                room.setBuildingName(buildingName);
                                room.setUnit(unit);
                                room.setRoomNo(roomNo);
                                room.setLabel(communityName + " " + phaseName + buildingName + " " + unit + "单元 " + roomNo);
                                rooms.add(room);
                            }
                        }
                    }
                }
            }
        }
        rooms.sort(Comparator.comparing(RoomResp::getLabel));
        return rooms;
    }
}
