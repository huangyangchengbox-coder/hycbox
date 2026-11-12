package com.hycbox.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "admin_user")
public class AdminEntity {

    @Id
    private String id;

    @Column(unique = true, nullable = false)
    private String username;

    @Column(nullable = false)
    private String password;

    @Column(name = "display_name")
    private String displayName;

    /** super / admin */
    private String role;

    private String status;

    /** 登录 token，落库以便重启后仍有效 */
    @Column(name = "token")
    private String token;

    /** token 过期时间（毫秒时间戳） */
    @Column(name = "token_expire_at")
    private Long tokenExpireAt;

    /** 绑定的小程序 openid，用于订阅消息推送 */
    @Column(name = "wx_openid", length = 64)
    private String wxOpenid;

    /**
     * 一次性订阅消息剩余可推送次数。
     * 管理员每次授权 +1，成功推送 -1。
     */
    @Column(name = "subscribe_quota")
    private Integer subscribeQuota;

    /** 配送中是否向用户分享实时位置 */
    @Column(name = "location_sharing")
    private Boolean locationSharing;

    @Column(name = "location_lat")
    private Double locationLat;

    @Column(name = "location_lng")
    private Double locationLng;

    @Column(name = "location_at")
    private LocalDateTime locationAt;

    @Column(name = "created_at")
    private LocalDateTime createdAt;
}
