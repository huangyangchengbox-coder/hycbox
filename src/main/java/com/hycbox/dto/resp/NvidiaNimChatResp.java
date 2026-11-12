package com.hycbox.dto.resp;

import lombok.Data;

/**
 * NVIDIA NIM 对话响应（返回前端展示）。
 */
@Data
public class NvidiaNimChatResp {

    private String model;
    /** 模型文本回复 */
    private String response;
    private boolean success;
}
