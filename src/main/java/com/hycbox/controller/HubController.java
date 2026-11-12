package com.hycbox.controller;

import com.hycbox.dto.ApiResponse;
import com.hycbox.service.HubEntryConfigService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** 用户首页：公开读业务入口显隐配置 */
@Slf4j
@RestController
@RequestMapping("/hub")
@RequiredArgsConstructor
public class HubController {

    private final HubEntryConfigService hubEntryConfigService;

    @GetMapping("/entries")
    public ApiResponse<?> entries() {
        return ApiResponse.ok(hubEntryConfigService.getEntries());
    }
}
