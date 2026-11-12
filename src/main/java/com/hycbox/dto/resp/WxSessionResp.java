package com.hycbox.dto.resp;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class WxSessionResp {

    private String openid;
    private String userId;
    /** user / admin */
    private String lastRole;
}
