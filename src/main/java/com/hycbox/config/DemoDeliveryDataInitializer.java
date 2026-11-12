package com.hycbox.config;

import com.hycbox.dto.resp.RoomResp;
import com.hycbox.entity.AdminEntity;
import com.hycbox.entity.OrderEntity;
import com.hycbox.entity.PublicationEntity;
import com.hycbox.repository.AdminRepository;
import com.hycbox.repository.OrderRepository;
import com.hycbox.repository.PublicationRepository;
import com.hycbox.service.CommunityService;
import com.hycbox.service.PublicationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * 演示数据：仅 local + reset-demo-data=true 时清空并重建，避免生产误开。
 */
@Slf4j
@Component
@Order(20)
@RequiredArgsConstructor
public class DemoDeliveryDataInitializer implements ApplicationRunner {

    public static final String DEMO_PUB_ID = "pub_demo_delivery";
    public static final String DEMO_NATION_PUB_ID = "pub_demo_nationwide";

    private final AdminRepository adminRepository;
    private final PublicationRepository publicationRepository;
    private final OrderRepository orderRepository;
    private final CommunityService communityService;
    private final HycBoxProperties properties;
    private final Environment environment;

    @Override
    public void run(ApplicationArguments args) {
        if (!properties.isResetDemoData()) {
            log.info("跳过演示数据（hycbox.reset-demo-data=false）");
            return;
        }
        if (!environment.acceptsProfiles(Profiles.of("local"))) {
            log.error("拒绝演示数据重置：非 local 环境（即使 reset-demo-data=true）");
            return;
        }
        log.warn("local 环境将清空并重建演示发布/订单");
        seedDemo();
    }

    private void seedDemo() {
        AdminEntity admin = adminRepository.findByUsernameAndStatus("hyc", "active").orElse(null);
        if (admin == null) {
            log.warn("超级管理员不存在，跳过演示数据初始化");
            return;
        }

        long orderCount = orderRepository.count();
        long pubCount = publicationRepository.count();
        orderRepository.deleteAll();
        publicationRepository.deleteAll();
        log.info("已清空旧数据: publications={}, orders={}", pubCount, orderCount);

        seedCommunityDemo(admin);
        seedNationwideDemo(admin);
    }

    private void seedCommunityDemo(AdminEntity admin) {
        int totalBags = 200;
        String communityId = communityService.getDefaultCommunityId();
        var community = communityService.resolveCommunity(communityId);
        PublicationEntity pub = new PublicationEntity();
        pub.setId(DEMO_PUB_ID);
        pub.setTitle("邻里水果派送");
        pub.setImageUrl(null);
        pub.setTotalBags(totalBags);
        pub.setRemainBags(totalBags);
        pub.setUnit("袋");
        pub.setUnitPrice(new java.math.BigDecimal("15.00"));
        pub.setScope(PublicationService.SCOPE_COMMUNITY);
        pub.setCommunityId(community.get("id"));
        pub.setCommunityName(community.get("name"));
        pub.setPhaseId(null);
        pub.setPhaseName(null);
        pub.setStatus("active");
        pub.setAdminId(admin.getId());
        pub.setAdminName(admin.getDisplayName());
        pub.setCreatedAt(LocalDateTime.now());
        publicationRepository.save(pub);

        List<String> roomIds = List.of(
                "phase1_1_1_1001", "phase1_1_1_1002", "phase1_1_1_1003", "phase1_1_1_1004",
                "phase1_1_1_1501", "phase1_1_1_1502", "phase1_1_1_1503", "phase1_1_1_1601",
                "phase1_2_1_1001", "phase1_2_1_1002", "phase1_2_1_1501", "phase1_2_1_1502",
                "phase1_2_2_1001", "phase1_2_2_1002", "phase1_2_2_1501", "phase1_2_2_1601",
                "phase1_3_1_1001", "phase1_3_1_1501", "phase1_3_2_1001", "phase1_3_2_1502",
                "phase2_13_1_1001", "phase2_13_1_1501", "phase2_13_2_1001", "phase2_14_1_1001"
        );

        String[] names = {"张先生", "李女士", "王阿姨", "赵叔叔", "陈先生", "刘女士", "周先生", "吴女士"};
        int[] qtys = {1, 2, 1, 3, 2, 1, 2, 1};

        int used = 0;
        int seq = 1;
        List<OrderEntity> batch = new ArrayList<>();
        for (String roomId : roomIds) {
            RoomResp room = communityService.getRoomById(roomId);
            if (room == null) {
                continue;
            }
            int qty = qtys[(seq - 1) % qtys.length];
            OrderEntity order = new OrderEntity();
            order.setId("ord_demo_" + String.format("%03d", seq));
            order.setPublicationId(DEMO_PUB_ID);
            order.setUserId("user_demo_" + seq);
            order.setUserName(names[(seq - 1) % names.length]);
            order.setRoomId(room.getId());
            order.setRoomLabel(room.getLabel());
            order.setBuildingName(room.getBuildingName());
            order.setPhaseName(room.getPhaseName());
            order.setUnit(room.getUnit());
            order.setRoomNo(room.getRoomNo());
            order.setQuantity(qty);
            order.setQtyUnit("袋");
            order.setUnitPrice(new java.math.BigDecimal("15.00"));
            order.setRemark(seq % 5 == 0 ? "放门口" : null);
            order.setStatus("pending");
            order.setCreatedAt(LocalDateTime.now().minusMinutes(seq));
            batch.add(order);
            used += qty;
            seq++;
        }
        orderRepository.saveAll(batch);
        pub.setRemainBags(Math.max(0, totalBags - used));
        publicationRepository.save(pub);
        log.info("小区演示数据: pubId={}, orders={}, remain={}", DEMO_PUB_ID, batch.size(), pub.getRemainBags());
    }

