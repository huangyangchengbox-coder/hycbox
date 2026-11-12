package com.hycbox.dto.resp;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
public class AdminNoticeResp {

    private String id;
    /** order_create / address_change */
    private String type;
    private String title;
    private String content;
    private String orderId;
    private String publicationId;
    private Integer readFlag;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss", timezone = "GMT+8")
    private LocalDateTime createdAt;
}
