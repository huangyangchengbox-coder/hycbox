package com.hycbox.controller;

import com.hycbox.dto.ApiResponse;
import com.hycbox.dto.req.AfterSaleReq;
import com.hycbox.dto.req.CompleteOrderReq;
import com.hycbox.dto.req.CreateOrderReq;
import com.hycbox.dto.req.ShipOrderReq;
import com.hycbox.dto.req.UpdateOrderAddressReq;
import com.hycbox.dto.req.VerifyPayReq;
import com.hycbox.exception.BizException;
import com.hycbox.service.AdminAuthService;
import com.hycbox.service.AdminAuthService.AdminSession;
import com.hycbox.service.OrderService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Slf4j
@RestController
@RequestMapping("/orders")
@RequiredArgsConstructor
public class OrderController {

    private final OrderService orderService;
    private final AdminAuthService adminAuthService;

    /**
     * 用户：必须带 userId，仅查自己的单（分页）。
     * 管理员：带 X-Admin-Token，可按 publicationId/status 查（分页）。
     */
    @GetMapping
    public ApiResponse<?> list(@RequestHeader(value = "X-Admin-Token", required = false) String token,
                               @RequestParam(required = false) String publicationId,
                               @RequestParam(required = false) String userId,
                               @RequestParam(required = false) String status,
                               @RequestParam(required = false) Integer page,
                               @RequestParam(required = false) Integer pageSize) {
        if (StringUtils.hasText(token)) {
            AdminSession admin = adminAuthService.requireAdmin(token);
            log.info("管理员查询订单列表: adminId={}, publicationId={}, status={}, page={}",
                    admin.adminId(), publicationId, status, page);
            return ApiResponse.ok(orderService.listOrdersPage(publicationId, status, page, pageSize));
        }
        if (!StringUtils.hasText(userId)) {
            throw new BizException("请先登录");
        }
        log.info("用户查询订单列表: userId={}, publicationId={}, status={}, page={}",
                userId, publicationId, status, page);
        return ApiResponse.ok(orderService.listOrdersForUserPage(
                userId.trim(), publicationId, status, page, pageSize));
    }

    /** 用户须传 userId 且归属本人；管理员带 token 可看任意单 */
    @GetMapping("/{id}")
    public ApiResponse<?> detail(@PathVariable String id,
                                 @RequestHeader(value = "X-Admin-Token", required = false) String token,
                                 @RequestParam(required = false) String userId) {
        if (StringUtils.hasText(token)) {
            AdminSession admin = adminAuthService.requireAdmin(token);
            log.info("管理员查询订单详情: orderId={}, adminId={}", id, admin.adminId());
            return ApiResponse.ok(orderService.getOrder(id));
        }
        if (!StringUtils.hasText(userId)) {
            throw new BizException("请先登录");
        }
        log.info("用户查询订单详情: orderId={}, userId={}", id, userId);
        return ApiResponse.ok(orderService.getOrderForUser(id, userId.trim()));
    }

    @PostMapping
    public ApiResponse<?> create(@RequestBody CreateOrderReq req) {
        log.info("创建订单: publicationId={}, quantity={}, userId={}",
                req == null ? null : req.getPublicationId(),
                req == null ? null : req.getQuantity(),
                req == null ? null : req.getUserId());
        return ApiResponse.ok(orderService.createOrder(req));
    }

    /** 小区闪送：待配送订单修改地址（须本人） */
    @PutMapping("/{id}/address")
    public ApiResponse<?> updateAddress(@PathVariable String id,
                                        @RequestBody UpdateOrderAddressReq req) {
        if (req == null || !StringUtils.hasText(req.getUserId())) {
            throw new BizException("请先登录");
        }
        log.info("修改派送地址请求: orderId={}, roomId={}, userId={}",
                id, req.getRoomId(), req.getUserId());
        return ApiResponse.ok(orderService.updateCommunityAddress(
                id, req.getRoomId(), req.getUserId().trim()));
    }

    /** 用户取消待处理订单 */
    @PutMapping("/{id}/cancel")
    public ApiResponse<?> cancel(@PathVariable String id,
                                 @RequestParam String userId) {
        log.info("取消订单: orderId={}, userId={}", id, userId);
        return ApiResponse.ok(orderService.cancelOrder(id, userId));
    }

    /**
     * 用户查看配送员实时位置（仅本人待配送闪送单；无地图 Key，纯经纬度）。
     */
    @GetMapping("/{id}/courier-location")
    public ApiResponse<?> courierLocation(@PathVariable String id,
                                          @RequestParam String userId) {
        return ApiResponse.ok(orderService.getCourierLocation(id, userId));
    }

