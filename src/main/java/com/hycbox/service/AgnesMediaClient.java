package com.hycbox.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.hycbox.config.HycBoxProperties;
import com.hycbox.exception.BizException;
import com.hycbox.storage.FileStorage;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.io.ByteArrayInputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Base64;
import java.util.Locale;
import java.util.UUID;

/**
 * Agnes AI 图片/视频生成 HTTP 客户端（OpenAI 兼容），可复用于其他模块。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AgnesMediaClient {

    private static final int RAW_MAX = 4000;

    private final HycBoxProperties properties;
    private final ObjectMapper objectMapper;
    private final FileStorage fileStorage;
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(15))
            .build();

    public boolean isConfigured() {
        return StringUtils.hasText(properties.getAi().getApiKey());
    }

    /** 同步生成图片 */
    public AgnesMediaResult generateImage(String model, String prompt, Integer n, String size) {
        ensureConfigured();
        int count = n != null && n > 0 ? n : 1;
        String imageSize = StringUtils.hasText(size) ? size.trim() : "1024x1024";
        try {
            ObjectNode body = objectMapper.createObjectNode();
            body.put("model", model);
            body.put("prompt", prompt);
            body.put("n", count);
            body.put("size", imageSize);
            String json = objectMapper.writeValueAsString(body);
            log.info("AI 图片请求: model={}, size={}, n={}, promptLen={}", model, imageSize, count, prompt.length());
            HttpResponse<String> response = post("/images/generations", json, 120);
            String raw = response.body();
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                log.warn("AI 图片生成失败: status={}, body={}", response.statusCode(), abbreviate(raw));
                throw new BizException(mapHttpError(response.statusCode(), raw));
            }
            JsonNode root = objectMapper.readTree(raw);
            JsonNode first = root.path("data").path(0);
            String url = first.path("url").asText(null);
            String b64 = first.path("b64_json").asText(null);
            AgnesMediaResult result = new AgnesMediaResult();
            result.setRawResponse(raw);
            result.setStatus("succeeded");
            if (StringUtils.hasText(url)) {
                result.setRemoteUrl(url.trim());
            } else if (StringUtils.hasText(b64)) {
                result.setRemoteUrl("data:image/png;base64," + b64.trim());
            } else {
                throw new BizException("图片生成结果为空");
            }
            log.info("AI 图片生成成功: model={}, size={}, n={}", model, imageSize, count);
            return result;
        } catch (BizException e) {
            throw e;
        } catch (Exception e) {
            log.warn("AI 图片生成异常: {}", e.getMessage());
            throw new BizException("图片生成失败，请稍后再试");
        }
    }

    /** 提交视频生成任务 */
    public AgnesMediaResult createVideo(String model, String prompt, String seconds, String size) {
        ensureConfigured();
        try {
            ObjectNode body = objectMapper.createObjectNode();
            body.put("model", model);
            body.put("prompt", prompt);
            if (StringUtils.hasText(seconds)) {
                body.put("seconds", seconds.trim());
            }
            if (StringUtils.hasText(size)) {
                body.put("size", size.trim());
            }
            String json = objectMapper.writeValueAsString(body);
            log.info("AI 视频请求: model={}, seconds={}, size={}, promptLen={}",
                    model, seconds, size, prompt.length());
            HttpResponse<String> response = post("/videos", json, 120);
            String raw = response.body();
            if (response.statusCode() == 503) {
                log.warn("AI 视频队列已满: body={}", abbreviate(raw));
                throw new BizException("视频生成队列已满，请稍后再试");
            }
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                log.warn("AI 视频提交失败: status={}, body={}", response.statusCode(), abbreviate(raw));
                throw new BizException(mapHttpError(response.statusCode(), raw));
            }
            AgnesMediaResult result = parseVideoResponse(raw);
            log.info("AI 视频已提交: model={}, jobId={}, status={}", model, result.getRemoteJobId(), result.getStatus());
            return result;
        } catch (BizException e) {
            throw e;
        } catch (Exception e) {
            log.warn("AI 视频提交异常: {}", e.getMessage());
            throw new BizException("视频生成失败，请稍后再试");
        }
    }

    /** 轮询视频任务状态 */
    public AgnesMediaResult pollVideo(String remoteJobId) {
        ensureConfigured();
        if (!StringUtils.hasText(remoteJobId)) {
            throw new BizException("视频任务 ID 无效");
        }
        try {
            HttpResponse<String> response = get("/videos/" + remoteJobId.trim(), 30);
            String raw = response.body();
            if (response.statusCode() == 503) {
                throw new BizException("视频生成队列已满，请稍后再试");
            }
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                log.warn("AI 视频轮询失败: jobId={}, status={}, body={}", remoteJobId, response.statusCode(), abbreviate(raw));
                throw new BizException("视频状态查询失败，请稍后再试");
            }
            return parseVideoResponse(raw);
        } catch (BizException e) {
            throw e;
        } catch (Exception e) {
            log.warn("AI 视频轮询异常: jobId={}, err={}", remoteJobId, e.getMessage());
            throw new BizException("视频状态查询失败，请稍后再试");
        }
    }

    /** 下载远程媒体并保存到 FileStorage，返回公网 URL */
    public String persistMedia(String source, String defaultExt) {
        if (!StringUtils.hasText(source)) {
            return null;
        }
        String src = source.trim();
        try {
            byte[] bytes;
            String ext = defaultExt;
            if (src.startsWith("data:")) {
                int comma = src.indexOf(',');
                if (comma < 0) {
                    return null;
                }
                bytes = Base64.getDecoder().decode(src.substring(comma + 1));
                if (src.contains("image/png")) {
                    ext = ".png";
                } else if (src.contains("image/webp")) {
                    ext = ".webp";
                } else if (src.contains("video/mp4")) {
                    ext = ".mp4";
                }
            } else {
                HttpRequest request = HttpRequest.newBuilder()
                        .uri(URI.create(src))
                        .timeout(Duration.ofSeconds(60))
                        .GET()
                        .build();
                HttpResponse<byte[]> response = httpClient.send(request, HttpResponse.BodyHandlers.ofByteArray());
                if (response.statusCode() < 200 || response.statusCode() >= 300) {
                    log.warn("媒体下载失败: url={}, status={}", src, response.statusCode());
                    return null;
                }
                bytes = response.body();
                ext = guessExt(src, response.headers().firstValue("Content-Type").orElse(""), defaultExt);
            }
            if (bytes == null || bytes.length == 0) {
                return null;
            }
            String filename = UUID.randomUUID().toString().replace("-", "") + ext;
            String url = fileStorage.store(filename, new ByteArrayInputStream(bytes), bytes.length, null);
            log.info("AI 媒体已落库: ext={}, size={}, url={}", ext, bytes.length, url);
            return url;
        } catch (Exception e) {
            log.warn("AI 媒体落库失败: source={}, err={}", abbreviate(src), e.getMessage());
            return null;
        }
    }

    private AgnesMediaResult parseVideoResponse(String raw) throws Exception {
        JsonNode root = objectMapper.readTree(raw);
        AgnesMediaResult result = new AgnesMediaResult();
        result.setRawResponse(raw);
        result.setRemoteJobId(pickText(root.path("id"), root.path("data").path("id")));
        String status = pickText(root.path("status"), root.path("data").path("status"));
        result.setStatus(normalizeStatus(status));
        String url = pickText(root.path("url"), root.path("video_url"),
                root.path("data").path("url"), root.path("output").path("url"));
        if (StringUtils.hasText(url)) {
            result.setRemoteUrl(url.trim());
            if ("succeeded".equals(result.getStatus()) || "completed".equalsIgnoreCase(status)) {
                result.setStatus("succeeded");
            }
        }
        if (!StringUtils.hasText(result.getStatus())) {
            result.setStatus(StringUtils.hasText(url) ? "succeeded" : "running");
        }
        return result;
    }

    private HttpResponse<String> post(String path, String json, int timeoutSec) throws Exception {
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(baseUrl() + path))
                .timeout(Duration.ofSeconds(timeoutSec))
                .header("Authorization", "Bearer " + properties.getAi().getApiKey().trim())
                .header("Content-Type", "application/json; charset=utf-8")
                .POST(HttpRequest.BodyPublishers.ofString(json, StandardCharsets.UTF_8))
                .build();
        return httpClient.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
    }

    private HttpResponse<String> get(String path, int timeoutSec) throws Exception {
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(baseUrl() + path))
                .timeout(Duration.ofSeconds(timeoutSec))
                .header("Authorization", "Bearer " + properties.getAi().getApiKey().trim())
                .GET()
                .build();
        return httpClient.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
    }

    private void ensureConfigured() {
        if (!isConfigured()) {
            throw new BizException("AI 服务暂未开通，请稍后再试");
        }
    }

    private String baseUrl() {
        String base = properties.getAi().getBaseUrl();
        if (!StringUtils.hasText(base)) {
            base = "https://apihub.agnes-ai.com/v1";
        }
        base = base.trim();
        while (base.endsWith("/")) {
            base = base.substring(0, base.length() - 1);
        }
        return base;
    }

    private static String normalizeStatus(String status) {
        if (!StringUtils.hasText(status)) {
            return "running";
        }
        String s = status.trim().toLowerCase(Locale.ROOT);
        if (s.contains("success") || s.contains("complete") || "succeeded".equals(s)) {
            return "succeeded";
        }
        if (s.contains("fail") || s.contains("error")) {
            return "failed";
        }
        if (s.contains("pending") || s.contains("queue") || s.contains("process") || s.contains("running")) {
            return "running";
        }
        return s;
    }

    private static String pickText(JsonNode... nodes) {
        for (JsonNode node : nodes) {
            if (node != null && node.isTextual() && StringUtils.hasText(node.asText())) {
                return node.asText();
            }
        }
        return null;
    }

    private static String mapHttpError(int status, String body) {
        if (status == 503) {
            return "AI 服务繁忙，请稍后再试";
        }
        if (StringUtils.hasText(body) && body.contains("queue")) {
            return "视频生成队列已满，请稍后再试";
        }
        return "AI 生成失败，请稍后再试";
    }

    private static String guessExt(String url, String contentType, String defaultExt) {
        String ct = contentType == null ? "" : contentType.toLowerCase(Locale.ROOT);
        if (ct.contains("png")) {
            return ".png";
        }
        if (ct.contains("webp")) {
            return ".webp";
        }
        if (ct.contains("gif")) {
            return ".gif";
        }
        if (ct.contains("mp4") || ct.contains("video")) {
            return ".mp4";
        }
        String lower = url.toLowerCase(Locale.ROOT);
        if (lower.contains(".png")) {
            return ".png";
        }
        if (lower.contains(".webp")) {
            return ".webp";
        }
        if (lower.contains(".mp4")) {
            return ".mp4";
        }
        return defaultExt;
    }

    public static String truncateRaw(String raw) {
        if (raw == null) {
            return null;
        }
        return raw.length() <= RAW_MAX ? raw : raw.substring(0, RAW_MAX) + "...";
    }

    private static String abbreviate(String s) {
        if (s == null) {
            return "";
        }
        return s.length() <= 300 ? s : s.substring(0, 300) + "...";
    }

    @Data
    public static class AgnesMediaResult {
        private String remoteJobId;
        /** pending | running | succeeded | failed */
        private String status;
        private String remoteUrl;
        private String rawResponse;
        private String errorMsg;
    }
}
