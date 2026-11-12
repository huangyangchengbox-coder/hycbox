package com.hycbox.dto.req;

import lombok.Data;

/** 管理员配置首页/工具业务入口显隐（前端传入可信） */
@Data
public class HubEntryUpdateReq {

    private Boolean flash;
    private Boolean express;
    private Boolean village;
    /** 工具·仙途 */
    private Boolean xian;
}
