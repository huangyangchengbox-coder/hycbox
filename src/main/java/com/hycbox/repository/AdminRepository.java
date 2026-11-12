package com.hycbox.repository;

import com.hycbox.entity.AdminEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface AdminRepository extends JpaRepository<AdminEntity, String> {

    Optional<AdminEntity> findByUsernameAndStatus(String username, String status);

    Optional<AdminEntity> findByTokenAndStatus(String token, String status);

    /** 已绑定小程序 openid 的启用管理员（扫码确认 Web 登录） */
    Optional<AdminEntity> findByWxOpenidAndStatus(String wxOpenid, String status);
}
