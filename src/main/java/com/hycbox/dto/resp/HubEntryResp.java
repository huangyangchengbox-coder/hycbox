package com.hycbox.dto.resp;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Data;

import java.time.LocalDateTime;

/** 首页/工具业务入口是否对用户展示（默认全关） */
@Data
public class HubEntryResp {

    /** 小区闪送 */
    private boolean flash;
    /** 物流中国 */
    private boolean express;
    /** 村村送 */
    private boolean village;
    /** 工具·仙途 */
    private boolean xian;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss", timezone = "GMT+8")
    private LocalDateTime updatedAt;
}
