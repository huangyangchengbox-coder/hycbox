package com.hycbox.service;

import com.hycbox.dto.req.CreateAdminReq;
import com.hycbox.dto.resp.AdminLoginResp;
import com.hycbox.dto.resp.AdminSubscribeStatusResp;
import com.hycbox.dto.resp.AdminUserResp;
import com.hycbox.dto.resp.CourierLocationResp;
import com.hycbox.entity.AdminEntity;
import com.hycbox.entity.AdminSessionEntity;
import com.hycbox.exception.BizException;
import com.hycbox.repository.AdminRepository;
import com.hycbox.repository.AdminSessionRepository;
import com.hycbox.util.AdminPasswordHasher;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class AdminAuthService {

    private final AdminRepository adminRepository;
    private final AdminSessionRepository adminSessionRepository;
    private final WxUserService wxUserService;
    private final PasswordEncoder passwordEncoder;
    /** 登录 token 有效期：30 天 */
    private static final long TOKEN_TTL_MS = 30L * 24 * 60 * 60 * 1000;
    /** 同一账号最多保留的有效会话数（超出删最早） */
    private static final int MAX_SESSIONS_PER_ADMIN = 10;

    @Transactional
    public AdminLoginResp login(String username, String password, String client) {
        if (!StringUtils.hasText(username) || !StringUtils.hasText(password)) {
            throw new BizException("请输入账号和密码");
        }
        AdminEntity admin = adminRepository.findByUsernameAndStatus(username.trim(), "active")
                .orElseThrow(() -> new BizException("账号或密码错误"));
        String raw = password.trim();
        if (!AdminPasswordHasher.matches(passwordEncoder, raw, admin.getPassword())) {
            log.warn("管理者登录失败: username={}", username);
            throw new BizException("账号或密码错误");
        }
        // 历史明文密码：登录成功后迁移为 BCrypt
        if (!AdminPasswordHasher.isEncoded(admin.getPassword())) {
            admin.setPassword(AdminPasswordHasher.encode(passwordEncoder, raw));
            log.info("管理者密码已迁移为 BCrypt: username={}", admin.getUsername());
            adminRepository.save(admin);
        }
        boolean superAdmin = "super".equals(admin.getRole());
        String clientTag = normalizeClient(client);
        AdminLoginResp resp = issueSession(admin, clientTag, superAdmin);
        log.info("管理者登录成功: username={}, role={}, client={}, expireAt={}",
                admin.getUsername(), admin.getRole(), clientTag, resp.getExpireAt());
        return resp;
    }

    /**
     * 为管理员签发登录会话（密码登录、扫码登录等共用）。
     */
    @Transactional
    public AdminLoginResp issueSession(AdminEntity admin, String client) {
        if (admin == null || !"active".equals(admin.getStatus())) {
            throw new BizException("管理员不可用");
        }
        boolean superAdmin = "super".equals(admin.getRole());
        return issueSession(admin, normalizeClient(client), superAdmin);
    }

    private AdminLoginResp issueSession(AdminEntity admin, String clientTag, boolean superAdmin) {
        long expireAt = System.currentTimeMillis() + TOKEN_TTL_MS;
        String token = UUID.randomUUID().toString().replace("-", "");

        AdminSessionEntity session = new AdminSessionEntity();
        session.setId("as_" + UUID.randomUUID().toString().replace("-", "").substring(0, 12));
        session.setAdminId(admin.getId());
        session.setToken(token);
        session.setExpireAt(expireAt);
        session.setClient(clientTag);
        session.setCreatedAt(LocalDateTime.now());
        adminSessionRepository.save(session);
        trimSessions(admin.getId());

        return new AdminLoginResp(
                token,
                admin.getRole(),
                admin.getId(),
                admin.getUsername(),
                admin.getDisplayName(),
                superAdmin,
                expireAt
        );
    }

    /** 兼容旧调用 */
    @Transactional
    public AdminLoginResp login(String username, String password) {
        return login(username, password, null);
    }

    public AdminSession requireAdmin(String token) {
        if (!StringUtils.hasText(token)) {
            throw new BizException("请先登录管理者账号");
        }
        String rawToken = token.trim();
        AdminEntity admin = resolveAdminByToken(rawToken);
        if (admin == null || !"active".equals(admin.getStatus())) {
            throw new BizException("登录已失效，请重新登录");
        }
        long expireAt = resolveExpireAt(rawToken, admin);
        if (expireAt < System.currentTimeMillis()) {
            invalidateToken(rawToken, admin);
            throw new BizException("登录已失效，请重新登录");
        }
        return new AdminSession(
                admin.getId(),
                admin.getUsername(),
                admin.getDisplayName(),
                admin.getRole(),
                expireAt
        );
    }

    public AdminSession requireSuperAdmin(String token) {
        AdminSession session = requireAdmin(token);
        if (!session.superAdmin()) {
            throw new BizException("需要超级管理员权限");
        }
        return session;
    }

    public List<AdminUserResp> listAdmins() {
        return adminRepository.findAll().stream()
                .filter(a -> "active".equals(a.getStatus()))
                .sorted(Comparator.comparing(AdminEntity::getCreatedAt,
                        Comparator.nullsLast(Comparator.naturalOrder())))
                .map(this::toResp)
                .collect(Collectors.toList());
    }

    @Transactional
    public AdminUserResp createAdmin(CreateAdminReq req) {
        if (!StringUtils.hasText(req.getUsername()) || !StringUtils.hasText(req.getPassword())) {
            throw new BizException("账号和密码不能为空");
        }
        String username = req.getUsername().trim();
        if (adminRepository.findByUsernameAndStatus(username, "active").isPresent()) {
            throw new BizException("账号已存在");
        }
        AdminEntity entity = adminRepository.findAll().stream()
                .filter(a -> username.equals(a.getUsername()))
                .findFirst()
                .orElseGet(AdminEntity::new);
        if (!StringUtils.hasText(entity.getId())) {
            entity.setId("adm_" + UUID.randomUUID().toString().replace("-", "").substring(0, 10));
            entity.setCreatedAt(LocalDateTime.now());
        }
        entity.setUsername(username);
        entity.setPassword(AdminPasswordHasher.encode(passwordEncoder, req.getPassword().trim()));
        entity.setDisplayName(StringUtils.hasText(req.getDisplayName())
                ? req.getDisplayName().trim()
                : username);
        entity.setRole("admin");
        entity.setStatus("active");
        entity.setToken(null);
        entity.setTokenExpireAt(null);
        adminRepository.save(entity);
        log.info("新增管理员: username={}, displayName={}", entity.getUsername(), entity.getDisplayName());
        return toResp(entity);
    }

    @Transactional
    public void deleteAdmin(String targetAdminId, AdminSession operator) {
        if (!StringUtils.hasText(targetAdminId)) {
            throw new BizException("缺少管理员ID");
        }
        if (operator.adminId().equals(targetAdminId)) {
            throw new BizException("不能删除当前登录账号");
        }
        AdminEntity entity = adminRepository.findById(targetAdminId)
                .orElseThrow(() -> new BizException("管理员不存在"));
        if ("super".equals(entity.getRole())) {
            throw new BizException("不能删除超级管理员");
        }
        entity.setStatus("disabled");
        entity.setToken(null);
        entity.setTokenExpireAt(null);
        adminRepository.save(entity);
        adminSessionRepository.deleteByAdminId(entity.getId());
        log.info("删除管理员: id={}, username={}, by={}", entity.getId(), entity.getUsername(), operator.username());
    }

    /** 绑定当前管理员微信 openid（优先 body.openid，否则用 code 换取） */
    @Transactional
    public AdminSubscribeStatusResp bindWxOpenid(String adminId, String code, String openid) {
        AdminEntity admin = adminRepository.findById(adminId)
                .orElseThrow(() -> new BizException("管理员不存在"));
        String resolved = resolveOpenid(code, openid);
        ensureOpenidAvailable(resolved, adminId);
        admin.setWxOpenid(resolved);
        if (admin.getSubscribeQuota() == null) {
            admin.setSubscribeQuota(0);
        }
        adminRepository.save(admin);
        log.info("管理员绑定微信: adminId={}, openid={}", adminId, resolved);
        return subscribeStatus(admin);
    }

    /**
     * 用小程序 code 查询当前微信是否已绑定启用管理员（无需 token）。
     */
    public AdminSubscribeStatusResp checkWxBoundByCode(String code) {
        if (!StringUtils.hasText(code)) {
            throw new BizException("缺少微信登录凭证");
        }
        String openid = wxUserService.resolveOpenidByCode(code.trim());
        return checkWxBoundByOpenid(openid);
    }

    /** 用 openid 查询是否已绑定启用管理员（无需 token） */
    public AdminSubscribeStatusResp checkWxBoundByOpenid(String openid) {
        if (!StringUtils.hasText(openid)) {
            AdminSubscribeStatusResp resp = new AdminSubscribeStatusResp();
            resp.setWxBound(false);
            resp.setSubscribeQuota(0);
            resp.setNeedSubscribe(true);
            return resp;
        }
        return adminRepository.findByWxOpenidAndStatus(openid.trim(), "active")
                .map(this::subscribeStatus)
                .orElseGet(() -> {
                    AdminSubscribeStatusResp resp = new AdminSubscribeStatusResp();
                    resp.setWxBound(false);
                    resp.setSubscribeQuota(0);
                    resp.setNeedSubscribe(true);
                    return resp;
                });
    }

    /**
     * 账号密码登录并绑定小程序 openid。
     */
    @Transactional
    public AdminSubscribeStatusResp bindWxOpenidByLogin(String username, String password, String code, String openid) {
        AdminLoginResp login = login(username, password, "mp");
        return bindWxOpenid(login.getAdminId(), code, openid);
    }

    /**
     * 按 openid / code / token 解析扫码确认用的管理员。
     */
    public AdminEntity requireAdminForQrConfirm(String openid, String code, String adminToken) {
        if (StringUtils.hasText(openid)) {
            return adminRepository.findByWxOpenidAndStatus(openid.trim(), "active")
                    .orElseThrow(() -> new BizException("当前微信未绑定管理员，请先在小程序「我的」绑定小程序号"));
        }
        if (StringUtils.hasText(code)) {
            return requireAdminByWxCode(code);
        }
        if (StringUtils.hasText(adminToken)) {
            AdminSession session = requireAdmin(adminToken);
            return adminRepository.findById(session.adminId())
                    .orElseThrow(() -> new BizException("管理员不存在"));
        }
        throw new BizException("当前微信未绑定管理员，请先在小程序「我的」绑定小程序号");
    }

    /**
     * 用小程序 code 解析 openid，查找已绑定的启用管理员（扫码确认 Web 登录）。
     */
    public AdminEntity requireAdminByWxCode(String code) {
        if (!StringUtils.hasText(code)) {
            throw new BizException("缺少微信登录凭证");
        }
        String openid = wxUserService.resolveOpenidByCode(code.trim());
        return adminRepository.findByWxOpenidAndStatus(openid, "active")
                .orElseThrow(() -> new BizException("当前微信未绑定管理员，请先在小程序「我的」绑定小程序号"));
    }

    /** openid 优先，否则 code 换取 */
    private String resolveOpenid(String code, String openid) {
        if (StringUtils.hasText(openid)) {
            return openid.trim();
        }
        if (StringUtils.hasText(code)) {
            return wxUserService.resolveOpenidByCode(code.trim());
        }
        throw new BizException("缺少微信 openid 或登录凭证");
    }

    /** 同一 openid 不可绑到多个管理员 */
    private void ensureOpenidAvailable(String openid, String currentAdminId) {
        adminRepository.findByWxOpenidAndStatus(openid, "active").ifPresent(other -> {
            if (!other.getId().equals(currentAdminId)) {
                throw new BizException("该微信已绑定其他管理员账号");
            }
        });
    }

    /**
     * 管理员完成一次订阅授权后调用：额度 +1。
     * 一次性模板：授权一次只能推一条，推完需再授权。
     */
    @Transactional
    public AdminSubscribeStatusResp grantSubscribeQuota(String adminId, String openid) {
        AdminEntity admin = adminRepository.findById(adminId)
                .orElseThrow(() -> new BizException("管理员不存在"));
        if (StringUtils.hasText(openid)) {
            String trimmed = openid.trim();
            ensureOpenidAvailable(trimmed, adminId);
            admin.setWxOpenid(trimmed);
        }
        if (!StringUtils.hasText(admin.getWxOpenid())) {
            throw new BizException("请先绑定微信后再订阅提醒");
        }
        int quota = admin.getSubscribeQuota() == null ? 0 : admin.getSubscribeQuota();
        admin.setSubscribeQuota(quota + 1);
        adminRepository.save(admin);
        log.info("管理员订阅额度+1: adminId={}, quota={}", adminId, admin.getSubscribeQuota());
        return subscribeStatus(admin);
    }

    public AdminSubscribeStatusResp getSubscribeStatus(String adminId) {
        AdminEntity admin = adminRepository.findById(adminId)
                .orElseThrow(() -> new BizException("管理员不存在"));
        return subscribeStatus(admin);
    }

    /**
     * 配送页上报位置。sharing=false 时停止分享；true 时写入经纬度。
     */
    @Transactional
    public void updateLocation(String adminId, Boolean sharing, Double latitude, Double longitude) {
        AdminEntity admin = adminRepository.findById(adminId)
                .orElseThrow(() -> new BizException("管理员不存在"));
        boolean on = Boolean.TRUE.equals(sharing);
        if (!on) {
            admin.setLocationSharing(false);
            adminRepository.save(admin);
            log.info("管理员停止位置分享: adminId={}", adminId);
            return;
        }
        if (latitude == null || longitude == null
                || latitude < -90 || latitude > 90
                || longitude < -180 || longitude > 180) {
            throw new BizException("位置坐标无效");
        }
        admin.setLocationSharing(true);
        admin.setLocationLat(latitude);
        admin.setLocationLng(longitude);
        admin.setLocationAt(LocalDateTime.now());
        adminRepository.save(admin);
        log.info("管理员位置已更新: adminId={}, lat={}, lng={}", adminId, latitude, longitude);
    }

    /**
     * 用户查看配送员位置：需 sharing=true 且 5 分钟内有更新。
     */
    public CourierLocationResp getFreshLocation(String adminId) {
        if (!StringUtils.hasText(adminId)) {
            return CourierLocationResp.offline();
        }
        AdminEntity admin = adminRepository.findById(adminId).orElse(null);
        if (admin == null || !Boolean.TRUE.equals(admin.getLocationSharing())) {
            return CourierLocationResp.offline();
        }
        if (admin.getLocationLat() == null || admin.getLocationLng() == null || admin.getLocationAt() == null) {
            return CourierLocationResp.offline();
        }
        long ageSec = ChronoUnit.SECONDS.between(admin.getLocationAt(), LocalDateTime.now());
        if (ageSec < 0 || ageSec > 300) {
            return CourierLocationResp.offline();
        }
        return new CourierLocationResp(true, admin.getLocationLat(), admin.getLocationLng(), admin.getLocationAt());
    }

    public AdminEntity requireAdminEntity(String adminId) {
        return adminRepository.findById(adminId)
                .orElseThrow(() -> new BizException("管理员不存在"));
    }

    /** 推送成功后扣减额度 */
    @Transactional
    public void consumeSubscribeQuota(String adminId) {
        AdminEntity admin = adminRepository.findById(adminId).orElse(null);
        if (admin == null) {
            return;
        }
        int quota = admin.getSubscribeQuota() == null ? 0 : admin.getSubscribeQuota();
        admin.setSubscribeQuota(Math.max(0, quota - 1));
        adminRepository.save(admin);
        log.info("管理员订阅额度-1: adminId={}, quota={}", adminId, admin.getSubscribeQuota());
    }

    private AdminEntity resolveAdminByToken(String token) {
        return adminSessionRepository.findByToken(token)
                .flatMap(s -> adminRepository.findById(s.getAdminId()))
                .or(() -> adminRepository.findByTokenAndStatus(token, "active"))
                .orElse(null);
    }

    private long resolveExpireAt(String token, AdminEntity admin) {
        return adminSessionRepository.findByToken(token)
                .map(AdminSessionEntity::getExpireAt)
                .orElseGet(() -> admin.getTokenExpireAt() == null ? 0L : admin.getTokenExpireAt());
    }

    private void invalidateToken(String token, AdminEntity admin) {
        adminSessionRepository.findByToken(token).ifPresent(adminSessionRepository::delete);
        if (token.equals(admin.getToken())) {
            admin.setToken(null);
            admin.setTokenExpireAt(null);
            adminRepository.save(admin);
        }
        log.info("已清除过期 token: username={}", admin.getUsername());
    }

    private void trimSessions(String adminId) {
        List<AdminSessionEntity> list = adminSessionRepository.findByAdminIdOrderByCreatedAtAsc(adminId);
        int overflow = list.size() - MAX_SESSIONS_PER_ADMIN;
        if (overflow <= 0) {
            return;
        }
        for (int i = 0; i < overflow; i++) {
            adminSessionRepository.delete(list.get(i));
        }
        log.info("修剪管理员会话: adminId={}, removed={}", adminId, overflow);
    }

    private static String normalizeClient(String client) {
        if (!StringUtils.hasText(client)) {
            return "unknown";
        }
        String c = client.trim().toLowerCase(Locale.ROOT);
        if ("web".equals(c) || "mp".equals(c)) {
            return c;
        }
        if ("mini".equals(c) || "miniprogram".equals(c)) {
            return "mp";
        }
        return c.length() > 16 ? c.substring(0, 16) : c;
    }

    private AdminSubscribeStatusResp subscribeStatus(AdminEntity admin) {
        int quota = admin.getSubscribeQuota() == null ? 0 : admin.getSubscribeQuota();
        boolean bound = StringUtils.hasText(admin.getWxOpenid());
        return new AdminSubscribeStatusResp(bound, quota, !bound || quota <= 0);
    }

    private AdminUserResp toResp(AdminEntity entity) {
        AdminUserResp resp = new AdminUserResp();
        resp.setId(entity.getId());
        resp.setUsername(entity.getUsername());
        resp.setDisplayName(entity.getDisplayName());
        resp.setRole(entity.getRole());
        resp.setStatus(entity.getStatus());
        resp.setCreatedAt(entity.getCreatedAt());
        return resp;
    }

    public record AdminSession(String adminId, String username, String displayName, String role, long expireAt) {
        public boolean superAdmin() {
            return "super".equals(role);
        }
    }
}
