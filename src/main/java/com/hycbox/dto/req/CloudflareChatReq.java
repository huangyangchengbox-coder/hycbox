package com.hycbox.dto.req;

import lombok.Data;

import java.util.List;

/**
 * Cloudflare Workers AI 对话请求（管理端）。
 * 优先用 messages；为空时用 prompt 单轮提问。
 */
@Data
public class CloudflareChatReq {

    /** 模型名，如 @cf/meta/llama-3.1-8b-instruct */
    private String model;
    /** 单轮提示词 */
    private String prompt;
    /** 多轮消息 */
    private List<ChatMessage> messages;

    @Data
    public static class ChatMessage {
        /** system / user / assistant */
        private String role;
        private String content;
    }
}
