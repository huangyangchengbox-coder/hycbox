package com.hycbox.dto.resp;

import lombok.Data;

/**
 * 物流中国仓：单省订单统计。
 */
@Data
public class CockpitProvinceStatResp {

    /** 订单原始省份文案 */
    private String province;
    /** 对齐中国地图 GeoJSON 的名称（如 湖北省） */
    private String mapName;
    private int orderCount;
    private int totalQuantity;
}
