package com.hycbox.dto.resp;

import lombok.Data;

@Data
public class AdminStatsResp {

    private Integer pendingCount;
    private Integer pendingBags;
    private Integer completedCount;
    private Integer completedBags;
    /** 超出申请的总量（实际送达 - 申请数，仅正数累计） */
    private Integer extraBags;
    /** 有超出申请的户数 */
    private Integer extraCount;
}
