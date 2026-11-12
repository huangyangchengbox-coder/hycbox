package com.hycbox.dto.req;

import lombok.Data;

@Data
public class AdminQrLoginTicketReq {

    private String ticket;

    /** 小程序 wx.login code；有则换 openid 确认 */
    private String code;

    /** 小程序 openid（前端可信，优先于 code，避免 code 换票不稳定） */
    private String openid;
}
