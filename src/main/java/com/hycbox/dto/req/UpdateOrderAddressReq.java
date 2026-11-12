package com.hycbox.dto.req;

import lombok.Data;

/**
 * 小区闪送：待配送订单修改派送门牌。
 */
@Data
public class UpdateOrderAddressReq {

    /** 新门牌 ID */
    private String roomId;
    /** 当前用户，用于校验归属 */
    private String userId;
}
