package com.hycbox.dto.req;

import lombok.Data;

import java.math.BigDecimal;

@Data
public class CompleteOrderReq {

    /** 实际派送数量，可不传，默认等于原订单数量 */
    private Integer deliveredQuantity;
    /** 收款金额（元），默认=单价×实送数量 */
    private BigDecimal payAmount;
    /** 收款方式：wechat / alipay */
    private String payMethod;
}
