package com.hycbox.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 微信小程序用户，用 openid 关联，记住上次角色。
 */
@Data
@Entity
@Table(name = "wx_user")
public class WxUserEntity {

    @Id
    private String id;

    @Column(unique = true, nullable = false, length = 64)
    private String openid;

    /** user / admin */
    @Column(name = "last_role", length = 16)
    private String lastRole;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
