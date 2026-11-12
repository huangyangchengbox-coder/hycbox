package com.hycbox.dto.resp;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
public class OrderResp {

    private String id;
    private String publicationId;
    private String userId;
    private String userName;
    private String roomId;
    private String roomLabel;
    private String buildingName;
    private String phaseName;
    private Integer unit;
    private String roomNo;
    private Integer quantity;
    /** 实际送达数量（完成后有值，可大于申请数） */
    private Integer deliveredQuantity;
    /** 超出申请数 = max(0, deliveredQuantity - quantity) */
    private Integer extraQuantity;
    /** 计量单位：袋/箱/个等 */
    private String qtyUnit;
    /** 所属发布标题（配送列表展示用） */
    private String publicationTitle;
    /** 所属发布图片（用户看登记信息用，缩略图可点大图） */
    private List<String> publicationImages;
    private String remark;
    /** 物流中国字段 */
    private String phone;
    private String address;
    private String province;
    /** 村村送：收货坐标与选点名称 */
    private Double locationLat;
    private Double locationLng;
    private String locationName;
    /** 兼容：首张发货凭证 */
    private String shipImageUrl;
    /** 发货凭证（可多张，一人多件快递） */
    private List<String> shipImages;
    private String afterSaleRemark;
    private List<String> afterSaleImages;
    /** 单价快照（元） */
    private java.math.BigDecimal unitPrice;
    /** 收款金额（元） */
    private java.math.BigDecimal payAmount;
    /** wechat / alipay */
    private String payMethod;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss", timezone = "GMT+8")
    private LocalDateTime payVerifiedAt;

    private String status;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss", timezone = "GMT+8")
    private LocalDateTime createdAt;

    /** 小区闪送=送达时间；物流中国=发货时间 */
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss", timezone = "GMT+8")
    private LocalDateTime deliveredAt;
}
