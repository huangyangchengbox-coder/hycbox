package com.hycbox.dto.resp;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AdminQrLoginCreateResp {

    private String ticket;
    /** 票据过期时间（毫秒时间戳） */
    private Long expireAt;
    /** 小程序码 PNG，Base64（不含 data: 前缀） */
    private String qrImageBase64;
}
