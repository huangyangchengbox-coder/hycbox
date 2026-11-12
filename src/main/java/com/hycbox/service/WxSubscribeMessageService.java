package com.hycbox.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.hycbox.config.HycBoxProperties;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

/**
 * 小程序订阅消息发送（一次性模板）。
 * 管理员需先授权增加额度，发送成功后扣减额度。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class WxSubscribeMessageService {

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("yyyy年MM月dd日 HH:mm");

    private final HycBoxProperties properties;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(8))
            .build();

    private volatile String cachedToken;
    private volatile long tokenExpireAtMs;

    /**
     * @return true 发送成功
     */
    public boolean sendLeaveMessageNotice(String openid,
                                          String articleTitle,
                                          String userName,
                                          String content,
                                          LocalDateTime time,
                                          int quantity) {
        return sendSubscribe(
                properties.getWxSubscribeTemplateId(),
                openid,
                "pages/hyc/admin/publish/publish",
                articleTitle,
                userName,
                content,
                time,
                quantity);
    }

    /**
     * 用户订单进度：优先用户模板，未配置时回退管理员模板（字段结构相同）。
     */
    public boolean sendOrderStatusNotice(String openid,
                                         String title,
                                         String statusText,
                                         String detail,
                                         LocalDateTime time,
                                         int quantity,
                                         String page) {
        String templateId = StringUtils.hasText(properties.getWxUserOrderTemplateId())
                ? properties.getWxUserOrderTemplateId()
                : properties.getWxSubscribeTemplateId();
        String jump = StringUtils.hasText(page) ? page : "pages/hyc/hub/hub";
        return sendSubscribe(templateId, openid, jump, title, statusText, detail, time, quantity);
    }

    private boolean sendSubscribe(String templateId,
                                  String openid,
                                  String page,
                                  String thing1,
                                  String thing2,
                                  String thing3,
                                  LocalDateTime time,
                                  int quantity) {
        if (!StringUtils.hasText(templateId)) {
            log.warn("未配置订阅消息模板，跳过推送");
            return false;
        }
        if (!StringUtils.hasText(openid)) {
            return false;
        }
        try {
            String accessToken = getAccessToken();
            ObjectNode body = objectMapper.createObjectNode();
            body.put("touser", openid.trim());
            body.put("template_id", templateId);
            body.put("page", page);
            body.put("miniprogram_state", "formal");
            body.put("lang", "zh_CN");
            ObjectNode data = body.putObject("data");
            putThing(data, "thing1", thing1);
            putThing(data, "thing2", thing2);
            putThing(data, "thing3", thing3);
            ObjectNode date4 = data.putObject("date4");
            date4.put("value", (time == null ? LocalDateTime.now() : time).format(DATE_FMT));
            ObjectNode number5 = data.putObject("number5");
            number5.put("value", Math.max(0, quantity));

            String url = "https://api.weixin.qq.com/cgi-bin/message/subscribe/send?access_token="
                    + URLEncoder.encode(accessToken, StandardCharsets.UTF_8);
            HttpRequest request = HttpRequest.newBuilder(URI.create(url))
                    .timeout(Duration.ofSeconds(10))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(body.toString(), StandardCharsets.UTF_8))
                    .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            JsonNode node = objectMapper.readTree(response.body());
            int errcode = node.path("errcode").asInt(-1);
            if (errcode == 0) {
                log.info("订阅消息发送成功: openid={}", openid);
                return true;
            }
            log.warn("订阅消息发送失败: openid={}, body={}", openid, response.body());
            if (errcode == 40001 || errcode == 42001) {
                cachedToken = null;
                tokenExpireAtMs = 0;
            }
            return false;
        } catch (Exception e) {
            log.error("订阅消息发送异常: openid={}", openid, e);
            return false;
        }
    }

    private void putThing(ObjectNode data, String key, String value) {
        ObjectNode field = data.putObject(key);
        field.put("value", truncateThing(value));
    }

    /** thing 类型最多约 20 个汉字 */
    private String truncateThing(String value) {
        String text = StringUtils.hasText(value) ? value.trim() : "-";
        if (text.length() <= 20) {
            return text;
        }
        return text.substring(0, 20);
    }

    /**
     * 生成小程序码（无数量限制），scene 最长 32 字符。
     */
    public byte[] createUnlimitedQrCode(String scene, String page) {
        if (!StringUtils.hasText(scene)) {
            throw new IllegalArgumentException("scene 不能为空");
        }
        String sceneVal = scene.trim();
        if (sceneVal.length() > 32) {
            throw new IllegalArgumentException("scene 最长 32 字符");
        }
        String pagePath = StringUtils.hasText(page) ? page.trim() : "pages/hyc/admin/web-login/web-login";
        try {
            String accessToken = getAccessToken();
            ObjectNode body = objectMapper.createObjectNode();
            body.put("scene", sceneVal);
            body.put("page", pagePath);
            body.put("check_path", false);
            String envVersion = StringUtils.hasText(properties.getWxMpEnvVersion())
                    ? properties.getWxMpEnvVersion().trim()
                    : "release";
            body.put("env_version", envVersion);
            body.put("width", 280);
            String url = "https://api.weixin.qq.com/wxa/getwxacodeunlimit?access_token="
                    + URLEncoder.encode(accessToken, StandardCharsets.UTF_8);
            HttpRequest request = HttpRequest.newBuilder(URI.create(url))
                    .timeout(Duration.ofSeconds(15))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(body.toString(), StandardCharsets.UTF_8))
                    .build();
            HttpResponse<byte[]> response = httpClient.send(request, HttpResponse.BodyHandlers.ofByteArray());
            byte[] bytes = response.body();
            if (bytes == null || bytes.length == 0) {
                throw new IllegalStateException("微信未返回小程序码");
            }
            if (bytes[0] == '{') {
                JsonNode node = objectMapper.readTree(new String(bytes, StandardCharsets.UTF_8));
                int errcode = node.path("errcode").asInt(-1);
                log.warn("生成小程序码失败: errcode={}, body={}", errcode, node);
                if (errcode == 40001 || errcode == 42001) {
                    cachedToken = null;
                    tokenExpireAtMs = 0;
                }
                throw new IllegalStateException("生成小程序码失败: " + node.path("errmsg").asText("未知错误"));
            }
            log.info("生成小程序码成功: scene={}, page={}", sceneVal, pagePath);
            return bytes;
        } catch (IllegalStateException | IllegalArgumentException e) {
            throw e;
        } catch (Exception e) {
            log.error("生成小程序码异常: scene={}", sceneVal, e);
            throw new IllegalStateException("生成小程序码异常");
        }
    }

    private synchronized String getAccessToken() throws Exception {
        long now = System.currentTimeMillis();
        if (StringUtils.hasText(cachedToken) && now < tokenExpireAtMs - 60_000) {
            return cachedToken;
        }
        String appId = properties.getWxAppId();
        String secret = properties.getWxAppSecret();
        if (!StringUtils.hasText(appId) || !StringUtils.hasText(secret)) {
            throw new IllegalStateException("未配置微信 AppId/AppSecret");
        }
        String url = "https://api.weixin.qq.com/cgi-bin/token"
                + "?grant_type=client_credential"
                + "&appid=" + URLEncoder.encode(appId, StandardCharsets.UTF_8)
                + "&secret=" + URLEncoder.encode(secret, StandardCharsets.UTF_8);
        HttpRequest request = HttpRequest.newBuilder(URI.create(url))
                .timeout(Duration.ofSeconds(10))
                .GET()
                .build();
        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
        JsonNode node = objectMapper.readTree(response.body());
        if (!node.has("access_token")) {
            log.warn("获取 access_token 失败: {}", response.body());
            throw new IllegalStateException("获取微信 access_token 失败");
        }
        cachedToken = node.get("access_token").asText();
        int expiresIn = node.path("expires_in").asInt(7200);
        tokenExpireAtMs = now + expiresIn * 1000L;
        log.info("刷新微信 access_token，expiresIn={}s", expiresIn);
        return cachedToken;
    }
}