    /**
     * 管理员通知用户：配送员已到门口（订阅消息；订单状态不变）。
     */
    @PutMapping("/{id}/arrive-door")
    public ApiResponse<?> arriveDoor(@PathVariable String id,
                                     @RequestHeader(value = "X-Admin-Token", required = false) String token) {
        AdminSession admin = adminAuthService.requireAdmin(token);
        log.info("到门口提醒: orderId={}, adminId={}", id, admin.adminId());
        orderService.notifyArrivedAtDoor(id, admin.adminId());
        return ApiResponse.ok(null);
    }

    @PutMapping("/{id}/complete")
    public ApiResponse<?> complete(@PathVariable String id,
                                   @RequestHeader(value = "X-Admin-Token", required = false) String token,
                                   @RequestBody(required = false) CompleteOrderReq req) {
        AdminSession admin = adminAuthService.requireAdmin(token);
        Integer deliveredQuantity = req == null ? null : req.getDeliveredQuantity();
        log.info("配送完成请求: orderId={}, delivered={}, payAmount={}, payMethod={}, adminId={}",
                id, deliveredQuantity,
                req == null ? null : req.getPayAmount(),
                req == null ? null : req.getPayMethod(),
                admin.adminId());
        return ApiResponse.ok(orderService.completeOrder(
                id,
                deliveredQuantity,
                req == null ? null : req.getPayAmount(),
                req == null ? null : req.getPayMethod(),
                admin.adminId()));
    }

    @PutMapping("/{id}/verify-pay")
    public ApiResponse<?> verifyPay(@PathVariable String id,
                                    @RequestHeader(value = "X-Admin-Token", required = false) String token,
                                    @RequestBody VerifyPayReq req) {
        AdminSession admin = adminAuthService.requireAdmin(token);
        log.info("收款核实请求: orderId={}, payAmount={}, payMethod={}, adminId={}",
                id,
                req == null ? null : req.getPayAmount(),
                req == null ? null : req.getPayMethod(),
                admin.adminId());
        return ApiResponse.ok(orderService.verifyPay(
                id,
                req == null ? null : req.getPayAmount(),
                req == null ? null : req.getPayMethod(),
                admin.adminId()));
    }

    @PutMapping("/{id}/ship")
    public ApiResponse<?> ship(@PathVariable String id,
                               @RequestHeader(value = "X-Admin-Token", required = false) String token,
                               @RequestBody ShipOrderReq req) {
        AdminSession admin = adminAuthService.requireAdmin(token);
        java.util.List<String> images = req == null ? null : req.getShipImageUrls();
        if ((images == null || images.isEmpty()) && req != null && StringUtils.hasText(req.getShipImageUrl())) {
            images = java.util.List.of(req.getShipImageUrl());
        }
        log.info("发货请求: orderId={}, imageCount={}, adminId={}",
                id, images == null ? 0 : images.size(), admin.adminId());
        return ApiResponse.ok(orderService.shipOrder(id, images, admin.adminId()));
    }

    /** 已发货：修改发货凭证（删除 / 重拍 / 补传） */
    @PutMapping("/{id}/ship-images")
    public ApiResponse<?> updateShipImages(@PathVariable String id,
                                           @RequestHeader(value = "X-Admin-Token", required = false) String token,
                                           @RequestBody ShipOrderReq req) {
        AdminSession admin = adminAuthService.requireAdmin(token);
        java.util.List<String> images = req == null ? null : req.getShipImageUrls();
        if ((images == null || images.isEmpty()) && req != null && StringUtils.hasText(req.getShipImageUrl())) {
            images = java.util.List.of(req.getShipImageUrl());
        }
        log.info("更新发货凭证: orderId={}, imageCount={}, adminId={}",
                id, images == null ? 0 : images.size(), admin.adminId());
        return ApiResponse.ok(orderService.updateShipImages(id, images, admin.adminId()));
    }

    @PutMapping("/{id}/after-sale")
    public ApiResponse<?> afterSale(@PathVariable String id,
                                    @RequestHeader(value = "X-Admin-Token", required = false) String token,
                                    @RequestBody AfterSaleReq req) {
        AdminSession admin = adminAuthService.requireAdmin(token);
        int imgCount = req != null && req.getAfterSaleImages() != null ? req.getAfterSaleImages().size() : 0;
        log.info("售后更新请求: orderId={}, imageCount={}, adminId={}", id, imgCount, admin.adminId());
        String remark = req == null ? null : req.getAfterSaleRemark();
        return ApiResponse.ok(orderService.updateAfterSale(
                id, remark, req == null ? null : req.getAfterSaleImages(), admin.adminId()));
    }
}
