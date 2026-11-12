package com.hycbox.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 全国行政区划名录（省/市/区县），来源阿里云 DataV GeoAtlas areas_v3。
 * 当前只存编码与中心点，边界多边形留给后期「经纬度反查」。
 */
@Data
@Entity
@Table(name = "admin_region", indexes = {
        @Index(name = "idx_region_parent", columnList = "parent_adcode"),
        @Index(name = "idx_region_level", columnList = "level")
})
public class RegionEntity {

    /** 行政区划代码，如 420100 */
    @Id
    @Column(length = 12)
    private String adcode;

    /** 名称，如 武汉市 */
    @Column(nullable = false, length = 64)
    private String name;

    /**
     * 层级：1省 2市 3区县。
     * 对应 DataV properties.level = province/city/district。
     */
    @Column(nullable = false)
    private Integer level;

    /** 上级 adcode；省级的上级为 100000 */
    @Column(name = "parent_adcode", length = 12)
    private String parentAdcode;

    /** DataV 原始 level 文案，便于排查 */
    @Column(name = "level_name", length = 16)
    private String levelName;

    /** 下级数量（导入时快照） */
    @Column(name = "children_num")
    private Integer childrenNum;

    /** 区域中心经度（GCJ-02，与微信地图一致） */
    @Column(name = "center_lng")
    private Double centerLng;

    /** 区域中心纬度（GCJ-02） */
    @Column(name = "center_lat")
    private Double centerLat;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
