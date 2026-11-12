package com.hycbox.service;

import com.hycbox.config.HycBoxProperties;
import com.hycbox.dto.resp.AdminLoginResp;
import com.hycbox.dto.resp.AdminQrLoginCreateResp;
import com.hycbox.dto.resp.AdminQrLoginStatusResp;
import com.hycbox.entity.AdminEntity;
import com.hycbox.entity.AdminQrLoginEntity;
import com.hycbox.exception.BizException;
import com.hycbox.repository.AdminQrLoginRepository;
import com.hycbox.repository.AdminRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.Base64;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class AdminQrLoginService {

    /** 扫码确认有效期 3 分钟 */
    private static final long TICKET_TTL_MS = 180_000L;
    private static final String STATUS_PENDING = "pending";
    private static final String STATUS_SCANNED = "scanned";
    private static final String STATUS_CONFIRMED = "confirmed";
    private static final String STATUS_EXPIRED = "expired";
    private static final String STATUS_CONSUMED = "consumed";
    private static final String MP_WEB_LOGIN_PAGE = "pages/hyc/admin/web-login/web-login";

    private final AdminQrLoginRepository qrLoginRepository;
    private final AdminRepository adminRepository;
    private final AdminAuthService adminAuthService;
    private final WxSubscribeMessageService wxSubscribeMessageService;
    private final HycBoxProperties properties;

    @Transactional
    public AdminQrLoginCreateResp createTicket() {
        // scene 最长 32：t/p 前缀区分体验/正式库，避免小程序打错 API
        String ticket = newTicketId();
        long expireAt = System.currentTimeMillis() + TICKET_TTL_MS;

        AdminQrLoginEntity entity = new AdminQrLoginEntity();
        entity.setTicket(ticket);
        entity.setStatus(STATUS_PENDING);
        entity.setExpireAt(expireAt);
        entity.setCreatedAt(LocalDateTime.now());
        qrLoginRepository.save(entity);

        byte[] qrBytes = wxSubscribeMessageService.createUnlimitedQrCode(ticket, MP_WEB_LOGIN_PAGE);
        String qrImageBase64 = Base64.getEncoder().encodeToString(qrBytes);
        log.info("创建 Web 扫码登录票据: ticket={}, expireAt={}", ticket, expireAt);
        return new AdminQrLoginCreateResp(ticket, expireAt, qrImageBase64);
    }

    /** t=体验库，p=正式库；其余 31 位随机 */
    private String newTicketId() {
        boolean trial = "trial".equalsIgnoreCase(
                StringUtils.hasText(properties.getWxMpEnvVersion()) ? properties.getWxMpEnvVersion().trim() : "release");
        String prefix = trial ? "t" : "p";
        String body = UUID.randomUUID().toString().replace("-", "");
        return prefix + body.substring(0, 31);
    }

    @Transactional
    public AdminQrLoginStatusResp getStatus(String ticket) {
        AdminQrLoginEntity entity = requireTicketEntity(ticket);
        refreshExpired(entity);
        if (STATUS_EXPIRED.equals(entity.getStatus())) {
            return new AdminQrLoginStatusResp(STATUS_EXPIRED, entity.getExpireAt(), null);
        }
        if (STATUS_CONSUMED.equals(entity.getStatus())) {
            return new AdminQrLoginStatusResp(STATUS_CONSUMED, entity.getExpireAt(), null);
        }
        if (STATUS_CONFIRMED.equals(entity.getStatus())) {
            AdminLoginResp login = buildLoginResp(entity);
            entity.setStatus(STATUS_CONSUMED);
            qrLoginRepository.save(entity);
            log.info("Web 扫码登录票据已消费: ticket={}, adminId={}", entity.getTicket(), entity.getAdminId());
            return new AdminQrLoginStatusResp(STATUS_CONFIRMED, entity.getExpireAt(), login);
        }
        return new AdminQrLoginStatusResp(entity.getStatus(), entity.getExpireAt(), null);
    }

    @Transactional
    public void markScanned(String ticket) {
        AdminQrLoginEntity entity = requireTicketEntity(ticket);
        refreshExpired(entity);
        if (STATUS_EXPIRED.equals(entity.getStatus()) || STATUS_CONSUMED.equals(entity.getStatus())) {
            throw new BizException("二维码已失效，请刷新后重试");
        }
        if (STATUS_CONFIRMED.equals(entity.getStatus())) {
            return;
        }
        if (STATUS_PENDING.equals(entity.getStatus())) {
            entity.setStatus(STATUS_SCANNED);
            qrLoginRepository.save(entity);
            log.info("Web 扫码登录已扫描: ticket={}", ticket);
        }
    }

    /**
     * 确认 Web 扫码登录。
     * 优先 openid（前端可信）→ code → 管理员 token。
     */
    @Transactional
    public void confirm(String ticket, String adminToken, String wxCode, String openid) {
        AdminEntity admin = adminAuthService.requireAdminForQrConfirm(openid, wxCode, adminToken);
        confirmByAdmin(ticket, admin);
    }

    private void confirmByAdmin(String ticket, AdminEntity admin) {
        AdminQrLoginEntity entity = requireTicketEntity(ticket);
        refreshExpired(entity);
        if (STATUS_EXPIRED.equals(entity.getStatus()) || STATUS_CONSUMED.equals(entity.getStatus())) {
            throw new BizException("二维码已失效，请刷新后重试");
        }
        if (STATUS_CONFIRMED.equals(entity.getStatus())) {
            if (admin.getId().equals(entity.getAdminId())) {
                return;
            }
            throw new BizException("该二维码已被其他管理员确认");
        }

        AdminLoginResp login = adminAuthService.issueSession(admin, "web");

        entity.setStatus(STATUS_CONFIRMED);
        entity.setAdminId(admin.getId());
        entity.setWebToken(login.getToken());
        entity.setTokenExpireAt(login.getExpireAt());
        entity.setRole(login.getRole());
        entity.setUsername(login.getUsername());
        entity.setDisplayName(login.getDisplayName());
        entity.setSuperAdmin(login.getSuperAdmin());
        entity.setConfirmedAt(LocalDateTime.now());
        qrLoginRepository.save(entity);
        log.info("Web 扫码登录已确认: ticket={}, adminId={}, username={}",
                ticket, admin.getId(), admin.getUsername());
    }

    private AdminQrLoginEntity requireTicketEntity(String ticket) {
        if (!StringUtils.hasText(ticket)) {
            throw new BizException("缺少登录票据");
        }
        return qrLoginRepository.findById(ticket.trim())
                .orElseThrow(() -> new BizException("登录票据不存在或已失效"));
    }

    private void refreshExpired(AdminQrLoginEntity entity) {
        if (entity.getExpireAt() != null
                && entity.getExpireAt() < System.currentTimeMillis()
                && !STATUS_CONSUMED.equals(entity.getStatus())) {
            entity.setStatus(STATUS_EXPIRED);
            qrLoginRepository.save(entity);
        }
    }

    private AdminLoginResp buildLoginResp(AdminQrLoginEntity entity) {
        return new AdminLoginResp(
                entity.getWebToken(),
                entity.getRole(),
                entity.getAdminId(),
                entity.getUsername(),
                entity.getDisplayName(),
                entity.getSuperAdmin(),
                entity.getTokenExpireAt()
        );
    }
}
