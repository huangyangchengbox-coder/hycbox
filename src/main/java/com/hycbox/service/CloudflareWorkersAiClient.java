package com.hycbox.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.hycbox.config.HycBoxProperties;
import com.hycbox.dto.req.CloudflareChatReq;
import com.hycbox.dto.resp.CloudflareChatResp;
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
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Cloudflare Workers AI REST 客户端。
 * 文档：https://developers.cloudflare.com/workers-ai/get-started/rest-api/
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class CloudflareWorkersAiClient {

    private static final String API_BASE = "https://api.cloudflare.com/client/v4/accounts/";

    private final HycBoxProperties properties;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(20))
            .build();

    public boolean isConfigured() {
        HycBoxProperties.CloudflareWorkersAi cfg = properties.getCloudflareWorkersAi();
        return cfg != null
                && StringUtils.hasText(cfg.getAccountId())
                && StringUtils.hasText(cfg.getApiToken());
    }

    /** 可选文本模型清单（前端下拉） */
    public List<Map<String, String>> listModels() {
        List<Map<String, String>> list = new ArrayList<>();
        list.add(model("@cf/meta/llama-3.1-8b-instruct", "Llama 3.1 8B Instruct"));
        list.add(model("@cf/meta/llama-3.2-3b-instruct", "Llama 3.2 3B Instruct"));
        list.add(model("@cf/qwen/qwen1.5-14b-chat-awq", "Qwen1.5 14B Chat"));
        list.add(model("@cf/google/gemma-2-9b-it", "Gemma 2 9B IT"));
        list.add(model("@cf/mistral/mistral-7b-instruct-v0.1", "Mistral 7B Instruct"));
        return list;
    }

    public CloudflareChatResp chat(CloudflareChatReq req) {
        ensureConfigured();
        if (req == null) {
            throw new BizException("请求不能为空");
        }
        HycBoxProperties.CloudflareWorkersAi cfg = properties.getCloudflareWorkersAi();
        String model = StringUtils.hasText(req.getModel())
                ? req.getModel().trim()
                : cfg.getDefaultModel();
        if (!StringUtils.hasText(model)) {
            model = "@cf/meta/llama-3.1-8b-instruct";
        }

        try {
            ObjectNode body = objectMapper.createObjectNode();
            boolean hasMessages = req.getMessages() != null && !req.getMessages().isEmpty();
            if (hasMessages) {
                ArrayNode arr = body.putArray("messages");
                for (CloudflareChatReq.ChatMessage m : req.getMessages()) {
                    if (m == null || !StringUtils.hasText(m.getContent())) {
                        continue;
                    }
                    ObjectNode item = arr.addObject();
                    item.put("role", StringUtils.hasText(m.getRole()) ? m.getRole().trim() : "user");
                    item.put("content", m.getContent().trim());
                }
                if (arr.isEmpty()) {
                    throw new BizException("请输入对话内容");
                }
            } else if (StringUtils.hasText(req.getPrompt())) {
                body.put("prompt", req.getPrompt().trim());
            } else {
                throw new BizException("请输入对话内容");
            }

            String json = objectMapper.writeValueAsString(body);
            // 模型路径含 /，不可整体 encode，仅校验安全字符
            if (!model.matches("^@[A-Za-z0-9_./-]+$")) {
                throw new BizException("模型名不合法");
            }
            String url = API_BASE + cfg.getAccountId().trim() + "/ai/run/" + model;
            log.info("Cloudflare Workers AI 请求: model={}, bodyLen={}", model, json.length());

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .timeout(Duration.ofSeconds(90))
                    .header("Authorization", "Bearer " + cfg.getApiToken().trim())
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(json, StandardCharsets.UTF_8))
                    .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            String raw = response.body() == null ? "" : response.body();
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                log.warn("Cloudflare Workers AI 失败: status={}, body={}", response.statusCode(), abbreviate(raw));
                throw new BizException(mapError(response.statusCode(), raw));
            }

            JsonNode root = objectMapper.readTree(raw);
            if (root.has("success") && !root.path("success").asBoolean(true)) {
                String err = root.path("errors").path(0).path("message").asText("Workers AI 调用失败");
                throw new BizException(err);
            }
            String text = extractText(root);
            if (!StringUtils.hasText(text)) {
                throw new BizException("模型未返回有效内容");
            }

            CloudflareChatResp resp = new CloudflareChatResp();
            resp.setModel(model);
            resp.setResponse(text.trim());
            resp.setSuccess(true);
            log.info("Cloudflare Workers AI 成功: model={}, replyLen={}", model, text.length());
            return resp;
        } catch (BizException e) {
            throw e;
        } catch (Exception e) {
            log.warn("Cloudflare Workers AI 异常: {}", e.getMessage());
            throw new BizException("Workers AI 调用失败，请稍后再试");
        }
    }

    private void ensureConfigured() {
        if (!isConfigured()) {
            throw new BizException("未配置 Cloudflare Workers AI（HYCBOX_CF_ACCOUNT_ID / HYCBOX_CF_API_TOKEN）");
        }
    }

    private static Map<String, String> model(String id, String label) {
        Map<String, String> m = new LinkedHashMap<>();
        m.put("id", id);
        m.put("label", label);
        return m;
    }

    private static String extractText(JsonNode root) {
        JsonNode result = root.path("result");
        if (result.isMissingNode()) {
            result = root;
        }
        String response = result.path("response").asText(null);
        if (StringUtils.hasText(response)) {
            return response;
        }
        // 部分模型返回 message / content
        String message = result.path("message").asText(null);
        if (StringUtils.hasText(message)) {
            return message;
        }
        JsonNode choices = result.path("choices");
        if (choices.isArray() && !choices.isEmpty()) {
            JsonNode first = choices.path(0);
            String content = first.path("message").path("content").asText(null);
            if (StringUtils.hasText(content)) {
                return content;
            }
            // prompt 模式部分模型返回 text_completion
            String text = first.path("text").asText(null);
            if (StringUtils.hasText(text)) {
                return text;
            }
        }
        return null;
    }

    private static String mapError(int status, String raw) {
        if (status == 401 || status == 403) {
            return "Cloudflare Token 无效或权限不足";
        }
        if (status == 429) {
            return "调用频率过高，请稍后再试";
        }
        String msg = null;
        try {
            JsonNode n = new ObjectMapper().readTree(raw == null ? "{}" : raw);
            msg = n.path("errors").path(0).path("message").asText(null);
            if (!StringUtils.hasText(msg)) {
                msg = n.path("result").path("error").asText(null);
            }
        } catch (Exception ignored) {
            // ignore
        }
        return StringUtils.hasText(msg) ? msg : ("Workers AI 请求失败(" + status + ")");
    }

    private static String abbreviate(String s) {
        if (s == null) {
            return "";
        }
        return s.length() <= 500 ? s : s.substring(0, 500) + "...";
    }
}
