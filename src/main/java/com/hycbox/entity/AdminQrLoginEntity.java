package com.hycbox.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * Web 管理端扫码登录票据：小程序确认后为 Web 签发 session。
 */
@Data
@Entity
@Table(name = "admin_qr_login")
public class AdminQrLoginEntity {

    @Id
    @Column(length = 32)
    private String ticket;

    /** pending / scanned / confirmed / expired / consumed */
    @Column(nullable = false, length = 16)
    private String status;

    @Column(name = "admin_id", length = 64)
    private String adminId;

    /** 确认后为 Web 签发的 token */
    @Column(length = 64)
    private String webToken;

    @Column(name = "token_expire_at")
    private Long tokenExpireAt;

    @Column(length = 16)
    private String role;

    @Column(length = 64)
    private String username;

    @Column(name = "display_name", length = 64)
    private String displayName;

    @Column(name = "super_admin")
    private Boolean superAdmin;

    /** 票据过期时间（毫秒时间戳） */
    @Column(name = "expire_at", nullable = false)
    private Long expireAt;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "confirmed_at")
    private LocalDateTime confirmedAt;
}
