package com.hycbox.controller;

import com.hycbox.dto.ApiResponse;
import com.hycbox.dto.req.NvidiaNimChatReq;
import com.hycbox.service.AdminAuthService;
import com.hycbox.service.AdminAuthService.AdminSession;
import com.hycbox.service.NvidiaNimAiClient;
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
 * 管理端 NVIDIA NIM AI。
 * 文档参考：https://build.nvidia.com/explore/discover
 */
@Slf4j
@RestController
@RequestMapping("/admin/nvidia-nim")
@RequiredArgsConstructor
public class AdminNvidiaNimAiController {

    private final AdminAuthService adminAuthService;
    private final NvidiaNimAiClient nvidiaNimAiClient;

    @GetMapping("/status")
    public ApiResponse<?> status(@RequestHeader(value = "X-Admin-Token", required = false) String token) {
        adminAuthService.requireAdmin(token);
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("configured", nvidiaNimAiClient.isConfigured());
        data.put("models", nvidiaNimAiClient.listModels());
        return ApiResponse.ok(data);
    }

    @GetMapping("/models")
    public ApiResponse<?> models(@RequestHeader(value = "X-Admin-Token", required = false) String token) {
        adminAuthService.requireAdmin(token);
        return ApiResponse.ok(nvidiaNimAiClient.listModels());
    }

    @PostMapping("/chat")
    public ApiResponse<?> chat(@RequestHeader(value = "X-Admin-Token", required = false) String token,
                               @RequestBody NvidiaNimChatReq req) {
        AdminSession admin = adminAuthService.requireAdmin(token);
        int msgCount = req != null && req.getMessages() != null ? req.getMessages().size() : 0;
        int promptLen = req != null && req.getPrompt() != null ? req.getPrompt().length() : 0;
        log.info("NVIDIA NIM chat: adminId={}, model={}, messages={}, promptLen={}",
                admin.adminId(),
                req == null ? null : req.getModel(),
                msgCount,
                promptLen);
        return ApiResponse.ok(nvidiaNimAiClient.chat(req));
    }
}
