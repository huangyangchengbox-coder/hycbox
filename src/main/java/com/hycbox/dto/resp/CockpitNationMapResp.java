package com.hycbox.dto.resp;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;

/**
 * 物流中国仓：按省汇总与 Top5。
 */
@Data
public class CockpitNationMapResp {

    private String publicationId;
    private String title;
    private String scope;
    private int totalOrders;
    private int totalQuantity;
    private List<CockpitProvinceStatResp> provinces = new ArrayList<>();
    private List<CockpitProvinceStatResp> top5 = new ArrayList<>();
}
