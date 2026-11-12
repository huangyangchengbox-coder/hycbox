package com.hycbox.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hycbox.config.HycBoxProperties;
import com.hycbox.dto.resp.WxSessionResp;
import com.hycbox.entity.WxUserEntity;
import com.hycbox.exception.BizException;
import com.hycbox.repository.WxUserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class WxUserService {

    private final WxUserRepository wxUserRepository;
    private final HycBoxProperties properties;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(8))
            .build();

    /**
     * 用 wx.login code 换 openid，并返回/创建用户及上次角色。
     */
    @Transactional
    public WxSessionResp loginByCode(String code) {
        if (!StringUtils.hasText(code)) {
            throw new BizException("缺少微信登录 code");
        }
        String openid = exchangeCode(code.trim());
        WxUserEntity user = wxUserRepository.findByOpenid(openid).orElseGet(() -> {
            WxUserEntity entity = new WxUserEntity();
            entity.setId("wx_" + UUID.randomUUID().toString().replace("-", "").substring(0, 12));
            entity.setOpenid(openid);
            entity.setLastRole("user");
            entity.setCreatedAt(LocalDateTime.now());
            entity.setUpdatedAt(LocalDateTime.now());
            wxUserRepository.save(entity);
            log.info("新微信用户: openid={}", openid);
            return entity;
        });
        String role = StringUtils.hasText(user.getLastRole()) ? user.getLastRole() : "user";
        return new WxSessionResp(openid, user.getId(), role);
    }

    @Transactional
    public void updateLastRole(String openid, String role) {
        if (!StringUtils.hasText(openid)) {
            throw new BizException("缺少 openid");
        }
        String normalized = "admin".equals(role) ? "admin" : "user";
        WxUserEntity user = wxUserRepository.findByOpenid(openid.trim())
                .orElseThrow(() -> new BizException("用户不存在，请先登录"));
        user.setLastRole(normalized);
        user.setUpdatedAt(LocalDateTime.now());
        wxUserRepository.save(user);
        log.info("更新用户角色偏好: openid={}, role={}", openid, normalized);
    }

    /**
     * 仅用 code 换 openid（管理员绑定微信用）。
     */
    public String resolveOpenidByCode(String code) {
        if (!StringUtils.hasText(code)) {
            throw new BizException("缺少微信登录 code");
        }
        return exchangeCode(code.trim());
    }

    private String exchangeCode(String code) {
        String appId = properties.getWxAppId();
        String secret = properties.getWxAppSecret();
        if (!StringUtils.hasText(appId) || !StringUtils.hasText(secret)) {
            throw new BizException("服务端未配置微信 AppId/AppSecret");
        }
        try {
            String url = "https://api.weixin.qq.com/sns/jscode2session"
                    + "?appid=" + URLEncoder.encode(appId, StandardCharsets.UTF_8)
                    + "&secret=" + URLEncoder.encode(secret, StandardCharsets.UTF_8)
                    + "&js_code=" + URLEncoder.encode(code, StandardCharsets.UTF_8)
                    + "&grant_type=authorization_code";
            HttpRequest request = HttpRequest.newBuilder(URI.create(url))
                    .timeout(Duration.ofSeconds(10))
                    .GET()
                    .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            JsonNode node = objectMapper.readTree(response.body());
            if (node.has("errcode") && node.get("errcode").asInt() != 0) {
                log.warn("jscode2session 失败: {}", response.body());
                throw new BizException("微信登录失败: " + node.path("errmsg").asText("未知错误"));
            }
            String openid = node.path("openid").asText(null);
            if (!StringUtils.hasText(openid)) {
                throw new BizException("微信登录失败：未返回 openid");
            }
            return openid;
        } catch (BizException e) {
            throw e;
        } catch (Exception e) {
            log.error("调用微信 jscode2session 异常", e);
            throw new BizException("微信登录服务异常");
        }
    }
}
