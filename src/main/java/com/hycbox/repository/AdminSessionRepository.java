package com.hycbox.repository;

import com.hycbox.entity.AdminSessionEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface AdminSessionRepository extends JpaRepository<AdminSessionEntity, String> {

    Optional<AdminSessionEntity> findByToken(String token);

    List<AdminSessionEntity> findByAdminIdOrderByCreatedAtAsc(String adminId);

    void deleteByAdminId(String adminId);

    void deleteByToken(String token);
}
