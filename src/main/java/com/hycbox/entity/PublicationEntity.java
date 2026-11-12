package com.hycbox.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "publication")
public class PublicationEntity {

    @Id
    private String id;

    private String title;

    @Column(name = "image_url", length = 2000)
    private String imageUrl;

    @Column(name = "total_bags")
    private Integer totalBags;

    @Column(name = "remain_bags")
    private Integer remainBags;

    /** 乐观锁版本，配合条件更新防超卖 */
    @Version
    @Column(name = "version")
    private Long version;

    /** 计量单位：袋 / 箱 / 个 / 份 等 */
    @Column(length = 16)
    private String unit;

    /** 单价（元） */
    @Column(name = "unit_price", precision = 10, scale = 2)
    private java.math.BigDecimal unitPrice;

    /**
     * 发布地域：community=小区闪送，nationwide=物流中国（全国）
     * 旧数据为空时按 community 处理
     */
    @Column(length = 32)
    private String scope;

    /** 所属小区（仅小区闪送） */
    @Column(name = "community_id", length = 64)
    private String communityId;

    @Column(name = "community_name", length = 128)
    private String communityName;

    /** 期数，可空：无期数的小区或发布面向全部期 */
    @Column(name = "phase_id", length = 64)
    private String phaseId;

    @Column(name = "phase_name", length = 64)
    private String phaseName;

    private String status;

    @Column(name = "admin_id")
    private String adminId;

    @Column(name = "admin_name")
    private String adminName;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    /**
     * AI 生成的物品详情文案（按发布缓存；图片变更后指纹不一致会重生成）。
     */
    @Column(name = "ai_detail_text", columnDefinition = "TEXT")
    private String aiDetailText;

    /** 生成详情时对应的图片 URL 指纹，用于判断缓存是否仍有效 */
    @Column(name = "ai_detail_image_fp", length = 64)
    private String aiDetailImageFp;

    @Column(name = "ai_detail_at")
    private LocalDateTime aiDetailAt;
}
