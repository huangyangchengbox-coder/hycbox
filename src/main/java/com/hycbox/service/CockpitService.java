package com.hycbox.service;

import com.hycbox.dto.resp.CockpitDeliveryMapResp;
import com.hycbox.dto.resp.CockpitNationMapResp;
import com.hycbox.dto.resp.CockpitProvinceStatResp;
import com.hycbox.dto.resp.CockpitRoomStatusResp;
import com.hycbox.dto.resp.RoomResp;
import com.hycbox.entity.OrderEntity;
import com.hycbox.entity.PublicationEntity;
import com.hycbox.exception.BizException;
import com.hycbox.repository.OrderRepository;
import com.hycbox.repository.PublicationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/**
 * 驾驶舱：小区数据仓 / 物流中国仓汇总。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class CockpitService {

    private final PublicationRepository publicationRepository;
    private final OrderRepository orderRepository;
    private final CommunityService communityService;

    public CockpitDeliveryMapResp deliveryMap(String publicationId, String adminId) {
        if (!StringUtils.hasText(publicationId)) {
            throw new BizException("请选择发布");
        }
        PublicationEntity pub = publicationRepository.findById(publicationId.trim())
                .orElseThrow(() -> new BizException("发布不存在"));
        if (!adminId.equals(pub.getAdminId())) {
            throw new BizException("无权查看该发布");
        }
        String scope = StringUtils.hasText(pub.getScope()) ? pub.getScope() : PublicationService.SCOPE_COMMUNITY;
        if (!PublicationService.SCOPE_COMMUNITY.equals(scope)) {
            throw new BizException("驾驶舱仅支持小区闪送发布");
        }

        List<OrderEntity> pending = orderRepository
                .findByPublicationIdAndStatusOrderByCreatedAtDesc(pub.getId(), "pending");
        List<OrderEntity> completed = orderRepository
                .findByPublicationIdAndStatusOrderByCreatedAtDesc(pub.getId(), "completed");

        // 同一房间多单时：pending 优先于 completed
        Map<String, CockpitRoomStatusResp> byRoom = new HashMap<>();
        for (OrderEntity order : completed) {
            putRoom(byRoom, order, "completed");
        }
        for (OrderEntity order : pending) {
            putRoom(byRoom, order, "pending");
        }

        List<CockpitRoomStatusResp> rooms = new ArrayList<>(byRoom.values());
        rooms.sort(Comparator
                .comparing((CockpitRoomStatusResp r) -> nullToEmpty(r.getPhaseId()))
                .thenComparing(r -> nullToEmpty(r.getBuildingId()))
                .thenComparing(r -> r.getUnit() == null ? 0 : r.getUnit())
                .thenComparing(r -> r.getFloor() == null ? 0 : r.getFloor(), Comparator.reverseOrder())
                .thenComparing(r -> nullToEmpty(r.getRoomNo())));

        CockpitDeliveryMapResp resp = new CockpitDeliveryMapResp();
        resp.setPublicationId(pub.getId());
        resp.setTitle(pub.getTitle());
        resp.setScope(scope);
        resp.setCommunityId(pub.getCommunityId());
        resp.setCommunityName(pub.getCommunityName());
        resp.setPhaseId(pub.getPhaseId());
        resp.setPhaseName(pub.getPhaseName());
        resp.setPendingCount((int) rooms.stream().filter(r -> "pending".equals(r.getStatus())).count());
        resp.setCompletedCount((int) rooms.stream().filter(r -> "completed".equals(r.getStatus())).count());
        resp.setRooms(rooms);
        log.info("驾驶舱配送图: publicationId={}, pendingRooms={}, completedRooms={}",
                pub.getId(), resp.getPendingCount(), resp.getCompletedCount());
        return resp;
    }

    private void putRoom(Map<String, CockpitRoomStatusResp> byRoom, OrderEntity order, String status) {
        if (order == null || !StringUtils.hasText(order.getRoomId())) {
            return;
        }
        String roomId = order.getRoomId().trim();
        CockpitRoomStatusResp item = byRoom.get(roomId);
        if (item == null) {
            item = new CockpitRoomStatusResp();
            item.setRoomId(roomId);
            item.setRoomLabel(order.getRoomLabel());
            item.setPhaseName(order.getPhaseName());
            item.setBuildingName(order.getBuildingName());
            item.setUnit(order.getUnit());
            item.setRoomNo(order.getRoomNo());
            item.setFloor(parseFloor(order.getRoomNo()));
            fillFromRoomMaster(item, roomId);
            byRoom.put(roomId, item);
        }
        item.setStatus(status);
        item.setQuantity(order.getQuantity());
        item.setOrderId(order.getId());
    }

    private void fillFromRoomMaster(CockpitRoomStatusResp item, String roomId) {
        try {
            RoomResp room = communityService.getRoomById(roomId);
            if (room == null) {
                parseRoomIdFallback(item, roomId);
                return;
            }
            item.setPhaseId(room.getPhaseId());
            item.setPhaseName(room.getPhaseName());
            item.setBuildingId(room.getBuildingId());
            item.setBuildingName(room.getBuildingName());
            item.setUnit(room.getUnit());
            item.setRoomNo(room.getRoomNo());
            item.setRoomLabel(room.getLabel());
            if (item.getFloor() == null) {
                item.setFloor(parseFloor(room.getRoomNo()));
            }
        } catch (Exception e) {
            parseRoomIdFallback(item, roomId);
            log.debug("房间主数据未命中，使用 roomId 解析: roomId={}", roomId);
        }
    }

    /** roomId 格式：phaseId_buildingId_unit_roomNo */
    private static void parseRoomIdFallback(CockpitRoomStatusResp item, String roomId) {
        String[] parts = roomId.split("_");
        if (parts.length >= 4) {
            if (!StringUtils.hasText(item.getPhaseId())) {
                item.setPhaseId(parts[0]);
            }
            if (!StringUtils.hasText(item.getBuildingId())) {
                item.setBuildingId(parts[1]);
            }
            if (item.getUnit() == null) {
                try {
                    item.setUnit(Integer.parseInt(parts[2]));
                } catch (NumberFormatException ignored) {
                    // ignore
                }
            }
            if (!StringUtils.hasText(item.getRoomNo())) {
                item.setRoomNo(parts[3]);
            }
            if (item.getFloor() == null) {
                item.setFloor(parseFloor(parts[3]));
            }
        }
    }

    static Integer parseFloor(String roomNo) {
        if (!StringUtils.hasText(roomNo)) {
            return null;
        }
        String digits = roomNo.trim().replaceAll("[^0-9]", "");
        if (digits.length() < 3) {
            return null;
        }
        try {
            return Integer.parseInt(digits) / 100;
        } catch (NumberFormatException e) {
            return null;
        }
    }

    /**
     * 物流中国仓：按省汇总有效订单（非取消），供地图高亮与 Top5。
     */
    public CockpitNationMapResp nationMap(String publicationId, String adminId) {
        if (!StringUtils.hasText(publicationId)) {
            throw new BizException("请选择发布");
        }
        PublicationEntity pub = publicationRepository.findById(publicationId.trim())
                .orElseThrow(() -> new BizException("发布不存在"));
        if (!adminId.equals(pub.getAdminId())) {
            throw new BizException("无权查看该发布");
        }
        String scope = StringUtils.hasText(pub.getScope()) ? pub.getScope() : PublicationService.SCOPE_COMMUNITY;
        if (!PublicationService.SCOPE_NATIONWIDE.equals(scope)) {
            throw new BizException("物流中国仓仅支持全国物流发布");
        }

        List<OrderEntity> orders = orderRepository.findByPublicationIdOrderByCreatedAtDesc(pub.getId());
        Map<String, CockpitProvinceStatResp> byProvince = new LinkedHashMap<>();
        int totalOrders = 0;
        int totalQuantity = 0;
        for (OrderEntity order : orders) {
            if (order == null || "cancelled".equals(order.getStatus())) {
                continue;
            }
            String rawProvince = StringUtils.hasText(order.getProvince()) ? order.getProvince().trim() : "未填省份";
            CockpitProvinceStatResp item = byProvince.computeIfAbsent(rawProvince, k -> {
                CockpitProvinceStatResp s = new CockpitProvinceStatResp();
                s.setProvince(k);
                s.setMapName(toMapProvinceName(k));
                s.setOrderCount(0);
                s.setTotalQuantity(0);
                return s;
            });
            int qty = order.getQuantity() == null ? 0 : order.getQuantity();
            item.setOrderCount(item.getOrderCount() + 1);
            item.setTotalQuantity(item.getTotalQuantity() + qty);
            totalOrders++;
            totalQuantity += qty;
        }

        List<CockpitProvinceStatResp> provinces = new ArrayList<>(byProvince.values());
        provinces.sort(Comparator.comparingInt(CockpitProvinceStatResp::getOrderCount).reversed()
                .thenComparing(CockpitProvinceStatResp::getProvince));

        List<CockpitProvinceStatResp> top5 = provinces.stream()
                .filter(p -> !"未填省份".equals(p.getProvince()))
                .limit(5)
                .toList();

        CockpitNationMapResp resp = new CockpitNationMapResp();
        resp.setPublicationId(pub.getId());
        resp.setTitle(pub.getTitle());
        resp.setScope(scope);
        resp.setTotalOrders(totalOrders);
        resp.setTotalQuantity(totalQuantity);
        resp.setProvinces(provinces);
        resp.setTop5(top5);
        log.info("物流中国仓: publicationId={}, provinces={}, totalOrders={}",
                pub.getId(), provinces.size(), totalOrders);
        return resp;
    }

    /** 将订单省份文案对齐 DataV / ECharts 中国地图名称 */
    static String toMapProvinceName(String raw) {
        if (!StringUtils.hasText(raw) || "未填省份".equals(raw.trim())) {
            return raw;
        }
        String name = raw.trim()
                .replace("维吾尔自治区", "")
                .replace("壮族自治区", "")
                .replace("回族自治区", "")
                .replace("特别行政区", "")
                .replace("自治区", "")
                .replace("省", "")
                .replace("市", "");
        // 常见别名
        if ("内蒙古".equals(name)) {
            return "内蒙古自治区";
        }
        if ("广西".equals(name)) {
            return "广西壮族自治区";
        }
        if ("西藏".equals(name)) {
            return "西藏自治区";
        }
        if ("宁夏".equals(name)) {
            return "宁夏回族自治区";
        }
        if ("新疆".equals(name)) {
            return "新疆维吾尔自治区";
        }
        if ("香港".equals(name)) {
            return "香港特别行政区";
        }
        if ("澳门".equals(name)) {
            return "澳门特别行政区";
        }
        Set<String> municipalities = Set.of("北京", "天津", "上海", "重庆");
        if (municipalities.contains(name)) {
            return name + "市";
        }
        // 已是完整名则直接返回
        if (raw.contains("省") || raw.contains("市") || raw.contains("自治区") || raw.contains("特别行政区")) {
            return raw.trim();
        }
        return name + "省";
    }

    private static String nullToEmpty(String s) {
        return s == null ? "" : s.toLowerCase(Locale.ROOT);
    }
}
