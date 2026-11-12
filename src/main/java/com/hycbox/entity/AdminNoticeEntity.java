package com.hycbox.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 管理员站内通知：用户登记 / 改地址时推给发布所属管理员。
 */
@Data
@Entity
@Table(name = "admin_notice")
public class AdminNoticeEntity {

    @Id
    private String id;

    @Column(name = "admin_id", nullable = false, length = 64)
    private String adminId;

    /** order_create / address_change */
    @Column(length = 32)
    private String type;

    @Column(length = 64)
    private String title;

    @Column(length = 255)
    private String content;

    @Column(name = "order_id", length = 64)
    private String orderId;

    @Column(name = "publication_id", length = 64)
    private String publicationId;

    /** 0未读 1已读 */
    @Column(name = "read_flag")
    private Integer readFlag;

    @Column(name = "created_at")
    private LocalDateTime createdAt;
}
