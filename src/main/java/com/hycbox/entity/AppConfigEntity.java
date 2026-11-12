package com.hycbox.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 通用键值配置（可扩容：首页入口、功能开关等）。
 */
@Data
@Entity
@Table(name = "app_config")
public class AppConfigEntity {

    @Id
    @Column(name = "config_key", length = 64)
    private String configKey;

    @Column(name = "config_value", length = 512)
    private String configValue;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "updated_by", length = 64)
    private String updatedBy;
}
