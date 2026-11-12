package com.hycbox.dto.resp;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class AiMediaJobResp {

    private String id;
    private String mediaType;
    private String prompt;
    private String model;
    private String reqSize;
    private Integer reqN;
    private String reqSeconds;
    private String status;
    private String resultUrl;
    private String remoteUrl;
    private String remoteJobId;
    private String errorMsg;
    private String adminId;
    private String adminName;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss", timezone = "GMT+8")
    private LocalDateTime createdAt;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss", timezone = "GMT+8")
    private LocalDateTime updatedAt;
}
