package com.hycbox.dto.resp;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * 用户端物品详情（普通字段，不含生成逻辑）。
 */
@Data
public class PublicationDetailResp {

    private String id;
    private String title;
    private List<String> images;
    /** 物品介绍文案（已有则展示，无则空） */
    private String description;
    private Integer totalBags;
    private Integer remainBags;
    private String unit;
    private BigDecimal unitPrice;
    private String scope;
    private String communityName;
    private String phaseName;
    private String status;
    private String adminName;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss", timezone = "GMT+8")
    private LocalDateTime createdAt;
}
