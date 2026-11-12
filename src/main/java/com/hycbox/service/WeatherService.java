package com.hycbox.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hycbox.dto.resp.WeatherResp;
import com.hycbox.exception.BizException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 天气查询：服务端代理 Open-Meteo（免 Key），小程序请求本域 /weather。
 * 用于首页展示，支撑「工具-天气」类目下 getLocation 场景。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class WeatherService {

    private static final String FORECAST_URL =
            "https://api.open-meteo.com/v1/forecast?latitude=%s&longitude=%s"
                    + "&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m"
                    + "&timezone=Asia%%2FShanghai";

    /** 缓存约 10 分钟，降低外呼频率（按 0.1° 网格） */
    private static final long CACHE_TTL_MS = 10 * 60 * 1000L;

    private final ObjectMapper objectMapper;
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(6))
            .build();

    private final Map<String, CacheEntry> cache = new ConcurrentHashMap<>();

    public WeatherResp query(Double latitude, Double longitude) {
        if (latitude == null || longitude == null
                || latitude < -90 || latitude > 90
                || longitude < -180 || longitude > 180) {
            throw new BizException("位置坐标无效");
        }
        String key = cacheKey(latitude, longitude);
        CacheEntry hit = cache.get(key);
        if (hit != null && System.currentTimeMillis() - hit.atMs < CACHE_TTL_MS) {
            return hit.resp;
        }

        try {
            String url = String.format(FORECAST_URL, trimCoord(latitude), trimCoord(longitude));
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .timeout(Duration.ofSeconds(8))
                    .GET()
                    .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                log.warn("天气接口 HTTP 异常: status={}, body={}", response.statusCode(),
                        abbreviate(response.body()));
                throw new BizException("天气服务暂时不可用");
            }
            JsonNode root = objectMapper.readTree(response.body());
            JsonNode current = root.path("current");
            if (current.isMissingNode() || current.isNull()) {
                throw new BizException("天气数据为空");
            }
            WeatherResp resp = new WeatherResp();
            resp.setPlaceLabel("当前位置");
            resp.setLatitude(latitude);
            resp.setLongitude(longitude);
            if (current.hasNonNull("temperature_2m")) {
                resp.setTemperature(current.get("temperature_2m").asDouble());
            }
            if (current.hasNonNull("relative_humidity_2m")) {
                resp.setHumidity(current.get("relative_humidity_2m").asInt());
            }
            if (current.hasNonNull("wind_speed_10m")) {
                resp.setWindSpeed(current.get("wind_speed_10m").asDouble());
            }
            int code = current.hasNonNull("weather_code") ? current.get("weather_code").asInt() : -1;
            resp.setWeatherCode(code >= 0 ? code : null);
            resp.setWeatherText(describeWeather(code));
            cache.put(key, new CacheEntry(resp, System.currentTimeMillis()));
            log.info("天气查询成功: lat={}, lng={}, text={}, temp={}",
                    latitude, longitude, resp.getWeatherText(), resp.getTemperature());
            return resp;
        } catch (BizException e) {
            throw e;
        } catch (Exception e) {
            log.warn("天气查询失败: lat={}, lng={}, err={}", latitude, longitude, e.getMessage());
            throw new BizException("天气获取失败，请稍后重试");
        }
    }

    /** WMO Weather interpretation codes → 中文简述 */
    static String describeWeather(int code) {
        if (code == 0) return "晴";
        if (code == 1) return "大部晴朗";
        if (code == 2) return "局部多云";
        if (code == 3) return "阴";
        if (code == 45 || code == 48) return "雾";
        if (code == 51 || code == 53 || code == 55) return "毛毛雨";
        if (code == 56 || code == 57) return "冻毛毛雨";
        if (code == 61 || code == 63 || code == 65) return "雨";
        if (code == 66 || code == 67) return "冻雨";
        if (code == 71 || code == 73 || code == 75) return "雪";
        if (code == 77) return "雪粒";
        if (code == 80 || code == 81 || code == 82) return "阵雨";
        if (code == 85 || code == 86) return "阵雪";
        if (code == 95) return "雷雨";
        if (code == 96 || code == 99) return "雷阵雨伴冰雹";
        return "天气未知";
    }

    private static String cacheKey(double lat, double lng) {
        return Math.round(lat * 10) + ":" + Math.round(lng * 10);
    }

    private static String trimCoord(double v) {
        return String.format(java.util.Locale.US, "%.4f", v);
    }

    private static String abbreviate(String s) {
        if (s == null) return "";
        return s.length() > 200 ? s.substring(0, 200) : s;
    }

    private record CacheEntry(WeatherResp resp, long atMs) {
    }
}
