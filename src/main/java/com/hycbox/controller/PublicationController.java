package com.hycbox.controller;

import com.hycbox.dto.ApiResponse;
import com.hycbox.dto.req.CreatePublicationReq;
import com.hycbox.dto.req.UpdatePublicationReq;
import com.hycbox.service.AdminAuthService;
import com.hycbox.service.AdminAuthService.AdminSession;
import com.hycbox.service.PublicationAiDetailService;
import com.hycbox.service.PublicationService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/publications")
@RequiredArgsConstructor
public class PublicationController {

    private final PublicationService publicationService;
    private final PublicationAiDetailService publicationAiDetailService;
    private final AdminAuthService adminAuthService;

    /** 用户端：按小区/期数或全国 scope 筛选进行中的发布（分页） */
    @GetMapping
    public ApiResponse<?> list(@RequestParam(required = false) String communityId,
                               @RequestParam(required = false) String phaseId,
                               @RequestParam(required = false) String scope,
                               @RequestParam(required = false) Integer page,
                               @RequestParam(required = false) Integer pageSize) {
        if (PublicationService.SCOPE_NATIONWIDE.equals(scope)) {
            return ApiResponse.ok(publicationService.listNationwideActivePage(page, pageSize));
        }
        if (PublicationService.SCOPE_VILLAGE.equals(scope)) {
            return ApiResponse.ok(publicationService.listVillageActivePage(page, pageSize));
        }
        return ApiResponse.ok(publicationService.listActivePublicationsPage(communityId, phaseId, page, pageSize));
    }

    /** 用户端：普通物品详情（只读已有数据，不触发生成） */
    @GetMapping("/{id}")
    public ApiResponse<?> detail(@PathVariable String id) {
        return ApiResponse.ok(publicationService.getDetail(id));
    }

    /**
     * 兼容旧路径；请改用 GET /publications/{id}。
     * 仍可能触发生成，小程序请勿再调用。
     */
    @GetMapping("/{id}/ai-detail")
    public ApiResponse<?> aiDetail(@PathVariable String id) {
        return ApiResponse.ok(publicationAiDetailService.getOrGenerate(id));
    }

    @PostMapping
    public ApiResponse<?> create(@RequestHeader(value = "X-Admin-Token", required = false) String token,
                                 @RequestBody CreatePublicationReq req) {
        AdminSession admin = adminAuthService.requireAdmin(token);
        return ApiResponse.ok(publicationService.create(req, admin));
    }

    /** 管理者修改单价/库存/标题 */
    @PutMapping("/{id}")
    public ApiResponse<?> update(@RequestHeader(value = "X-Admin-Token", required = false) String token,
                                 @PathVariable String id,
                                 @RequestBody UpdatePublicationReq req) {
        AdminSession admin = adminAuthService.requireAdmin(token);
        return ApiResponse.ok(publicationService.updatePublication(id, req, admin));
    }

    @PutMapping("/{id}/end")
    public ApiResponse<?> end(@RequestHeader(value = "X-Admin-Token", required = false) String token,
                              @PathVariable String id) {
        AdminSession admin = adminAuthService.requireAdmin(token);
        return ApiResponse.ok(publicationService.endActivity(id, admin));
    }
}
