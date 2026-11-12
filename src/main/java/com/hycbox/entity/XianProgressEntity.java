package com.hycbox.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 仙途游戏进度：按小程序用户 id（wx_user.id）一人一条。
 */
@Data
@Entity
@Table(name = "xian_progress")
public class XianProgressEntity {

    /** 与 wx_user.id 对齐 */
    @Id
    @Column(name = "user_id", length = 64)
    private String userId;

    /** 当前境界等级（凡人=1） */
    @Column(name = "realm_lv")
    private Integer realmLv;

    @Column(name = "kills")
    private Integer kills;

    @Column(name = "sword_count")
    private Integer swordCount;

    @Column(name = "wave")
    private Integer wave;

    @Column(name = "corpse_dan")
    private Integer corpseDan;

    /** 凡人吸纳灵气进度 0~100 */
    @Column(name = "qi_absorb")
    private Integer qiAbsorb;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
