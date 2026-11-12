package com.hycbox.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.hycbox.config.HycBoxProperties;
import com.hycbox.dto.req.NvidiaNimChatReq;
import com.hycbox.dto.resp.NvidiaNimChatResp;
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
 * NVIDIA NIM（integrate.api）客户端，OpenAI 兼容 chat/completions。
 * 文档：https://build.nvidia.com/explore/discover
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class NvidiaNimAiClient {

    private static final String DEFAULT_BASE = "https://integrate.api.nvidia.com/v1";

    private final HycBoxProperties properties;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(20))
            .build();

    public boolean isConfigured() {
        HycBoxProperties.NvidiaNimAi cfg = properties.getNvidiaNimAi();
        return cfg != null && StringUtils.hasText(cfg.getApiKey());
    }

    /** 可选文本模型清单（前端下拉） */
    public List<Map<String, String>> listModels() {
        List<Map<String, String>> list = new ArrayList<>();
        list.add(model("meta/llama-3.1-8b-instruct", "Llama 3.1 8B Instruct"));
        list.add(model("meta/llama-3.1-70b-instruct", "Llama 3.1 70B Instruct"));
        list.add(model("nvidia/llama-3.1-nemotron-70b-instruct", "Nemotron 70B Instruct"));
        list.add(model("mistralai/mistral-nemotron", "Mistral Nemotron"));
        list.add(model("mistralai/mistral-7b-instruct-v0.3", "Mistral 7B Instruct"));
        list.add(model("deepseek-ai/deepseek-v4-flash", "DeepSeek V4 Flash"));
        list.add(model("google/gemma-3-12b-it", "Gemma 3 12B IT"));
        return list;
    }

    public NvidiaNimChatResp chat(NvidiaNimChatReq req) {
        ensureConfigured();
        if (req == null) {
            throw new BizException("请求不能为空");
        }
        HycBoxProperties.NvidiaNimAi cfg = properties.getNvidiaNimAi();
        String model = StringUtils.hasText(req.getModel())
                ? req.getModel().trim()
                : cfg.getDefaultModel();
        if (!StringUtils.hasText(model)) {
            model = "meta/llama-3.1-8b-instruct";
        }
        if (!model.matches("^[A-Za-z0-9_./-]+$")) {
            throw new BizException("模型名不合法");
        }

        try {
            ObjectNode body = objectMapper.createObjectNode();
            body.put("model", model);
            body.put("stream", false);
            int maxTokens = req.getMaxTokens() != null && req.getMaxTokens() > 0
                    ? Math.min(req.getMaxTokens(), 4096)
                    : 1024;
            body.put("max_tokens", maxTokens);
            if (req.getTemperature() != null) {
                body.put("temperature", req.getTemperature());
            } else {
                body.put("temperature", 0.2);
            }

            ArrayNode arr = body.putArray("messages");
            boolean hasMessages = req.getMessages() != null && !req.getMessages().isEmpty();
            if (hasMessages) {
                for (NvidiaNimChatReq.ChatMessage m : req.getMessages()) {
                    if (m == null || !StringUtils.hasText(m.getContent())) {
                        continue;
                    }
                    ObjectNode item = arr.addObject();
                    item.put("role", StringUtils.hasText(m.getRole()) ? m.getRole().trim() : "user");
                    item.put("content", m.getContent().trim());
                }
            } else if (StringUtils.hasText(req.getPrompt())) {
                ObjectNode item = arr.addObject();
                item.put("role", "user");
                item.put("content", req.getPrompt().trim());
            }
            if (arr.isEmpty()) {
                throw new BizException("请输入对话内容");
            }

            String base = StringUtils.hasText(cfg.getBaseUrl()) ? cfg.getBaseUrl().trim() : DEFAULT_BASE;
            if (base.endsWith("/")) {
                base = base.substring(0, base.length() - 1);
            }
            String url = base + "/chat/completions";
            String json = objectMapper.writeValueAsString(body);
            log.info("NVIDIA NIM 请求: model={}, bodyLen={}", model, json.length());

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .timeout(Duration.ofSeconds(90))
                    .header("Authorization", "Bearer " + cfg.getApiKey().trim())
                    .header("Content-Type", "application/json")
                    .header("Accept", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(json, StandardCharsets.UTF_8))
                    .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            String raw = response.body() == null ? "" : response.body();
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                log.warn("NVIDIA NIM 失败: status={}, body={}", response.statusCode(), abbreviate(raw));
                throw new BizException(mapError(response.statusCode(), raw));
            }

            JsonNode root = objectMapper.readTree(raw);
            String text = extractText(root);
            if (!StringUtils.hasText(text)) {
                throw new BizException("模型未返回有效内容");
            }

            NvidiaNimChatResp resp = new NvidiaNimChatResp();
            resp.setModel(model);
            resp.setResponse(text.trim());
            resp.setSuccess(true);
            log.info("NVIDIA NIM 成功: model={}, replyLen={}", model, text.length());
            return resp;
        } catch (BizException e) {
            throw e;
        } catch (Exception e) {
            log.warn("NVIDIA NIM 异常: {}", e.getMessage());
            throw new BizException("NVIDIA NIM 调用失败，请稍后再试");
        }
    }

    private void ensureConfigured() {
        if (!isConfigured()) {
            throw new BizException("未配置 NVIDIA NIM（HYCBOX_NVIDIA_NIM_API_KEY）");
        }
    }

    private static Map<String, String> model(String id, String label) {
        Map<String, String> m = new LinkedHashMap<>();
        m.put("id", id);
        m.put("label", label);
        return m;
    }

    private static String extractText(JsonNode root) {
        JsonNode choices = root.path("choices");
        if (choices.isArray() && !choices.isEmpty()) {
            JsonNode first = choices.path(0);
            String content = first.path("message").path("content").asText(null);
            if (StringUtils.hasText(content)) {
                return content;
            }
            String text = first.path("text").asText(null);
            if (StringUtils.hasText(text)) {
                return text;
            }
        }
        return null;
    }

    private static String mapError(int status, String raw) {
        if (status == 401 || status == 403) {
            return "NVIDIA API Key 无效或权限不足";
        }
        if (status == 429) {
            return "调用频率过高，请稍后再试";
        }
        String msg = null;
        try {
            JsonNode n = new ObjectMapper().readTree(raw == null ? "{}" : raw);
            msg = n.path("error").path("message").asText(null);
            if (!StringUtils.hasText(msg)) {
                msg = n.path("message").asText(null);
            }
        } catch (Exception ignored) {
            // ignore
        }
        return StringUtils.hasText(msg) ? msg : ("NVIDIA NIM 请求失败(" + status + ")");
    }

    private static String abbreviate(String s) {
        if (s == null) {
            return "";
        }
        return s.length() <= 500 ? s : s.substring(0, 500) + "...";
    }
}
