package com.hycbox.dto.req;

import lombok.Data;

/** 保存仙途进度（前端传入可信） */
@Data
public class XianProgressSaveReq {

    /** 小程序用户 id（wx_user.id） */
    private String userId;

    private Integer realmLv;
    private Integer kills;
    private Integer swordCount;
    private Integer wave;
    private Integer corpseDan;
    private Integer qiAbsorb;
}
