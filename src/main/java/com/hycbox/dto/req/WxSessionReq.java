package com.hycbox.dto.req;

import lombok.Data;

@Data
public class WxSessionReq {

    /** wx.login 拿到的 code */
    private String code;
}
