package com.hycbox.dto.resp;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 发布物品 AI 详情：首次生成后落库，后续直接读缓存。
 */
@Data
public class PublicationAiDetailResp {

    private String publicationId;
    private String title;
    /** 详情正文 */
    private String content;
    /** true=命中缓存，未再次调用 AI */
    private boolean cached;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss", timezone = "GMT+8")
    private LocalDateTime updatedAt;
}
