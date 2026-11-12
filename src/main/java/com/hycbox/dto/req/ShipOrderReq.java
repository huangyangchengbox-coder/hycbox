package com.hycbox.dto.req;

import lombok.Data;

import java.util.List;

/**
 * 物流中国发货：一人可多件快递，凭证图支持多张（先走 /upload）。
 */
@Data
public class ShipOrderReq {

    /** 多张发货凭证 */
    private List<String> shipImageUrls;

    /** 兼容旧客户端：单张凭证 */
    private String shipImageUrl;
}
