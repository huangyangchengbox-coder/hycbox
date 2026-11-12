package com.hycbox.dto.req;

import lombok.Data;

import java.math.BigDecimal;

/**
 * 管理者修改进行中发布的标题/单价/总库存（已售出部分不可压穿）。
 */
@Data
public class UpdatePublicationReq {

    private String title;
    private BigDecimal unitPrice;
    /** 总库存；已售 = totalBags - remainBags，新总量不得小于已售 */
    private Integer totalBags;
}
