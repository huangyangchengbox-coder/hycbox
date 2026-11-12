package com.hycbox.dto.resp;

import lombok.Data;

/**
 * Cloudflare Workers AI 对话响应（返回前端展示）。
 */
@Data
public class CloudflareChatResp {

    private String model;
    /** 模型文本回复 */
    private String response;
    private boolean success;
}
