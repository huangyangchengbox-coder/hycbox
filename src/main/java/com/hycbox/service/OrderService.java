package com.hycbox.service;

import com.hycbox.dto.req.CreateOrderReq;
import com.hycbox.dto.resp.AdminStatsResp;
import com.hycbox.dto.resp.BuildingGroupResp;
import com.hycbox.dto.resp.CourierLocationResp;
import com.hycbox.dto.resp.OrderResp;
import com.hycbox.dto.resp.PageResult;
import com.hycbox.dto.resp.ProvinceGroupResp;
import com.hycbox.dto.resp.RoomResp;
import com.hycbox.entity.OrderEntity;
import com.hycbox.entity.PublicationEntity;
import com.hycbox.exception.BizException;
import com.hycbox.repository.OrderRepository;
import com.hycbox.repository.PublicationRepository;
import com.hycbox.util.ImageUrlList;
import com.hycbox.util.PageParams;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class OrderService {

    private final OrderRepository orderRepository;
    private final PublicationRepository publicationRepository;
    private final PublicationService publicationService;
    private final CommunityService communityService;
    private final AdminNoticeService adminNoticeService;
    private final UserOrderNotifyService userOrderNotifyService;
    private final AdminAuthService adminAuthService;

    @Transactional
    public OrderResp createOrder(CreateOrderReq req) {
        if (req == null || !StringUtils.hasText(req.getUserId())) {
            throw new BizException("请先登录微信后再登记");
        }
        if (req.getQuantity() == null || req.getQuantity() <= 0) {
            throw new BizException("请填写有效数量");
        }
        PublicationEntity publication = publicationService.getById(req.getPublicationId());
        if (!"active".equals(publication.getStatus())) {
            throw new BizException("活动已结束，无法登记");
        }
        if (publication.getRemainBags() == null || publication.getRemainBags() <= 0) {
            throw new BizException("库存已领完，无法登记");
        }
        if (req.getQuantity() > publication.getRemainBags()) {
            throw new BizException("剩余数量不足");
        }

        String scope = StringUtils.hasText(publication.getScope())
                ? publication.getScope()
                : PublicationService.SCOPE_COMMUNITY;
        if (PublicationService.SCOPE_NATIONWIDE.equals(scope)) {
            return createNationwideOrder(req, publication);
        }
        if (PublicationService.SCOPE_VILLAGE.equals(scope)) {
            return createVillageOrder(req, publication);
        }
        return createCommunityOrder(req, publication);
    }

    /** 小区闪送登记 */
    private OrderResp createCommunityOrder(CreateOrderReq req, PublicationEntity publication) {
        if (!StringUtils.hasText(req.getRoomId())) {
            throw new BizException("请选择门牌");
        }
        RoomResp room = communityService.getRoomById(req.getRoomId());
        if (room == null) {
            throw new BizException("门牌不存在");
        }

        // 校验通过后再条件扣库存，避免无效单占库存
        publicationService.deductRemain(publication.getId(), req.getQuantity());

        OrderEntity entity = new OrderEntity();
        entity.setId("ord_" + UUID.randomUUID().toString().replace("-", "").substring(0, 12));
        entity.setPublicationId(req.getPublicationId());
        entity.setUserId(req.getUserId().trim());
        entity.setUserName(StringUtils.hasText(req.getUserName()) ? req.getUserName().trim() : "邻居");
        applyRoom(entity, room);
        entity.setQuantity(req.getQuantity());
        String qtyUnit = StringUtils.hasText(publication.getUnit()) ? publication.getUnit() : "袋";
        entity.setQtyUnit(qtyUnit);
        entity.setUnitPrice(publication.getUnitPrice());
        entity.setRemark(StringUtils.hasText(req.getRemark()) ? req.getRemark().trim() : null);
        entity.setStatus("pending");
        entity.setCreatedAt(LocalDateTime.now());
        orderRepository.save(entity);
        log.info("小区闪送订单: id={}, room={}, quantity={}, unitPrice={}",
                entity.getId(), entity.getRoomLabel(), entity.getQuantity(), entity.getUnitPrice());
        adminNoticeService.notifyOrderCreated(publication, entity);
        return toResp(entity);
    }

    /**
     * 小区闪送：待配送时可改门牌地址。
     */
    @Transactional
    public OrderResp updateCommunityAddress(String orderId, String roomId, String userId) {
        if (!StringUtils.hasText(roomId)) {
            throw new BizException("请选择门牌");
        }
        OrderEntity entity = orderRepository.findById(orderId)
                .orElseThrow(() -> new BizException("订单不存在"));
        if (!StringUtils.hasText(userId) || !userId.equals(entity.getUserId())) {
            throw new BizException("无权修改该订单");
        }
        PublicationEntity publication = publicationService.getById(entity.getPublicationId());
        String scope = StringUtils.hasText(publication.getScope())
                ? publication.getScope()
                : PublicationService.SCOPE_COMMUNITY;
        if (PublicationService.SCOPE_NATIONWIDE.equals(scope) || PublicationService.SCOPE_VILLAGE.equals(scope)) {
            throw new BizException(PublicationService.SCOPE_VILLAGE.equals(scope)
                    ? "村村送订单请取消后重新登记"
                    : "物流订单请联系管理员修改");
        }
        if (!"pending".equals(entity.getStatus())) {
            throw new BizException("已配送完成，无法修改地址");
        }
        RoomResp room = communityService.getRoomById(roomId.trim());
        if (room == null) {
            throw new BizException("门牌不存在");
        }
        String oldRoom = entity.getRoomLabel();
        applyRoom(entity, room);
        orderRepository.save(entity);
        log.info("修改派送地址: id={}, from={}, to={}, userId={}",
                entity.getId(), oldRoom, entity.getRoomLabel(), userId);
        adminNoticeService.notifyAddressChanged(publication, entity, oldRoom, entity.getRoomLabel());
        OrderResp resp = toResp(entity);
        enrichRoomFields(resp);
        withPublicationTitles(List.of(resp));
        return resp;
    }

    private void applyRoom(OrderEntity entity, RoomResp room) {
        entity.setRoomId(room.getId());
        entity.setRoomLabel(room.getLabel());
        entity.setBuildingName(room.getBuildingName());
        entity.setPhaseName(room.getPhaseName());
        entity.setUnit(room.getUnit());
        entity.setRoomNo(room.getRoomNo());
    }

    /** 物流中国登记：地址 + 手机 + 昵称 */
    private OrderResp createNationwideOrder(CreateOrderReq req, PublicationEntity publication) {
        if (!StringUtils.hasText(req.getPhone())) {
            throw new BizException("请填写手机号");
        }
        if (!StringUtils.hasText(req.getAddress())) {
            throw new BizException("请填写收货地址");
        }
        if (!StringUtils.hasText(req.getProvince())) {
            throw new BizException("请选择省份");
        }
        if (!StringUtils.hasText(req.getUserName())) {
            throw new BizException("请填写昵称");
        }

        publicationService.deductRemain(publication.getId(), req.getQuantity());

        OrderEntity entity = new OrderEntity();
        entity.setId("ord_" + UUID.randomUUID().toString().replace("-", "").substring(0, 12));
        entity.setPublicationId(req.getPublicationId());
        entity.setUserId(req.getUserId().trim());
        entity.setUserName(req.getUserName().trim());
        entity.setPhone(req.getPhone().trim());
        entity.setAddress(req.getAddress().trim());
        entity.setProvince(req.getProvince().trim());
        entity.setQuantity(req.getQuantity());
        String qtyUnit = StringUtils.hasText(publication.getUnit()) ? publication.getUnit() : "袋";
        entity.setQtyUnit(qtyUnit);
        entity.setUnitPrice(publication.getUnitPrice());
        entity.setRemark(StringUtils.hasText(req.getRemark()) ? req.getRemark().trim() : null);
        // 全国：先待收款核实，再进入待发货
        entity.setStatus("pending");
        entity.setCreatedAt(LocalDateTime.now());
        orderRepository.save(entity);
        log.info("物流中国订单: id={}, province={}, phone={}, quantity={}, unitPrice={}",
                entity.getId(), entity.getProvince(), entity.getPhone(), entity.getQuantity(), entity.getUnitPrice());
        adminNoticeService.notifyOrderCreated(publication, entity);
        return toResp(entity);
    }

    /**
     * 村村送登记：联系人 + 手机 + 地图选点坐标（gcj02）。
     * 仅允许对 scope=village 的发布下单。
     */
    private OrderResp createVillageOrder(CreateOrderReq req, PublicationEntity publication) {
        if (!PublicationService.SCOPE_VILLAGE.equals(
                StringUtils.hasText(publication.getScope()) ? publication.getScope() : "")) {
            throw new BizException("该发布不属于村村送，无法在此登记");
        }
        if (!StringUtils.hasText(req.getUserName())) {
            throw new BizException("请填写联系人");
        }
        if (!StringUtils.hasText(req.getPhone()) || !req.getPhone().trim().matches("^1\\d{10}$")) {
            throw new BizException("请填写正确手机号");
        }
        if (req.getLocationLat() == null || req.getLocationLng() == null) {
            throw new BizException("请选择收货位置");
        }
        double lat = req.getLocationLat();
        double lng = req.getLocationLng();
        if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
            throw new BizException("收货坐标无效");
        }

        publicationService.deductRemain(publication.getId(), req.getQuantity());

        OrderEntity entity = new OrderEntity();
        entity.setId("ord_" + UUID.randomUUID().toString().replace("-", "").substring(0, 12));
        entity.setPublicationId(req.getPublicationId());
        entity.setUserId(req.getUserId().trim());
        entity.setUserName(req.getUserName().trim());
        entity.setPhone(req.getPhone().trim());
        entity.setLocationLat(lat);
        entity.setLocationLng(lng);
        entity.setLocationName(StringUtils.hasText(req.getLocationName())
                ? req.getLocationName().trim()
                : "选中位置");
        // address 存地图返回的详细地址文案，便于配送查看
        entity.setAddress(StringUtils.hasText(req.getAddress()) ? req.getAddress().trim() : entity.getLocationName());
        entity.setQuantity(req.getQuantity());
        String qtyUnit = StringUtils.hasText(publication.getUnit()) ? publication.getUnit() : "袋";
        entity.setQtyUnit(qtyUnit);
        entity.setUnitPrice(publication.getUnitPrice());
        entity.setRemark(StringUtils.hasText(req.getRemark()) ? req.getRemark().trim() : null);
        entity.setStatus("pending");
        entity.setCreatedAt(LocalDateTime.now());
        orderRepository.save(entity);
        log.info("村村送订单: id={}, phone={}, lat={}, lng={}, quantity={}",
                entity.getId(), entity.getPhone(), lat, lng, entity.getQuantity());
        adminNoticeService.notifyOrderCreated(publication, entity);
        return toResp(entity);
    }

    public List<OrderResp> listOrders(String publicationId, String userId, String status) {
        List<OrderEntity> list;
        if (StringUtils.hasText(publicationId) && StringUtils.hasText(status)) {
            list = orderRepository.findByPublicationIdAndStatusOrderByCreatedAtDesc(publicationId, status);
        } else if (StringUtils.hasText(publicationId)) {
            list = orderRepository.findByPublicationIdOrderByCreatedAtDesc(publicationId);
        } else if (StringUtils.hasText(userId)) {
            list = orderRepository.findByUserIdOrderByCreatedAtDesc(userId);
        } else if (StringUtils.hasText(status)) {
            list = orderRepository.findByStatusOrderByCreatedAtDesc(status);
        } else {
            // 管理员内部调用应带 publicationId；禁止无条件全表
            throw new BizException("请指定发布活动");
        }
        return list.stream().map(entity -> {
            OrderResp resp = toResp(entity);
            enrichRoomFields(resp);
            return resp;
        }).collect(Collectors.collectingAndThen(Collectors.toList(), this::withPublicationTitles));
    }

    /** 用户端：强制按本人 userId 过滤，可再按发布/状态缩小 */
    public List<OrderResp> listOrdersForUser(String userId, String publicationId, String status) {
        return listOrdersForUserPage(userId, publicationId, status, 1, 100).getList();
    }

    public PageResult<OrderResp> listOrdersForUserPage(String userId, String publicationId, String status,
                                                       Integer page, Integer pageSize) {
        int p = PageParams.page(page);
        int size = PageParams.size(pageSize);
        PageRequest pr = PageRequest.of(p - 1, size);
        Page<OrderEntity> result;
        boolean hasPub = StringUtils.hasText(publicationId);
        boolean hasStatus = StringUtils.hasText(status);
        if (hasPub && hasStatus) {
            result = orderRepository.findByUserIdAndPublicationIdAndStatusOrderByCreatedAtDesc(
                    userId, publicationId, status, pr);
        } else if (hasPub) {
            result = orderRepository.findByUserIdAndPublicationIdOrderByCreatedAtDesc(userId, publicationId, pr);
        } else if (hasStatus) {
            result = orderRepository.findByUserIdAndStatusOrderByCreatedAtDesc(userId, status, pr);
        } else {
            result = orderRepository.findByUserIdOrderByCreatedAtDesc(userId, pr);
        }
        List<OrderResp> list = result.getContent().stream().map(entity -> {
            OrderResp resp = toResp(entity);
            enrichRoomFields(resp);
            return resp;
        }).collect(Collectors.collectingAndThen(Collectors.toList(), this::withPublicationTitles));
        return PageResult.of(list, result.getTotalElements(), p, size);
    }

    public PageResult<OrderResp> listOrdersPage(String publicationId, String status, Integer page, Integer pageSize) {
        int p = PageParams.page(page);
        int size = PageParams.size(pageSize);
        if (!StringUtils.hasText(publicationId)) {
            throw new BizException("请指定发布活动");
        }
        PageRequest pr = PageRequest.of(p - 1, size);
        Page<OrderEntity> result = StringUtils.hasText(status)
                ? orderRepository.findByPublicationIdAndStatusOrderByCreatedAtDesc(publicationId, status, pr)
                : orderRepository.findByPublicationIdOrderByCreatedAtDesc(publicationId, pr);
        List<OrderResp> list = result.getContent().stream().map(entity -> {
            OrderResp resp = toResp(entity);
            enrichRoomFields(resp);
            return resp;
        }).collect(Collectors.collectingAndThen(Collectors.toList(), this::withPublicationTitles));
        return PageResult.of(list, result.getTotalElements(), p, size);
    }

    /**
     * 用户取消：闪送 pending、物流 pending 可取消并回补库存。
     */
    @Transactional
    public OrderResp cancelOrder(String orderId, String userId) {
        OrderEntity entity = orderRepository.findById(orderId)
                .orElseThrow(() -> new BizException("订单不存在"));
        if (!StringUtils.hasText(userId) || !userId.equals(entity.getUserId())) {
            throw new BizException("无权取消该订单");
        }
        if ("cancelled".equals(entity.getStatus())) {
            throw new BizException("订单已取消");
        }
        if (!"pending".equals(entity.getStatus())) {
            throw new BizException("当前状态不可取消，请联系管理员");
        }
        int qty = entity.getQuantity() == null ? 0 : entity.getQuantity();
        entity.setStatus("cancelled");
        orderRepository.save(entity);
        if (qty > 0) {
            publicationService.restoreRemain(entity.getPublicationId(), qty);
        }
        PublicationEntity publication = publicationService.getById(entity.getPublicationId());
        log.info("用户取消订单: id={}, userId={}, qty={}", entity.getId(), userId, qty);
        OrderResp resp = toResp(entity);
        enrichRoomFields(resp);
        withPublicationTitles(List.of(resp));
        return resp;
    }

    /**
     * 用户看配送员位置：须本人订单、闪送待配送、发布归属管理员正在分享且位置新鲜。
     */
    public CourierLocationResp getCourierLocation(String orderId, String userId) {
        OrderEntity entity = orderRepository.findById(orderId)
                .orElseThrow(() -> new BizException("订单不存在"));
        if (!StringUtils.hasText(userId) || !userId.equals(entity.getUserId())) {
            throw new BizException("无权查看");
        }
        if (!"pending".equals(entity.getStatus())) {
            return CourierLocationResp.offline();
        }
        // 小区闪送有门牌；村村送有坐标；物流中国不展示配送员位置
        boolean flash = StringUtils.hasText(entity.getRoomId());
        boolean village = entity.getLocationLat() != null && entity.getLocationLng() != null;
        if (!flash && !village) {
            return CourierLocationResp.offline();
        }
        PublicationEntity publication = publicationService.getById(entity.getPublicationId());
        boolean nationwide = PublicationService.SCOPE_NATIONWIDE.equals(
                StringUtils.hasText(publication.getScope()) ? publication.getScope() : PublicationService.SCOPE_COMMUNITY);
        if (nationwide) {
            return CourierLocationResp.offline();
        }
        return adminAuthService.getFreshLocation(publication.getAdminId());
    }

    /**
     * 闪送：管理员到门口时提醒用户（订阅消息），不改订单状态。
     * 仅本人发布下的待配送、有门牌订单可操作；用户需曾授权订阅消息。
     */
    public void notifyArrivedAtDoor(String orderId, String adminId) {
        OrderEntity entity = orderRepository.findById(orderId)
                .orElseThrow(() -> new BizException("订单不存在"));
        PublicationEntity publication = publicationService.requireOwned(entity.getPublicationId(), adminId);
        if (!"pending".equals(entity.getStatus())) {
            throw new BizException("仅待配送订单可提醒到门口");
        }
        boolean flash = StringUtils.hasText(entity.getRoomId());
        boolean village = entity.getLocationLat() != null && entity.getLocationLng() != null;
        if (!flash && !village) {
            throw new BizException("仅闪送/村村送待配送单可提醒到门口");
        }
        String place = flash
                ? (StringUtils.hasText(entity.getRoomLabel()) ? entity.getRoomLabel() : "您家门口")
                : (StringUtils.hasText(entity.getLocationName()) ? entity.getLocationName() : "您家门口");
        userOrderNotifyService.notifyOrderProgress(
                entity,
                publication,
                "已到门口",
                "配送员已到" + place + "，请开门领取");
        log.info("到门口提醒已触发: orderId={}, place={}, adminId={}", orderId, place, adminId);
    }

    /** 补充发布标题与图片，供用户端列表/详情展示 */
    private List<OrderResp> withPublicationTitles(List<OrderResp> orders) {
        if (orders == null || orders.isEmpty()) {
            return orders;
        }
        java.util.Set<String> ids = orders.stream()
                .map(OrderResp::getPublicationId)
                .filter(StringUtils::hasText)
                .collect(Collectors.toSet());
        if (ids.isEmpty()) {
            return orders;
        }
        Map<String, PublicationEntity> pubMap = publicationRepository.findAllById(ids).stream()
                .collect(Collectors.toMap(PublicationEntity::getId, p -> p, (a, b) -> a));
        for (OrderResp order : orders) {
            if (!StringUtils.hasText(order.getPublicationId())) {
                continue;
            }
            PublicationEntity pub = pubMap.get(order.getPublicationId());
            if (pub == null) {
                continue;
            }
            order.setPublicationTitle(pub.getTitle());
            order.setPublicationImages(ImageUrlList.split(pub.getImageUrl()));
        }
        return orders;
    }

    /**
     * 确认派送完成。下单时已扣库存，若实际领取少于申请数，差额回补库存。
     * 仅发布所属管理员可操作；可记录收款金额与方式。
     */
    @Transactional
    public OrderResp completeOrder(String orderId, Integer deliveredQuantity,
                                   java.math.BigDecimal payAmount, String payMethod, String adminId) {
        OrderEntity entity = orderRepository.findById(orderId)
                .orElseThrow(() -> new BizException("订单不存在"));
        if ("completed".equals(entity.getStatus())) {
            throw new BizException("订单已完成");
        }
        PublicationEntity publication = publicationService.requireOwned(entity.getPublicationId(), adminId);
        int ordered = entity.getQuantity() == null ? 0 : entity.getQuantity();
        int actual = deliveredQuantity == null ? ordered : deliveredQuantity;
        if (actual < 0) {
            throw new BizException("实际领取数量不能小于0");
        }
        int diff = ordered - actual;
        if (diff > 0) {
            publicationService.restoreRemain(publication.getId(), diff);
            log.info("库存回补: publicationId={}, refund={}", publication.getId(), diff);
        } else if (diff < 0) {
            int extra = -diff;
            publicationService.deductRemain(publication.getId(), extra);
            log.warn("超申请送达: publicationId={}, orderId={}, ordered={}, actual={}, extra={}",
                    publication.getId(), entity.getId(), ordered, actual, extra);
        }
        entity.setDeliveredQuantity(actual);
        applyPayment(entity, publication, actual, payAmount, payMethod);
        entity.setStatus("completed");
        entity.setDeliveredAt(LocalDateTime.now());
        orderRepository.save(entity);
        log.info("订单完成: id={}, room={}, adminId={}, ordered={}, actual={}, pay={}, method={}",
                entity.getId(), entity.getRoomLabel(), adminId, ordered, actual,
                entity.getPayAmount(), entity.getPayMethod());
        userOrderNotifyService.notifyOrderProgress(entity, publication, "已送达", "您的闪送订单已配送完成");
        return toResp(entity);
    }

    /**
     * 物流中国：收款核实后进入待发货（status=paid）
     */
    @Transactional
    public OrderResp verifyPay(String orderId, java.math.BigDecimal payAmount, String payMethod, String adminId) {
        OrderEntity entity = orderRepository.findById(orderId)
                .orElseThrow(() -> new BizException("订单不存在"));
        PublicationEntity publication = publicationService.requireOwned(entity.getPublicationId(), adminId);
        if (!"pending".equals(entity.getStatus())) {
            throw new BizException("仅待核实订单可核实收款");
        }
        int qty = entity.getQuantity() == null ? 0 : entity.getQuantity();
        applyPayment(entity, publication, qty, payAmount, payMethod);
        entity.setStatus("paid");
        entity.setPayVerifiedAt(LocalDateTime.now());
        orderRepository.save(entity);
        log.info("收款核实: id={}, amount={}, method={}, adminId={}",
                entity.getId(), entity.getPayAmount(), entity.getPayMethod(), adminId);
        userOrderNotifyService.notifyOrderProgress(entity, publication, "待发货", "收款已核实，商家准备发货");
        return toResp(entity);
    }

    private void applyPayment(OrderEntity entity, PublicationEntity publication, int qty,
                              java.math.BigDecimal payAmount, String payMethod) {
        java.math.BigDecimal unitPrice = entity.getUnitPrice() != null
                ? entity.getUnitPrice()
                : (publication.getUnitPrice() != null ? publication.getUnitPrice() : java.math.BigDecimal.ZERO);
        if (entity.getUnitPrice() == null) {
            entity.setUnitPrice(unitPrice);
        }
        java.math.BigDecimal expect = unitPrice.multiply(java.math.BigDecimal.valueOf(qty))
                .setScale(2, java.math.RoundingMode.HALF_UP);
        java.math.BigDecimal amount = payAmount != null ? payAmount.setScale(2, java.math.RoundingMode.HALF_UP) : expect;
        if (amount.compareTo(java.math.BigDecimal.ZERO) < 0) {
            throw new BizException("收款金额不能为负");
        }
        String method = normalizePayMethod(payMethod);
        entity.setPayAmount(amount);
        entity.setPayMethod(method);
    }

    private String normalizePayMethod(String payMethod) {
        if ("alipay".equalsIgnoreCase(payMethod)) {
            return "alipay";
        }
        if ("wechat".equalsIgnoreCase(payMethod) || !StringUtils.hasText(payMethod)) {
            return "wechat";
        }
        throw new BizException("收款方式仅支持微信或支付宝");
    }

    /**
     * 物流中国发货：须已收款核实（paid）；支持多张凭证（一人多件快递）。
     */
    @Transactional
    public OrderResp shipOrder(String orderId, java.util.List<String> shipImageUrls, String adminId) {
        String joined = joinImageUrls(shipImageUrls);
        if (!StringUtils.hasText(joined)) {
            throw new BizException("请上传发货凭证照片");
        }
        OrderEntity entity = orderRepository.findById(orderId)
                .orElseThrow(() -> new BizException("订单不存在"));
        publicationService.requireOwned(entity.getPublicationId(), adminId);
        if ("shipped".equals(entity.getStatus())) {
            throw new BizException("订单已发货");
        }
        if (!"paid".equals(entity.getStatus())) {
            throw new BizException("请先完成收款核实");
        }
        entity.setShipImageUrl(joined);
        entity.setStatus("shipped");
        entity.setDeliveredAt(LocalDateTime.now());
        entity.setDeliveredQuantity(entity.getQuantity());
        orderRepository.save(entity);
        log.info("物流发货: id={}, adminId={}, images={}", entity.getId(), adminId, entity.getShipImageUrl());
        PublicationEntity publication = publicationService.getById(entity.getPublicationId());
        userOrderNotifyService.notifyOrderProgress(entity, publication, "已发货", "您的快递已发出，请留意物流");
        return toResp(entity);
    }

    /**
     * 已发货订单：更新发货凭证（可删可补拍），不改变订单状态与发货时间。
     */
    @Transactional
    public OrderResp updateShipImages(String orderId, List<String> shipImageUrls, String adminId) {
        String joined = joinImageUrls(shipImageUrls);
        if (!StringUtils.hasText(joined)) {
            throw new BizException("请至少保留一张发货凭证");
        }
        OrderEntity entity = orderRepository.findById(orderId)
                .orElseThrow(() -> new BizException("订单不存在"));
        publicationService.requireOwned(entity.getPublicationId(), adminId);
        if (!"shipped".equals(entity.getStatus())) {
            throw new BizException("仅已发货订单可修改发货凭证");
        }
        entity.setShipImageUrl(joined);
        orderRepository.save(entity);
        log.info("更新发货凭证: id={}, adminId={}, images={}", entity.getId(), adminId, entity.getShipImageUrl());
        return toResp(entity);
    }

    /**
     * 物流中国售后：备注 + 图片关联。
     */
    @Transactional
    public OrderResp updateAfterSale(String orderId, String remark, List<String> images, String adminId) {
        OrderEntity entity = orderRepository.findById(orderId)
                .orElseThrow(() -> new BizException("订单不存在"));
        publicationService.requireOwned(entity.getPublicationId(), adminId);
        if (!"shipped".equals(entity.getStatus()) && !"completed".equals(entity.getStatus())) {
            throw new BizException("仅已发货订单可填写售后");
        }
        entity.setAfterSaleRemark(StringUtils.hasText(remark) ? remark.trim() : null);
        if (images != null && !images.isEmpty()) {
            entity.setAfterSaleImages(joinImageUrls(images));
        }
        orderRepository.save(entity);
        log.info("售后备注更新: id={}, adminId={}", entity.getId(), adminId);
        return toResp(entity);
    }

    /** 多图 URL 存库：英文逗号分隔 */
    private String joinImageUrls(List<String> images) {
        if (images == null || images.isEmpty()) {
            return null;
        }
        String joined = images.stream()
                .filter(StringUtils::hasText)
                .map(String::trim)
                .collect(Collectors.joining(","));
        return StringUtils.hasText(joined) ? joined : null;
    }

    private List<String> splitImageUrls(String joined) {
        if (!StringUtils.hasText(joined)) {
            return List.of();
        }
        return java.util.Arrays.stream(joined.split(","))
                .map(String::trim)
                .filter(StringUtils::hasText)
                .collect(Collectors.toList());
    }

    /** 物流中国：按省分组待发货（已收款核实） */
    public List<ProvinceGroupResp> groupPendingByProvince(String publicationId) {
        List<ProvinceGroupResp> groups = groupByProvince(listOrders(publicationId, null, "paid"));
        int orderCount = groups.stream().mapToInt(g -> g.getOrderCount() == null ? 0 : g.getOrderCount()).sum();
        log.info("待发货按省汇总: publicationId={}, provinces={}, orders={}", publicationId, groups.size(), orderCount);
        return groups;
    }

    /** 物流中国：按省分组待收款核实 */
    public List<ProvinceGroupResp> groupPayVerifyByProvince(String publicationId) {
        List<ProvinceGroupResp> groups = groupByProvince(listOrders(publicationId, null, "pending"));
        int orderCount = groups.stream().mapToInt(g -> g.getOrderCount() == null ? 0 : g.getOrderCount()).sum();
        log.info("待核实按省汇总: publicationId={}, provinces={}, orders={}", publicationId, groups.size(), orderCount);
        return groups;
    }

    private List<ProvinceGroupResp> groupByProvince(List<OrderResp> orders) {
        Map<String, ProvinceGroupResp> map = new LinkedHashMap<>();
        for (OrderResp order : orders) {
            String province = StringUtils.hasText(order.getProvince()) ? order.getProvince() : "未填省份";
            ProvinceGroupResp group = map.computeIfAbsent(province, k -> {
                ProvinceGroupResp item = new ProvinceGroupResp();
                item.setProvince(k);
                item.setOrderCount(0);
                item.setTotalQuantity(0);
                item.setOrders(new ArrayList<>());
                return item;
            });
            group.setOrderCount(group.getOrderCount() + 1);
            group.setTotalQuantity(group.getTotalQuantity() + (order.getQuantity() == null ? 0 : order.getQuantity()));
            group.getOrders().add(order);
        }
        return new ArrayList<>(map.values());
    }

    public OrderResp getOrder(String orderId) {
        OrderEntity entity = orderRepository.findById(orderId)
                .orElseThrow(() -> new BizException("订单不存在"));
        OrderResp resp = toResp(entity);
        enrichRoomFields(resp);
        withPublicationTitles(List.of(resp));
        return resp;
    }

    public OrderResp getOrderForUser(String orderId, String userId) {
        OrderEntity entity = orderRepository.findById(orderId)
                .orElseThrow(() -> new BizException("订单不存在"));
        if (!userId.equals(entity.getUserId())) {
            throw new BizException("无权查看该订单");
        }
        OrderResp resp = toResp(entity);
        enrichRoomFields(resp);
        withPublicationTitles(List.of(resp));
        return resp;
    }

    public List<BuildingGroupResp> groupPendingByBuilding(String publicationId) {
        List<OrderResp> pending = listOrders(publicationId, null, "pending");
        return groupOrders(pending);
    }

    /**
     * 管理者全部待配送：按其名下所有发布汇总，按楼栋分组。
     */
    public List<BuildingGroupResp> groupPendingByAdmin(String adminId) {
        List<PublicationEntity> pubs = publicationRepository.findByAdminIdOrderByCreatedAtDesc(adminId).stream()
                .filter(p -> !PublicationService.SCOPE_NATIONWIDE.equals(
                        StringUtils.hasText(p.getScope()) ? p.getScope() : PublicationService.SCOPE_COMMUNITY))
                .collect(Collectors.toList());
        if (pubs.isEmpty()) {
            return List.of();
        }
        Map<String, String> titleMap = pubs.stream()
                .collect(Collectors.toMap(PublicationEntity::getId, PublicationEntity::getTitle, (a, b) -> a));
        List<String> pubIds = pubs.stream().map(PublicationEntity::getId).collect(Collectors.toList());
        List<OrderResp> pending = orderRepository
                .findByPublicationIdInAndStatusOrderByCreatedAtDesc(pubIds, "pending")
                .stream()
                .filter(e -> StringUtils.hasText(e.getRoomId()))
                .map(entity -> {
                    OrderResp resp = toResp(entity);
                    resp.setPublicationTitle(titleMap.get(entity.getPublicationId()));
                    return resp;
                })
                .collect(Collectors.toList());
        log.info("管理者待配送汇总: adminId={}, pubs={}, pending={}", adminId, pubIds.size(), pending.size());
        return groupOrders(pending);
    }

    public AdminStatsResp getAdminStats(String publicationId) {
        List<OrderResp> all = listOrders(publicationId, null, null);
        return buildStats(all);
    }

    public AdminStatsResp getAdminStatsByAdmin(String adminId) {
        List<PublicationEntity> pubs = publicationRepository.findByAdminIdOrderByCreatedAtDesc(adminId).stream()
                .filter(p -> !PublicationService.SCOPE_NATIONWIDE.equals(
                        StringUtils.hasText(p.getScope()) ? p.getScope() : PublicationService.SCOPE_COMMUNITY))
                .collect(Collectors.toList());
        if (pubs.isEmpty()) {
            return buildStats(List.of());
        }
        List<String> pubIds = pubs.stream().map(PublicationEntity::getId).collect(Collectors.toList());
        List<OrderResp> all = orderRepository
                .findByPublicationIdInAndStatusOrderByCreatedAtDesc(pubIds, "pending").stream()
                .filter(e -> StringUtils.hasText(e.getRoomId()))
                .map(this::toResp)
                .collect(Collectors.toList());
        List<OrderResp> completed = orderRepository
                .findByPublicationIdInAndStatusOrderByCreatedAtDesc(pubIds, "completed").stream()
                .map(this::toResp)
                .collect(Collectors.toList());
        List<OrderResp> merged = new ArrayList<>();
        merged.addAll(all);
        merged.addAll(completed);
        return buildStats(merged);
    }

    private List<BuildingGroupResp> groupOrders(List<OrderResp> pending) {
        Map<String, BuildingGroupResp> map = new LinkedHashMap<>();
        for (OrderResp order : pending) {
            // 村村送/物流无门牌，不进楼栋配送视图
            if (!StringUtils.hasText(order.getRoomId())) {
                continue;
            }
            enrichRoomFields(order);
            Integer unit = order.getUnit() == null ? 0 : order.getUnit();
            String key = order.getPhaseName() + "_" + order.getBuildingName() + "_u" + unit;
            BuildingGroupResp group = map.computeIfAbsent(key, k -> {
                BuildingGroupResp item = new BuildingGroupResp();
                item.setPhaseName(order.getPhaseName());
                item.setBuildingName(order.getBuildingName());
                item.setUnit(unit);
                item.setTotalBags(0);
                item.setOrderCount(0);
                item.setOrders(new ArrayList<>());
                return item;
            });
            group.setTotalBags(group.getTotalBags() + (order.getQuantity() == null ? 0 : order.getQuantity()));
            group.setOrderCount(group.getOrderCount() + 1);
            group.getOrders().add(order);
        }
        for (BuildingGroupResp group : map.values()) {
            group.getOrders().sort(Comparator
                    .comparing((OrderResp o) -> o.getRoomNo() == null ? "" : o.getRoomNo()));
        }
        return map.values().stream()
                .sorted(Comparator.comparing(BuildingGroupResp::getPhaseName, Comparator.nullsLast(String::compareTo))
                        .thenComparing(BuildingGroupResp::getBuildingName, Comparator.nullsLast(String::compareTo))
                        .thenComparing(BuildingGroupResp::getUnit, Comparator.nullsLast(Integer::compareTo)))
                .collect(Collectors.toList());
    }

    /** 兼容旧订单：从 roomId 解析单元与门牌 */
    private void enrichRoomFields(OrderResp order) {
        if (StringUtils.hasText(order.getRoomNo()) && order.getUnit() != null) {
            return;
        }
        String roomId = order.getRoomId();
        if (!StringUtils.hasText(roomId)) {
            return;
        }
        String[] parts = roomId.split("_");
        if (parts.length >= 2) {
            if (!StringUtils.hasText(order.getRoomNo())) {
                order.setRoomNo(parts[parts.length - 1]);
            }
            if (order.getUnit() == null) {
                try {
                    order.setUnit(Integer.parseInt(parts[parts.length - 2]));
                } catch (NumberFormatException ignored) {
                    order.setUnit(1);
                }
            }
        }
    }

    private AdminStatsResp buildStats(List<OrderResp> all) {
        AdminStatsResp stats = new AdminStatsResp();
        stats.setPendingCount((int) all.stream().filter(o -> "pending".equals(o.getStatus())).count());
        stats.setPendingBags(all.stream().filter(o -> "pending".equals(o.getStatus()))
                .mapToInt(o -> o.getQuantity() == null ? 0 : o.getQuantity()).sum());
        stats.setCompletedCount((int) all.stream().filter(o -> "completed".equals(o.getStatus())).count());
        stats.setCompletedBags(all.stream().filter(o -> "completed".equals(o.getStatus()))
                .mapToInt(o -> {
                    if (o.getDeliveredQuantity() != null) {
                        return o.getDeliveredQuantity();
                    }
                    return o.getQuantity() == null ? 0 : o.getQuantity();
                }).sum());
        int extraBags = 0;
        int extraCount = 0;
        for (OrderResp o : all) {
            if (!"completed".equals(o.getStatus())) {
                continue;
            }
            int ordered = o.getQuantity() == null ? 0 : o.getQuantity();
            int delivered = o.getDeliveredQuantity() == null ? ordered : o.getDeliveredQuantity();
            int extra = delivered - ordered;
            if (extra > 0) {
                extraBags += extra;
                extraCount += 1;
            }
        }
        stats.setExtraBags(extraBags);
        stats.setExtraCount(extraCount);
        return stats;
    }

    private OrderResp toResp(OrderEntity entity) {
        OrderResp resp = new OrderResp();
        resp.setId(entity.getId());
        resp.setPublicationId(entity.getPublicationId());
        resp.setUserId(entity.getUserId());
        resp.setUserName(entity.getUserName());
        resp.setRoomId(entity.getRoomId());
        resp.setRoomLabel(entity.getRoomLabel());
        resp.setBuildingName(entity.getBuildingName());
        resp.setPhaseName(entity.getPhaseName());
        resp.setUnit(entity.getUnit());
        resp.setRoomNo(entity.getRoomNo());
        resp.setQuantity(entity.getQuantity());
        resp.setDeliveredQuantity(entity.getDeliveredQuantity());
        int ordered = entity.getQuantity() == null ? 0 : entity.getQuantity();
        int delivered = entity.getDeliveredQuantity() == null ? 0 : entity.getDeliveredQuantity();
        resp.setExtraQuantity(Math.max(0, delivered - ordered));
        resp.setQtyUnit(StringUtils.hasText(entity.getQtyUnit()) ? entity.getQtyUnit() : "袋");
        resp.setRemark(entity.getRemark());
        resp.setPhone(entity.getPhone());
        resp.setAddress(entity.getAddress());
        resp.setProvince(entity.getProvince());
        resp.setLocationLat(entity.getLocationLat());
        resp.setLocationLng(entity.getLocationLng());
        resp.setLocationName(entity.getLocationName());
        List<String> shipImages = splitImageUrls(entity.getShipImageUrl());
        resp.setShipImages(shipImages);
        // 兼容旧前端：保留首张
        resp.setShipImageUrl(shipImages.isEmpty() ? null : shipImages.get(0));
        resp.setAfterSaleRemark(entity.getAfterSaleRemark());
        resp.setAfterSaleImages(splitImageUrls(entity.getAfterSaleImages()));
        resp.setUnitPrice(entity.getUnitPrice());
        resp.setPayAmount(entity.getPayAmount());
        resp.setPayMethod(entity.getPayMethod());
        resp.setPayVerifiedAt(entity.getPayVerifiedAt());
        resp.setStatus(entity.getStatus());
        resp.setCreatedAt(entity.getCreatedAt());
        resp.setDeliveredAt(entity.getDeliveredAt());
        return resp;
    }
}
