package com.hycbox.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "fruit_order")
public class OrderEntity {

    @Id
    private String id;

    @Column(name = "publication_id")
    private String publicationId;

    @Column(name = "user_id")
    private String userId;

    @Column(name = "user_name")
    private String userName;

    @Column(name = "room_id")
    private String roomId;

    @Column(name = "room_label")
    private String roomLabel;

    @Column(name = "building_name")
    private String buildingName;

    @Column(name = "phase_name")
    private String phaseName;

    /** 单元号 */
    private Integer unit;

    /** 门牌号，如 1501 */
    @Column(name = "room_no", length = 16)
    private String roomNo;

    private Integer quantity;

    /** 实际送达数量；完成后写入，可大于申请数 */
    @Column(name = "delivered_quantity")
    private Integer deliveredQuantity;

    /** 计量单位（发布时选定，下单时写入；与门牌 unit 单元号区分） */
    @Column(name = "qty_unit", length = 16)
    private String qtyUnit;

    /** 用户备注 */
    @Column(length = 200)
    private String remark;

    /** 物流中国：手机号 */
    @Column(length = 20)
    private String phone;

    /** 物流中国：收货地址全文 */
    @Column(length = 500)
    private String address;

    /** 物流中国：省份（列表按省分类） */
    @Column(length = 32)
    private String province;

    /** 村村送：收货点纬度（gcj02） */
    @Column(name = "location_lat")
    private Double locationLat;

    /** 村村送：收货点经度（gcj02） */
    @Column(name = "location_lng")
    private Double locationLng;

    /** 村村送：地图选点名称 */
    @Column(name = "location_name", length = 120)
    private String locationName;

    /** 物流中国：发货凭证图，多张用英文逗号分隔（一人可多件快递） */
    @Column(name = "ship_image_url", length = 2000)
    private String shipImageUrl;

    /** 物流中国：售后备注 */
    @Column(name = "after_sale_remark", length = 500)
    private String afterSaleRemark;

    /** 物流中国：售后图片，多张用英文逗号分隔 */
    @Column(name = "after_sale_images", length = 2000)
    private String afterSaleImages;

    /** 下单时快照单价（元） */
    @Column(name = "unit_price", precision = 10, scale = 2)
    private java.math.BigDecimal unitPrice;

    /** 收款金额（元） */
    @Column(name = "pay_amount", precision = 10, scale = 2)
    private java.math.BigDecimal payAmount;

    /** 收款方式：wechat / alipay */
    @Column(name = "pay_method", length = 16)
    private String payMethod;

    /** 全国：收款核实时间 */
    @Column(name = "pay_verified_at")
    private LocalDateTime payVerifiedAt;

    /**
     * 状态：
     * 小区闪送 / 村村送 pending/completed/cancelled；
     * 物流中国 pending(待核实)/paid(待发货)/shipped/cancelled
     */
    private String status;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "delivered_at")
    private LocalDateTime deliveredAt;
}