    private void seedNationwideDemo(AdminEntity admin) {
        int totalBags = 200;
        PublicationEntity pub = new PublicationEntity();
        pub.setId(DEMO_NATION_PUB_ID);
        pub.setTitle("全国特产礼盒");
        pub.setImageUrl(null);
        pub.setTotalBags(totalBags);
        pub.setRemainBags(totalBags);
        pub.setUnit("箱");
        pub.setUnitPrice(new java.math.BigDecimal("68.00"));
        pub.setScope(PublicationService.SCOPE_NATIONWIDE);
        pub.setCommunityId(null);
        pub.setCommunityName("全国");
        pub.setPhaseId(null);
        pub.setPhaseName(null);
        pub.setStatus("active");
        pub.setAdminId(admin.getId());
        pub.setAdminName(admin.getDisplayName());
        pub.setCreatedAt(LocalDateTime.now());
        publicationRepository.save(pub);

        Object[][] rows = {
                {"湖北省", "武汉市武昌区中南路1号", "13800001111", "小明", 1, "pending"},
                {"湖北省", "宜昌市西陵区东山大道88号", "13800002222", "阿华", 2, "pending"},
                {"湖北省", "襄阳市樊城区长虹路66号", "13800003333", "襄襄", 1, "paid"},
                {"湖南省", "长沙市岳麓区麓山南路66号", "13900003333", "晓芳", 1, "pending"},
                {"湖南省", "株洲市天元区泰山路18号", "13900004444", "株株", 2, "paid"},
                {"广东省", "广州市天河区体育西路100号", "13700004444", "阿杰", 3, "pending"},
                {"广东省", "深圳市南山区科技园南路9号", "13600005555", "小美", 1, "paid"},
                {"广东省", "东莞市南城区鸿福路1号", "13600006666", "莞莞", 2, "pending"},
                {"浙江省", "杭州市西湖区文三路200号", "13500006666", "老王", 2, "pending"},
                {"浙江省", "宁波市海曙区中山西路88号", "13500007777", "宁宁", 1, "paid"},
                {"江苏省", "南京市鼓楼区中山路50号", "13400007777", "小李", 1, "pending"},
                {"江苏省", "苏州市姑苏区干将东路120号", "13400008888", "苏苏", 2, "paid"},
                {"北京市", "朝阳区建国路88号", "13300008888", "北北", 2, "pending"},
                {"上海市", "浦东新区陆家嘴环路1000号", "13200009999", "沪沪", 1, "paid"},
                {"四川省", "成都市武侯区人民南路四段", "13100001010", "川川", 2, "pending"},
                {"重庆市", "渝中区解放碑步行街1号", "13100002020", "渝渝", 1, "paid"},
                {"福建省", "厦门市思明区中山路99号", "13000003030", "厦厦", 2, "pending"},
                {"山东省", "青岛市市南区香港中路10号", "13000004040", "青青", 1, "pending"}
        };

        java.math.BigDecimal price = new java.math.BigDecimal("68.00");
        int used = 0;
        List<OrderEntity> batch = new ArrayList<>();
        for (int i = 0; i < rows.length; i++) {
            Object[] row = rows[i];
            int qty = (Integer) row[4];
            String status = (String) row[5];
            OrderEntity order = new OrderEntity();
            order.setId("ord_nation_" + String.format("%03d", i + 1));
            order.setPublicationId(DEMO_NATION_PUB_ID);
            order.setUserId("user_nation_" + (i + 1));
            order.setUserName((String) row[3]);
            order.setPhone((String) row[2]);
            order.setAddress((String) row[1]);
            order.setProvince((String) row[0]);
            order.setQuantity(qty);
            order.setQtyUnit("箱");
            order.setUnitPrice(price);
            order.setRemark(i % 3 == 0 ? "周末收件" : null);
            order.setStatus(status);
            order.setCreatedAt(LocalDateTime.now().minusHours(i + 1));
            if ("paid".equals(status)) {
                java.math.BigDecimal amount = price.multiply(java.math.BigDecimal.valueOf(qty));
                order.setPayAmount(amount);
                order.setPayMethod(i % 2 == 0 ? "wechat" : "alipay");
                order.setPayVerifiedAt(LocalDateTime.now().minusMinutes(30 + i));
            }
            batch.add(order);
            used += qty;
        }
        orderRepository.saveAll(batch);
        pub.setRemainBags(Math.max(0, totalBags - used));
        publicationRepository.save(pub);
        log.info("全国演示数据: pubId={}, orders={}, remain={}", DEMO_NATION_PUB_ID, batch.size(), pub.getRemainBags());
    }
}
