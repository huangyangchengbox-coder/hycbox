package com.hycbox.controller;

import com.hycbox.dto.ApiResponse;
import com.hycbox.dto.req.AdminLoginReq;
import com.hycbox.dto.req.AdminLocationReq;
import com.hycbox.dto.req.AdminQrLoginTicketReq;
import com.hycbox.dto.req.CreateAdminReq;
import com.hycbox.dto.req.HubEntryUpdateReq;
import com.hycbox.service.AdminAuthService;
import com.hycbox.service.AdminAuthService.AdminSession;
import com.hycbox.service.AdminNoticeService;
import com.hycbox.service.AdminQrLoginService;
import com.hycbox.service.CockpitService;
import com.hycbox.service.HubEntryConfigService;
import com.hycbox.service.OrderService;
import com.hycbox.service.PublicationService;
import com.hycbox.service.RegionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.DeleteMapping;
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
@RequestMapping("/admin")
@RequiredArgsConstructor
public class AdminController {

    private final OrderService orderService;
    private final AdminAuthService adminAuthService;
    private final AdminQrLoginService adminQrLoginService;
    private final PublicationService publicationService;
    private final AdminNoticeService adminNoticeService;
    private final RegionService regionService;
    private final CockpitService cockpitService;
    private final HubEntryConfigService hubEntryConfigService;

    @PostMapping("/login")
    public ApiResponse<?> login(@RequestBody AdminLoginReq req) {
        String username = req == null ? null : req.getUsername();
        String password = req == null ? null : req.getPassword();
        String client = req == null ? null : req.getClient();
        return ApiResponse.ok(adminAuthService.login(username, password, client));
    }

    /** Web 管理端：创建小程序扫码登录票据 */
    @PostMapping("/qr-login/create")
    public ApiResponse<?> createQrLogin() {
        return ApiResponse.ok(adminQrLoginService.createTicket());
    }

    /** Web 管理端：轮询扫码登录状态 */
    @GetMapping("/qr-login/{ticket}")
    public ApiResponse<?> qrLoginStatus(@PathVariable String ticket) {
        return ApiResponse.ok(adminQrLoginService.getStatus(ticket));
    }

    /** 小程序：扫码后标记已扫描 */
    @PostMapping("/qr-login/scan")
    public ApiResponse<?> qrLoginScan(@RequestBody AdminQrLoginTicketReq req) {
        adminQrLoginService.markScanned(req == null ? null : req.getTicket());
        return ApiResponse.ok(null);
    }

    /** 小程序：管理员确认 Web 登录（优先 body.openid，其次 code，再次 token） */
    @PostMapping("/qr-login/confirm")
    public ApiResponse<?> qrLoginConfirm(@RequestHeader(value = "X-Admin-Token", required = false) String token,
                                         @RequestBody AdminQrLoginTicketReq req) {
        adminQrLoginService.confirm(
                req == null ? null : req.getTicket(),
                token,
                req == null ? null : req.getCode(),
                req == null ? null : req.getOpenid());
        return ApiResponse.ok(null);
    }

    /** 超级管理员：管理员列表 */
    @GetMapping("/users")
    public ApiResponse<?> listUsers(@RequestHeader(value = "X-Admin-Token", required = false) String token) {
        adminAuthService.requireSuperAdmin(token);
        return ApiResponse.ok(adminAuthService.listAdmins());
    }

    /** 超级管理员：添加管理员 */
    @PostMapping("/users")
    public ApiResponse<?> createUser(@RequestHeader(value = "X-Admin-Token", required = false) String token,
                                     @RequestBody CreateAdminReq req) {
        adminAuthService.requireSuperAdmin(token);
        return ApiResponse.ok(adminAuthService.createAdmin(req));
    }

    /** 超级管理员：删除管理员（软删除） */
    @DeleteMapping("/users/{id}")
    public ApiResponse<?> deleteUser(@RequestHeader(value = "X-Admin-Token", required = false) String token,
                                     @PathVariable String id) {
        AdminSession operator = adminAuthService.requireSuperAdmin(token);
        adminAuthService.deleteAdmin(id, operator);
        return ApiResponse.ok(null);
    }

    @GetMapping("/publications")
    public ApiResponse<?> myPublications(@RequestHeader(value = "X-Admin-Token", required = false) String token,
                                         @RequestParam(required = false) Integer page,
                                         @RequestParam(required = false) Integer pageSize) {
        AdminSession admin = adminAuthService.requireAdmin(token);
        return ApiResponse.ok(publicationService.listMinePage(admin.adminId(), page, pageSize));
    }

