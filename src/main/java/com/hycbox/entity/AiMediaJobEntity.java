package com.hycbox.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 管理员 AI 图片/视频生成任务。
 */
@Data
@Entity
@Table(name = "ai_media_job")
public class AiMediaJobEntity {

    @Id
    private String id;

    /** image | video */
    @Column(name = "media_type", nullable = false, length = 16)
    private String mediaType;

    @Column(columnDefinition = "TEXT")
    private String prompt;

    @Column(length = 64)
    private String model;

    @Column(name = "req_size", length = 32)
    private String reqSize;

    @Column(name = "req_n")
    private Integer reqN;

    @Column(name = "req_seconds", length = 8)
    private String reqSeconds;

    /** pending | running | succeeded | failed */
    @Column(length = 16)
    private String status;

    @Column(name = "result_url", length = 2000)
    private String resultUrl;

    @Column(name = "remote_url", length = 2000)
    private String remoteUrl;

    @Column(name = "remote_job_id", length = 128)
    private String remoteJobId;

    @Column(name = "error_msg", length = 500)
    private String errorMsg;

    @Column(name = "admin_id", length = 64)
    private String adminId;

    @Column(name = "admin_name", length = 64)
    private String adminName;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    /** Agnes 原始响应（截断保存） */
    @Column(name = "raw_response", columnDefinition = "TEXT")
    private String rawResponse;
}
