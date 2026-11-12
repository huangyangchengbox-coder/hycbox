package com.hycbox.dto.resp;

import lombok.Data;

import java.util.List;

/** 管理端轮询通知：未读条数 + 最近几条 */
@Data
public class AdminNoticePollResp {

    private long unreadCount;
    private List<AdminNoticeResp> items;
    /** 一次性订阅剩余可推送次数 */
    private int subscribeQuota;
    /** 是否已绑定微信 openid */
    private boolean wxBound;
    /** 是否需要引导重新订阅（额度用尽） */
    private boolean needSubscribe;
}
