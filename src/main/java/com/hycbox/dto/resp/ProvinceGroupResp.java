package com.hycbox.dto.resp;

import lombok.Data;

import java.util.List;

/**
 * 物流中国：按省分组的待发货列表
 */
@Data
public class ProvinceGroupResp {

    private String province;
    private Integer orderCount;
    private Integer totalQuantity;
    private List<OrderResp> orders;
}
