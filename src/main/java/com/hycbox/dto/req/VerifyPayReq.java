package com.hycbox.dto.req;

import lombok.Data;

import java.math.BigDecimal;

/**
 * 物流中国：收款核实
 */
@Data
public class VerifyPayReq {

    /** 核实收款金额（元） */
    private BigDecimal payAmount;
    /** 收款方式：wechat / alipay */
    private String payMethod;
}
