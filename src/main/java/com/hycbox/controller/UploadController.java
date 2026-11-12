package com.hycbox.controller;

import com.hycbox.dto.ApiResponse;
import com.hycbox.service.AdminAuthService;
import com.hycbox.service.UploadService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

@RestController
@RequestMapping("/upload")
@RequiredArgsConstructor
public class UploadController {

    private final UploadService uploadService;
    private final AdminAuthService adminAuthService;

    @PostMapping
    public ApiResponse<Map<String, String>> upload(
            @RequestHeader(value = "X-Admin-Token", required = false) String token,
            @RequestParam("file") MultipartFile file) {
        adminAuthService.requireAdmin(token);
        String url = uploadService.upload(file);
        return ApiResponse.ok(Map.of("url", url));
    }

    /**
     * 固定 key 上传静态资源，例：game/xian/grass.png → https://hychyr.top/uploads/game/xian/grass.png
     */
    @PostMapping("/static")
    public ApiResponse<Map<String, String>> uploadStatic(
            @RequestHeader(value = "X-Admin-Token", required = false) String token,
            @RequestParam("key") String key,
            @RequestParam("file") MultipartFile file) {
        adminAuthService.requireAdmin(token);
        String url = uploadService.uploadStatic(key, file);
        return ApiResponse.ok(Map.of("url", url, "key", key));
    }
}
