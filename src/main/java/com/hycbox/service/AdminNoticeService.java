package com.hycbox.service;

import com.hycbox.dto.resp.AdminNoticePollResp;
import com.hycbox.dto.resp.AdminNoticeResp;
import com.hycbox.entity.AdminEntity;
import com.hycbox.entity.AdminNoticeEntity;
import com.hycbox.entity.OrderEntity;
import com.hycbox.entity.PublicationEntity;
import com.hycbox.repository.AdminNoticeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * 管理员站内通知 + 触发一次性订阅消息。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AdminNoticeService {

    public static final String TYPE_ORDER_CREATE = "order_create";
    public static final String TYPE_ADDRESS_CHANGE = "address_change";

    private static final int UNREAD = 0;
    private static final int READ = 1;
    private static final int POLL_LIMIT = 10;

    private final AdminNoticeRepository adminNoticeRepository;
    private final AdminAuthService adminAuthService;
    private final WxSubscribeMessageService wxSubscribeMessageService;

    /** 用户新登记 → 通知发布所属管理员 */
    @Transactional
    public void notifyOrderCreated(PublicationEntity publication, OrderEntity order) {
        if (publication == null || order == null || !StringUtils.hasText(publication.getAdminId())) {
            return;
        }
        boolean nationwide = PublicationService.SCOPE_NATIONWIDE.equals(
                StringUtils.hasText(publication.getScope()) ? publication.getScope() : PublicationService.SCOPE_COMMUNITY);
        String title = nationwide ? "新物流登记" : "新闪送登记";
        String detail;
        if (nationwide) {
            detail = String.format("%s %s",
                    nullToDash(order.getProvince()),
                    nullToDash(order.getAddress()));
        } else {
            detail = nullToDash(order.getRoomLabel());
        }
        saveNotice(publication.getAdminId(), TYPE_ORDER_CREATE, title, detail,
                order.getId(), publication.getId());
        tryPushSubscribe(publication, order, title, detail);
    }

    /** 用户改派送地址 → 通知发布所属管理员 */
    @Transactional
    public void notifyAddressChanged(PublicationEntity publication, OrderEntity order, String oldRoom, String newRoom) {
        if (publication == null || order == null || !StringUtils.hasText(publication.getAdminId())) {
            return;
        }
        String title = "用户修改地址";
        String detail = String.format("%s→%s", nullToDash(oldRoom), nullToDash(newRoom));
        saveNotice(publication.getAdminId(), TYPE_ADDRESS_CHANGE, title, detail,
                order.getId(), publication.getId());
        tryPushSubscribe(publication, order, title, detail);
    }

    public AdminNoticePollResp pollUnread(String adminId) {
        long unread = adminNoticeRepository.countByAdminIdAndReadFlag(adminId, UNREAD);
        List<AdminNoticeResp> items = adminNoticeRepository
                .findByAdminIdAndReadFlagOrderByCreatedAtDesc(adminId, UNREAD)
                .stream()
                .limit(POLL_LIMIT)
                .map(this::toResp)
                .collect(Collectors.toList());
        AdminEntity admin = adminAuthService.requireAdminEntity(adminId);
        int quota = admin.getSubscribeQuota() == null ? 0 : admin.getSubscribeQuota();
        boolean bound = StringUtils.hasText(admin.getWxOpenid());
        AdminNoticePollResp resp = new AdminNoticePollResp();
        resp.setUnreadCount(unread);
        resp.setItems(items);
        resp.setSubscribeQuota(quota);
        resp.setWxBound(bound);
        resp.setNeedSubscribe(!bound || quota <= 0);
        return resp;
    }

    @Transactional
    public void markAllRead(String adminId) {
        List<AdminNoticeEntity> list = adminNoticeRepository
                .findByAdminIdAndReadFlagOrderByCreatedAtDesc(adminId, UNREAD);
        for (AdminNoticeEntity item : list) {
            item.setReadFlag(READ);
        }
        if (!list.isEmpty()) {
            adminNoticeRepository.saveAll(list);
            log.info("管理员通知全部已读: adminId={}, count={}", adminId, list.size());
        }
    }

    private void tryPushSubscribe(PublicationEntity publication, OrderEntity order, String title, String detail) {
        try {
            AdminEntity admin = adminAuthService.requireAdminEntity(publication.getAdminId());
            int quota = admin.getSubscribeQuota() == null ? 0 : admin.getSubscribeQuota();
            if (quota <= 0 || !StringUtils.hasText(admin.getWxOpenid())) {
                log.info("跳过微信推送: adminId={}, bound={}, quota={}",
                        admin.getId(), StringUtils.hasText(admin.getWxOpenid()), quota);
                return;
            }
            String pubTitle = StringUtils.hasText(publication.getTitle()) ? publication.getTitle() : title;
            int qty = order.getQuantity() == null ? 0 : order.getQuantity();
            boolean ok = wxSubscribeMessageService.sendLeaveMessageNotice(
                    admin.getWxOpenid(),
                    pubTitle,
                    order.getUserName(),
                    detail,
                    LocalDateTime.now(),
                    qty);
            if (ok) {
                adminAuthService.consumeSubscribeQuota(admin.getId());
            }
        } catch (Exception e) {
            log.warn("微信订阅推送失败（不影响站内通知）: adminId={}, err={}",
                    publication.getAdminId(), e.getMessage());
        }
    }

    private void saveNotice(String adminId, String type, String title, String content,
                            String orderId, String publicationId) {
        AdminNoticeEntity entity = new AdminNoticeEntity();
        entity.setId("ntc_" + UUID.randomUUID().toString().replace("-", "").substring(0, 12));
        entity.setAdminId(adminId);
        entity.setType(type);
        entity.setTitle(title);
        entity.setContent(content);
        entity.setOrderId(orderId);
        entity.setPublicationId(publicationId);
        entity.setReadFlag(UNREAD);
        entity.setCreatedAt(LocalDateTime.now());
        adminNoticeRepository.save(entity);
        log.info("管理员通知: id={}, adminId={}, type={}, title={}",
                entity.getId(), adminId, type, title);
    }

    private AdminNoticeResp toResp(AdminNoticeEntity entity) {
        AdminNoticeResp resp = new AdminNoticeResp();
        resp.setId(entity.getId());
        resp.setType(entity.getType());
        resp.setTitle(entity.getTitle());
        resp.setContent(entity.getContent());
        resp.setOrderId(entity.getOrderId());
        resp.setPublicationId(entity.getPublicationId());
        resp.setReadFlag(entity.getReadFlag());
        resp.setCreatedAt(entity.getCreatedAt());
        return resp;
    }

    private String nullToDash(String value) {
        return StringUtils.hasText(value) ? value : "-";
    }
}
