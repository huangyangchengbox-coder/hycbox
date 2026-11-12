package com.hycbox.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 管理员登录会话：同一账号可同时保留 Web / 小程序等多个有效 token。
 */
@Data
@Entity
@Table(name = "admin_session")
public class AdminSessionEntity {

    @Id
    private String id;

    @Column(name = "admin_id", nullable = false, length = 64)
    private String adminId;

    @Column(nullable = false, unique = true, length = 64)
    private String token;

    /** 过期时间（毫秒时间戳） */
    @Column(name = "expire_at", nullable = false)
    private Long expireAt;

    /** web / mp / other，仅作区分，不参与鉴权 */
    @Column(length = 16)
    private String client;

    @Column(name = "created_at")
    private LocalDateTime createdAt;
}
