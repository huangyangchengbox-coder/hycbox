package com.hycbox.controller;

import com.hycbox.dto.ApiResponse;
import com.hycbox.service.CommunityService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/community")
@RequiredArgsConstructor
public class CommunityController {

    private final CommunityService communityService;

    /** 小区列表（后续可扩展更多小区） */
    @GetMapping("/list")
    public ApiResponse<?> list() {
        return ApiResponse.ok(communityService.listCommunities());
    }

    @GetMapping("/info")
    public ApiResponse<?> info(@RequestParam(required = false) String communityId) {
        if (communityId == null || communityId.isBlank()) {
            return ApiResponse.ok(communityService.getCommunityInfo());
        }
        return ApiResponse.ok(communityService.getCommunityInfo(communityId));
    }

    @GetMapping("/phases")
    public ApiResponse<?> phases(@RequestParam(required = false) String communityId) {
        if (communityId == null || communityId.isBlank()) {
            return ApiResponse.ok(communityService.getPhases());
        }
        return ApiResponse.ok(communityService.getPhases(communityId));
    }

    @GetMapping("/rooms")
    public ApiResponse<?> rooms(@RequestParam(required = false) String communityId,
                                @RequestParam String phaseId,
                                @RequestParam String buildingId,
                                @RequestParam(required = false) Integer unit) {
        return ApiResponse.ok(communityService.getRoomsByBuilding(communityId, phaseId, buildingId, unit));
    }

    @GetMapping("/rooms/search")
    public ApiResponse<?> searchRooms(@RequestParam(required = false) String communityId,
                                      @RequestParam String keyword) {
        return ApiResponse.ok(communityService.searchRooms(communityId, keyword, 30));
    }
}
