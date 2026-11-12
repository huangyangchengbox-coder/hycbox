package com.hycbox.controller;

import com.hycbox.dto.ApiResponse;
import com.hycbox.service.RegionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 行政区划查询：按上级 adcode 列出下级（默认 100000=省级）。
 */
@Slf4j
@RestController
@RequestMapping("/regions")
@RequiredArgsConstructor
public class RegionController {

    private final RegionService regionService;

    @GetMapping
    public ApiResponse<?> list(@RequestParam(required = false) String parentAdcode) {
        return ApiResponse.ok(regionService.listByParent(parentAdcode));
    }
}
