package com.hycbox.repository;

import com.hycbox.entity.RegionEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RegionRepository extends JpaRepository<RegionEntity, String> {

    List<RegionEntity> findByParentAdcodeOrderByAdcodeAsc(String parentAdcode);

    List<RegionEntity> findByLevelOrderByAdcodeAsc(Integer level);

    long countByLevel(Integer level);
}
