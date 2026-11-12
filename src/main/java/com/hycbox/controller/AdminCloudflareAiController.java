package com.hycbox.controller;

import com.hycbox.dto.ApiResponse;
import com.hycbox.dto.req.CloudflareChatReq;
import com.hycbox.service.AdminAuthService;
import com.hycbox.service.AdminAuthService.AdminSession;
import com.hycbox.service.CloudflareWorkersAiClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * 管理端 Cloudflare Workers AI。
 * 文档参考：https://developers.cloudflare.com/workers-ai/get-started/rest-api/
 */
@Slf4j
@RestController
@RequestMapping("/admin/cloudflare-ai")
@RequiredArgsConstructor
public class AdminCloudflareAiController {

    private final AdminAuthService adminAuthService;
    private final CloudflareWorkersAiClient cloudflareWorkersAiClient;

    @GetMapping("/status")
    public ApiResponse<?> status(@RequestHeader(value = "X-Admin-Token", required = false) String token) {
        adminAuthService.requireAdmin(token);
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("configured", cloudflareWorkersAiClient.isConfigured());
        data.put("models", cloudflareWorkersAiClient.listModels());
        return ApiResponse.ok(data);
    }

    @GetMapping("/models")
    public ApiResponse<?> models(@RequestHeader(value = "X-Admin-Token", required = false) String token) {
        adminAuthService.requireAdmin(token);
        return ApiResponse.ok(cloudflareWorkersAiClient.listModels());
    }

    @PostMapping("/chat")
    public ApiResponse<?> chat(@RequestHeader(value = "X-Admin-Token", required = false) String token,
                               @RequestBody CloudflareChatReq req) {
        AdminSession admin = adminAuthService.requireAdmin(token);
        int msgCount = req != null && req.getMessages() != null ? req.getMessages().size() : 0;
        int promptLen = req != null && req.getPrompt() != null ? req.getPrompt().length() : 0;
        log.info("Cloudflare Workers AI chat: adminId={}, model={}, messages={}, promptLen={}",
                admin.adminId(),
                req == null ? null : req.getModel(),
                msgCount,
                promptLen);
        return ApiResponse.ok(cloudflareWorkersAiClient.chat(req));
    }
}
