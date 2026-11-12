package com.hycbox.controller;

import com.hycbox.dto.ApiResponse;
import com.hycbox.dto.req.CreateAiMediaReq;
import com.hycbox.service.AdminAuthService;
import com.hycbox.service.AdminAuthService.AdminSession;
import com.hycbox.service.AiMediaJobService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Slf4j
@RestController
@RequestMapping("/admin/ai-media")
@RequiredArgsConstructor
public class AdminAiMediaController {

    private final AdminAuthService adminAuthService;
    private final AiMediaJobService aiMediaJobService;

    @PostMapping("/images")
    public ApiResponse<?> createImage(@RequestHeader(value = "X-Admin-Token", required = false) String token,
                                      @RequestBody CreateAiMediaReq req) {
        AdminSession admin = adminAuthService.requireAdmin(token);
        log.info("图片 AI 生成: adminId={}, promptLen={}, size={}, n={}", admin.adminId(),
                req == null || req.getPrompt() == null ? 0 : req.getPrompt().length(),
                req == null ? null : req.getSize(),
                req == null ? null : req.getN());
        return ApiResponse.ok(aiMediaJobService.createImage(req, admin));
    }

    @PostMapping("/videos")
    public ApiResponse<?> createVideo(@RequestHeader(value = "X-Admin-Token", required = false) String token,
                                      @RequestBody CreateAiMediaReq req) {
        AdminSession admin = adminAuthService.requireAdmin(token);
        log.info("视频 AI 生成: adminId={}, promptLen={}, seconds={}, size={}", admin.adminId(),
                req == null || req.getPrompt() == null ? 0 : req.getPrompt().length(),
                req == null ? null : req.getSeconds(),
                req == null ? null : req.getSize());
        return ApiResponse.ok(aiMediaJobService.createVideo(req, admin));
    }

    @GetMapping
    public ApiResponse<?> list(@RequestHeader(value = "X-Admin-Token", required = false) String token,
                               @RequestParam String type,
                               @RequestParam(required = false) Integer page,
                               @RequestParam(required = false) Integer pageSize) {
        adminAuthService.requireAdmin(token);
        return ApiResponse.ok(aiMediaJobService.list(type, page, pageSize));
    }

    @GetMapping("/{id}")
    public ApiResponse<?> getById(@RequestHeader(value = "X-Admin-Token", required = false) String token,
                                  @PathVariable String id) {
        adminAuthService.requireAdmin(token);
        return ApiResponse.ok(aiMediaJobService.getById(id));
    }

    @PostMapping("/{id}/refresh")
    public ApiResponse<?> refresh(@RequestHeader(value = "X-Admin-Token", required = false) String token,
                                  @PathVariable String id) {
        adminAuthService.requireAdmin(token);
        log.info("视频 AI 刷新: id={}", id);
        return ApiResponse.ok(aiMediaJobService.refreshVideo(id));
    }
}