    /** 某次发布下的登记订单（分页） */
    @GetMapping("/orders")
    public ApiResponse<?> listOrders(@RequestHeader(value = "X-Admin-Token", required = false) String token,
                                     @RequestParam String publicationId,
                                     @RequestParam(required = false) Integer page,
                                     @RequestParam(required = false) Integer pageSize) {
        AdminSession admin = adminAuthService.requireAdmin(token);
        publicationService.requireOwned(publicationId, admin.adminId());
        return ApiResponse.ok(orderService.listOrdersPage(publicationId, null, page, pageSize));
    }

    /** 物流中国：按省分组待发货（已核实） */
    @GetMapping("/orders/group-by-province")
    public ApiResponse<?> groupByProvince(@RequestHeader(value = "X-Admin-Token", required = false) String token,
                                          @RequestParam String publicationId) {
        AdminSession admin = adminAuthService.requireAdmin(token);
        publicationService.requireOwned(publicationId, admin.adminId());
        var groups = orderService.groupPendingByProvince(publicationId);
        log.info("待发货分组: publicationId={}, provinces={}, adminId={}",
                publicationId, groups == null ? 0 : groups.size(), admin.adminId());
        return ApiResponse.ok(groups);
    }

    /** 物流中国：按省分组待收款核实 */
    @GetMapping("/orders/group-pay-verify")
    public ApiResponse<?> groupPayVerify(@RequestHeader(value = "X-Admin-Token", required = false) String token,
                                         @RequestParam String publicationId) {
        AdminSession admin = adminAuthService.requireAdmin(token);
        publicationService.requireOwned(publicationId, admin.adminId());
        var groups = orderService.groupPayVerifyByProvince(publicationId);
        log.info("待核实分组: publicationId={}, provinces={}, adminId={}",
                publicationId, groups == null ? 0 : groups.size(), admin.adminId());
        return ApiResponse.ok(groups);
    }

    @GetMapping("/orders/group-by-building")
    public ApiResponse<?> groupByBuilding(@RequestHeader(value = "X-Admin-Token", required = false) String token,
                                          @RequestParam(required = false) String publicationId) {
        AdminSession admin = adminAuthService.requireAdmin(token);
        // 不传 publicationId：汇总该管理员全部待配送
        if (publicationId == null || publicationId.isBlank() || "all".equals(publicationId)) {
            return ApiResponse.ok(orderService.groupPendingByAdmin(admin.adminId()));
        }
        publicationService.requireOwned(publicationId, admin.adminId());
        return ApiResponse.ok(orderService.groupPendingByBuilding(publicationId));
    }

    @GetMapping("/stats")
    public ApiResponse<?> stats(@RequestHeader(value = "X-Admin-Token", required = false) String token,
                                @RequestParam(required = false) String publicationId) {
        AdminSession admin = adminAuthService.requireAdmin(token);
        if (publicationId == null || publicationId.isBlank() || "all".equals(publicationId)) {
            return ApiResponse.ok(orderService.getAdminStatsByAdmin(admin.adminId()));
        }
        publicationService.requireOwned(publicationId, admin.adminId());
        return ApiResponse.ok(orderService.getAdminStats(publicationId));
    }

    /**
     * 驾驶舱：小区闪送发布的房间配送状态（待派送 / 已配送）。
     */
    @GetMapping("/cockpit/delivery-map")
    public ApiResponse<?> cockpitDeliveryMap(@RequestHeader(value = "X-Admin-Token", required = false) String token,
                                             @RequestParam String publicationId) {
        AdminSession admin = adminAuthService.requireAdmin(token);
        log.info("驾驶舱配送图: publicationId={}, adminId={}", publicationId, admin.adminId());
        return ApiResponse.ok(cockpitService.deliveryMap(publicationId, admin.adminId()));
    }

    /**
     * 驾驶舱：物流中国仓按省汇总（地图亮点 + Top5）。
     */
    @GetMapping("/cockpit/nation-map")
    public ApiResponse<?> cockpitNationMap(@RequestHeader(value = "X-Admin-Token", required = false) String token,
                                           @RequestParam String publicationId) {
        AdminSession admin = adminAuthService.requireAdmin(token);
        log.info("物流中国仓: publicationId={}, adminId={}", publicationId, admin.adminId());
        return ApiResponse.ok(cockpitService.nationMap(publicationId, admin.adminId()));
    }

    /** 管理端顶部提示条：轮询未读通知 */
    @GetMapping("/notices")
    public ApiResponse<?> pollNotices(@RequestHeader(value = "X-Admin-Token", required = false) String token) {
        AdminSession admin = adminAuthService.requireAdmin(token);
        return ApiResponse.ok(adminNoticeService.pollUnread(admin.adminId()));
    }

    /** 管理端：全部标记已读 */
    @PostMapping("/notices/read-all")
    public ApiResponse<?> readAllNotices(@RequestHeader(value = "X-Admin-Token", required = false) String token) {
        AdminSession admin = adminAuthService.requireAdmin(token);
        adminNoticeService.markAllRead(admin.adminId());
        return ApiResponse.ok(null);
    }

