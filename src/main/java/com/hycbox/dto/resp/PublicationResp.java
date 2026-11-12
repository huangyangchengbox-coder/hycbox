package com.hycbox.dto.resp;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class PublicationResp {

    private String id;
    private String title;
    /** 封面图（多图时取第一张，兼容旧前端） */
    private String imageUrl;
    /** 全部图片 */
    private java.util.List<String> images;
    private Integer totalBags;
    private Integer remainBags;
    /** 计量单位：袋/箱/个等 */
    private String unit;
    /** 单价（元） */
    private java.math.BigDecimal unitPrice;
    /** community=小区闪送，nationwide=物流中国 */
    private String scope;
    private String communityId;
    private String communityName;
    private String phaseId;
    private String phaseName;
    private String status;
    private String adminId;
    private String adminName;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss", timezone = "GMT+8")
    private LocalDateTime createdAt;

    /** 是否已缓存可用的 AI 物品详情（列表可展示角标） */
    private boolean hasAiDetail;
}
