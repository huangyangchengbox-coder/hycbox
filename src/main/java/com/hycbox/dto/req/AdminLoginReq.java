package com.hycbox.dto.req;

import lombok.Data;

@Data
public class AdminLoginReq {

    private String username;
    private String password;
    /** 可选：web / mp，用于多端会话区分，互不影响 */
    private String client;
}