    /** 绑定管理员微信 openid（body: { openid } 或 { code }） */
    @PostMapping("/wx-bind")
    public ApiResponse<?> bindWx(@RequestHeader(value = "X-Admin-Token", required = false) String token,
                                 @RequestBody java.util.Map<String, String> body) {
        AdminSession admin = adminAuthService.requireAdmin(token);
        String code = body == null ? null : body.get("code");
        String openid = body == null ? null : body.get("openid");
        return ApiResponse.ok(adminAuthService.bindWxOpenid(admin.adminId(), code, openid));
    }

    /**
     * 账号密码绑定小程序号。
     * body: { username, password, openid?, code? }
     */
    @PostMapping("/wx-bind-login")
    public ApiResponse<?> bindWxByLogin(@RequestBody java.util.Map<String, String> body) {
        String username = body == null ? null : body.get("username");
        String password = body == null ? null : body.get("password");
        String code = body == null ? null : body.get("code");
        String openid = body == null ? null : body.get("openid");
        return ApiResponse.ok(adminAuthService.bindWxOpenidByLogin(username, password, code, openid));
    }

    /** 查询当前微信是否已绑定管理员（body: { openid } 或 { code }） */
    @PostMapping("/wx-bind-check")
    public ApiResponse<?> checkWxBind(@RequestBody java.util.Map<String, String> body) {
        String openid = body == null ? null : body.get("openid");
        if (openid != null && !openid.isBlank()) {
            return ApiResponse.ok(adminAuthService.checkWxBoundByOpenid(openid));
        }
        String code = body == null ? null : body.get("code");
        return ApiResponse.ok(adminAuthService.checkWxBoundByCode(code));
    }

    /** 管理员一次性订阅授权成功后额度 +1 */
    @PostMapping("/subscribe/grant")
    public ApiResponse<?> grantSubscribe(@RequestHeader(value = "X-Admin-Token", required = false) String token,
                                         @RequestBody(required = false) java.util.Map<String, String> body) {
        AdminSession admin = adminAuthService.requireAdmin(token);
        String openid = body == null ? null : body.get("openid");
        return ApiResponse.ok(adminAuthService.grantSubscribeQuota(admin.adminId(), openid));
    }

    /** 查询订阅状态 */
    @GetMapping("/subscribe/status")
    public ApiResponse<?> subscribeStatus(@RequestHeader(value = "X-Admin-Token", required = false) String token) {
        AdminSession admin = adminAuthService.requireAdmin(token);
        return ApiResponse.ok(adminAuthService.getSubscribeStatus(admin.adminId()));
    }

    /**
     * 配送中上报/停止实时位置（小程序 wx.getLocation → 本接口）。
     */
    @PostMapping("/location")
    public ApiResponse<?> updateLocation(@RequestHeader(value = "X-Admin-Token", required = false) String token,
                                         @RequestBody AdminLocationReq req) {
        AdminSession admin = adminAuthService.requireAdmin(token);
        adminAuthService.updateLocation(
                admin.adminId(),
                req == null ? null : req.getSharing(),
                req == null ? null : req.getLatitude(),
                req == null ? null : req.getLongitude());
        return ApiResponse.ok(null);
    }

    /** 超级管理员：从 DataV 导入全国省市区县名录（约 1～3 分钟） */
    @PostMapping("/regions/import")
    public ApiResponse<?> importRegions(@RequestHeader(value = "X-Admin-Token", required = false) String token) {
        AdminSession admin = adminAuthService.requireSuperAdmin(token);
        log.info("触发行政区划导入: adminId={}", admin.adminId());
        return ApiResponse.ok(regionService.importFromDataV());
    }

    /** 行政区划库存统计 */
    @GetMapping("/regions/stats")
    public ApiResponse<?> regionStats(@RequestHeader(value = "X-Admin-Token", required = false) String token) {
        adminAuthService.requireAdmin(token);
        return ApiResponse.ok(regionService.stats());
    }

    /** 首页/工具业务入口显隐（小区闪送 / 物流中国 / 村村送 / 仙途） */
    @GetMapping("/hub-entries")
    public ApiResponse<?> getHubEntries(@RequestHeader(value = "X-Admin-Token", required = false) String token) {
        adminAuthService.requireAdmin(token);
        return ApiResponse.ok(hubEntryConfigService.getEntries());
    }

    @PutMapping("/hub-entries")
    public ApiResponse<?> updateHubEntries(@RequestHeader(value = "X-Admin-Token", required = false) String token,
                                           @RequestBody HubEntryUpdateReq req) {
        AdminSession admin = adminAuthService.requireAdmin(token);
        return ApiResponse.ok(hubEntryConfigService.updateEntries(req, admin.adminId()));
    }
}
