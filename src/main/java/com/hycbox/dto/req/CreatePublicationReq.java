package com.hycbox.dto.req;

import lombok.Data;

@Data
public class CreatePublicationReq {

    private String title;
    /** 兼容单图；多图优先传 imageUrls */
    private String imageUrl;
    /** 发布多图（最多建议 9 张） */
    private java.util.List<String> imageUrls;
    private Integer totalBags;
    private String unit;
    /** 单价（元） */
    private java.math.BigDecimal unitPrice;
    /**
     * 发布地域：community=小区闪送，nationwide=物流中国
     * 不传默认 community，兼容原逻辑
     */
    private String scope;
    /** 小区 ID；scope=community 时使用 */
    private String communityId;
    /** 期数 ID，可空（无期数或全部期） */
    private String phaseId;
}
