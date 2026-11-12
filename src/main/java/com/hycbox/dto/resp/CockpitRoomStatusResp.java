package com.hycbox.dto.resp;

import lombok.Data;

/**
 * 驾驶舱：房间配送状态（仅有订单的房间）。
 */
@Data
public class CockpitRoomStatusResp {

    private String roomId;
    private String roomLabel;
    private String phaseId;
    private String phaseName;
    private String buildingId;
    private String buildingName;
    private Integer unit;
    private String roomNo;
    /** 从房号解析的楼层，如 1501 → 15 */
    private Integer floor;
    /** pending | completed */
    private String status;
    private Integer quantity;
    private String orderId;
}
