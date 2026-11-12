package com.hycbox.dto.req;

import lombok.Data;

@Data
public class CreateAdminReq {

    private String username;
    private String password;
    private String displayName;
}
