package com.hycbox.dto.req;

import lombok.Data;

@Data
public class WxRoleReq {

    private String openid;
    /** user / admin */
    private String role;
}
