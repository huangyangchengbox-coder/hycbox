package com.hycbox.repository;

import com.hycbox.entity.WxUserEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface WxUserRepository extends JpaRepository<WxUserEntity, String> {

    Optional<WxUserEntity> findByOpenid(String openid);
}
