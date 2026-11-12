package com.hycbox.dto.req;

import lombok.Data;

import java.util.List;

/**
 * NVIDIA NIM 对话请求（管理端）。
 * OpenAI 兼容：优先 messages；为空时用 prompt 单轮提问。
 * 参考：https://build.nvidia.com/explore/discover
 */
@Data
public class NvidiaNimChatReq {

    /** 模型名，如 meta/llama-3.1-8b-instruct */
    private String model;
    /** 单轮提示词 */
    private String prompt;
    /** 多轮消息 */
    private List<ChatMessage> messages;
    /** 最大生成 token，可选 */
    private Integer maxTokens;
    /** 温度，可选 */
    private Double temperature;

    @Data
    public static class ChatMessage {
        /** system / user / assistant */
        private String role;
        private String content;
    }
}
