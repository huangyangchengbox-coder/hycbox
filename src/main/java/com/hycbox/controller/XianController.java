package com.hycbox.controller;

import com.hycbox.dto.ApiResponse;
import com.hycbox.dto.req.XianProgressSaveReq;
import com.hycbox.service.XianProgressService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** 仙途：用户进度读写 */
@Slf4j
@RestController
@RequestMapping("/xian")
@RequiredArgsConstructor
public class XianController {

    private final XianProgressService xianProgressService;

    @GetMapping("/progress")
    public ApiResponse<?> getProgress(@RequestParam String userId) {
        return ApiResponse.ok(xianProgressService.getProgress(userId));
    }

    @PutMapping("/progress")
    public ApiResponse<?> saveProgress(@RequestBody XianProgressSaveReq req) {
        return ApiResponse.ok(xianProgressService.saveProgress(req));
    }

    @DeleteMapping("/progress")
    public ApiResponse<?> clearProgress(@RequestParam String userId) {
        xianProgressService.clearProgress(userId);
        return ApiResponse.ok(null);
    }
}
