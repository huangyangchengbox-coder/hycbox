package com.hycbox.dto.resp;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AdminLoginResp {

    private String token;
    private String role;
    private String adminId;
    private String username;
    private String displayName;
    private Boolean superAdmin;
    /** token 过期时间（毫秒时间戳） */
    private Long expireAt;
}
