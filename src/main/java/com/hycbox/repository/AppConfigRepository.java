package com.hycbox.repository;

import com.hycbox.entity.AppConfigEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AppConfigRepository extends JpaRepository<AppConfigEntity, String> {
}
