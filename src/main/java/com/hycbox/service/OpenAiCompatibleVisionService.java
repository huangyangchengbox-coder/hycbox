package com.hycbox.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.hycbox.config.HycBoxProperties;
import com.hycbox.exception.BizException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Base64;
import java.util.List;
import java.util.Locale;

/**
 * OpenAI 兼容视觉接口（默认 Agnes AI）：服务端先拉图转 base64，再发给模型，
 * 避免第三方网关访问用户图片域名超时。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class OpenAiCompatibleVisionService {

    private static final int MAX_IMAGES = 3;
    private static final int MAX_BYTES = 4 * 1024 * 1024;

    private final HycBoxProperties properties;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(15))
            .build();

    public boolean isConfigured() {
        return StringUtils.hasText(properties.getAi().getApiKey());
    }

    /**
     * @param title  发布标题，辅助模型理解
     * @param images 图片 URL（本服务可访问即可）
     */
    public String describeItem(String title, List<String> images) {
        if (!isConfigured()) {
            throw new BizException("物品详情服务暂未开通，请稍后再试");
        }
        if (images == null || images.isEmpty()) {
            throw new BizException("该发布暂无图片，无法生成详情");
        }
        try {
            String base = trimSlash(properties.getAi().getBaseUrl());
            String model = StringUtils.hasText(properties.getAi().getModel())
                    ? properties.getAi().getModel().trim()
                    : "agnes-2.0-flash";
            ObjectNode body = objectMapper.createObjectNode();
            body.put("model", model);
            ArrayNode messages = body.putArray("messages");
            ObjectNode user = messages.addObject();
            user.put("role", "user");
            ArrayNode content = user.putArray("content");
            ObjectNode textPart = content.addObject();
            textPart.put("type", "text");
            textPart.put("text", buildPrompt(title));
            int used = 0;
            for (String url : images) {
                if (!StringUtils.hasText(url) || used >= MAX_IMAGES) {
                    continue;
                }
                String dataUrl = toDataUrl(url.trim());
                if (dataUrl == null) {
                    log.warn("图片拉取失败，跳过: {}", url);
                    continue;
                }
                ObjectNode imgPart = content.addObject();
                imgPart.put("type", "image_url");
                ObjectNode imageUrl = imgPart.putObject("image_url");
                imageUrl.put("url", dataUrl);
                used++;
            }
            if (used == 0) {
                throw new BizException("图片无法读取，请稍后重试");
            }

            String json = objectMapper.writeValueAsString(body);
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(base + "/chat/completions"))
                    .timeout(Duration.ofSeconds(120))
                    .header("Authorization", "Bearer " + properties.getAi().getApiKey().trim())
                    .header("Content-Type", "application/json; charset=utf-8")
                    .POST(HttpRequest.BodyPublishers.ofString(json, StandardCharsets.UTF_8))
                    .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                log.warn("AI 视觉接口失败: status={}, body={}", response.statusCode(), abbreviate(response.body()));
                throw new BizException("物品详情生成失败，请稍后再试");
            }
            JsonNode root = objectMapper.readTree(response.body());
            String text = root.path("choices").path(0).path("message").path("content").asText(null);
            if (!StringUtils.hasText(text)) {
                throw new BizException("物品详情生成结果为空");
            }
            log.info("AI 物品详情生成成功: title={}, images={}, chars={}", title, used, text.length());
            return text.trim();
        } catch (BizException e) {
            throw e;
        } catch (Exception e) {
            log.warn("AI 物品详情异常: {}", e.getMessage());
            throw new BizException("物品详情生成失败，请稍后再试");
        }
    }

    /** 本机下载图片并转为 data URL，供 Agnes 等网关直接识别 */
    private String toDataUrl(String url) {
        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .timeout(Duration.ofSeconds(20))
                    .GET()
                    .build();
            HttpResponse<byte[]> response = httpClient.send(request, HttpResponse.BodyHandlers.ofByteArray());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                return null;
            }
            byte[] bytes = response.body();
            if (bytes == null || bytes.length == 0 || bytes.length > MAX_BYTES) {
                log.warn("图片过大或为空: url={}, size={}", url, bytes == null ? 0 : bytes.length);
                return null;
            }
            String mime = detectMime(response.headers().firstValue("Content-Type").orElse(""), url);
            return "data:" + mime + ";base64," + Base64.getEncoder().encodeToString(bytes);
        } catch (Exception e) {
            log.warn("下载图片失败: url={}, err={}", url, e.getMessage());
            return null;
        }
    }

    private static String detectMime(String contentType, String url) {
        String ct = contentType == null ? "" : contentType.toLowerCase(Locale.ROOT);
        if (ct.contains("png")) {
            return "image/png";
        }
        if (ct.contains("webp")) {
            return "image/webp";
        }
        if (ct.contains("gif")) {
            return "image/gif";
        }
        String lower = url.toLowerCase(Locale.ROOT);
        if (lower.contains(".png")) {
            return "image/png";
        }
        if (lower.contains(".webp")) {
            return "image/webp";
        }
        return "image/jpeg";
    }

    private static String buildPrompt(String title) {
        String name = StringUtils.hasText(title) ? title.trim() : "物品";
        return "你是社区水果/生鲜导购助手。请根据图片介绍「" + name + "」。"
                + "用简体中文，分短段落说明：品类外观、口感特点、食用或保存建议、适合谁买。"
                + "不要编造具体产地认证或营养数值；不确定就写「以实物为准」。"
                + "控制在 300 字以内，语气亲切简洁。";
    }

    private static String trimSlash(String baseUrl) {
        String base = StringUtils.hasText(baseUrl) ? baseUrl.trim() : "https://apihub.agnes-ai.com/v1";
        while (base.endsWith("/")) {
            base = base.substring(0, base.length() - 1);
        }
        return base;
    }

    private static String abbreviate(String s) {
        if (s == null) {
            return "";
        }
        return s.length() <= 300 ? s : s.substring(0, 300) + "...";
    }
}
