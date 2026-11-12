package com.hycbox.dto.resp;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AdminQrLoginStatusResp {

    /** pending / scanned / confirmed / expired / consumed */
    private String status;
    /** 票据过期时间（毫秒时间戳） */
    private Long expireAt;
    /** status=confirmed 且首次轮询时返回 */
    private AdminLoginResp login;
}
