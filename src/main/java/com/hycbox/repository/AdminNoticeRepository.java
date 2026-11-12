package com.hycbox.repository;

import com.hycbox.entity.AdminNoticeEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AdminNoticeRepository extends JpaRepository<AdminNoticeEntity, String> {

    long countByAdminIdAndReadFlag(String adminId, Integer readFlag);

    List<AdminNoticeEntity> findByAdminIdAndReadFlagOrderByCreatedAtDesc(String adminId, Integer readFlag);

    List<AdminNoticeEntity> findByAdminIdOrderByCreatedAtDesc(String adminId);
}
