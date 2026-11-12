package com.hycbox.controller;

import com.hycbox.dto.ApiResponse;
import com.hycbox.service.WeatherService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 首页天气：前端 getLocation 后传经纬度查询。
 */
@Slf4j
@RestController
@RequestMapping("/weather")
@RequiredArgsConstructor
public class WeatherController {

    private final WeatherService weatherService;

    @GetMapping
    public ApiResponse<?> weather(@RequestParam Double latitude,
                                  @RequestParam Double longitude) {
        log.info("天气请求: lat={}, lng={}", latitude, longitude);
        return ApiResponse.ok(weatherService.query(latitude, longitude));
    }
}
