package com.hycbox.dto.resp;

import lombok.Data;

import java.util.List;

@Data
public class BuildingGroupResp {

    private String phaseName;
    private String buildingName;
    /** 单元号 */
    private Integer unit;
    private Integer totalBags;
    private Integer orderCount;
    private List<OrderResp> orders;
}
