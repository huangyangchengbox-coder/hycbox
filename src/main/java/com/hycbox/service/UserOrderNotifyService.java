package com.hycbox.service;

import com.hycbox.entity.OrderEntity;
import com.hycbox.entity.PublicationEntity;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

/**
 * 用户订单进度订阅消息（一次性模板，下单前需用户授权）。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class UserOrderNotifyService {

    private final WxSubscribeMessageService wxSubscribeMessageService;

    public void notifyOrderProgress(OrderEntity order, PublicationEntity publication, String statusText, String detail) {
        if (order == null || !StringUtils.hasText(order.getUserId())) {
            return;
        }
        String title = publication != null && StringUtils.hasText(publication.getTitle())
                ? publication.getTitle()
                : "订单进度";
        int qty = order.getDeliveredQuantity() != null
                ? order.getDeliveredQuantity()
                : (order.getQuantity() == null ? 0 : order.getQuantity());
        String page = StringUtils.hasText(order.getRoomId())
                ? "pages/hyc/user/order-detail/order-detail?id=" + order.getId()
                : (order.getLocationLat() != null
                ? "pages/hyc/village/detail/detail?id=" + order.getId()
                : "pages/hyc/express/detail/detail?id=" + order.getId());
        boolean ok = wxSubscribeMessageService.sendOrderStatusNotice(
                order.getUserId(),
                title,
                statusText,
                detail,
                order.getDeliveredAt() != null ? order.getDeliveredAt() : order.getCreatedAt(),
                qty,
                page);
        log.info("用户订单进度通知: orderId={}, status={}, ok={}", order.getId(), statusText, ok);
    }
}
