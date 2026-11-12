package com.hycbox.service;

import com.hycbox.entity.AppConfigEntity;
import com.hycbox.repository.AppConfigRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/**
 * 应用级键值配置：读写布尔/字符串，供功能开关等复用。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AppConfigService {

    private final AppConfigRepository appConfigRepository;

    public String getString(String key, String defaultValue) {
        return appConfigRepository.findById(key)
                .map(AppConfigEntity::getConfigValue)
                .orElse(defaultValue);
    }

    public boolean getBoolean(String key, boolean defaultValue) {
        String raw = getString(key, null);
        if (raw == null || raw.isBlank()) {
            return defaultValue;
        }
        return "1".equals(raw) || "true".equalsIgnoreCase(raw.trim());
    }

    @Transactional
    public void setBoolean(String key, boolean value, String updatedBy) {
        AppConfigEntity entity = appConfigRepository.findById(key).orElseGet(AppConfigEntity::new);
        entity.setConfigKey(key);
        entity.setConfigValue(value ? "1" : "0");
        entity.setUpdatedAt(LocalDateTime.now());
        entity.setUpdatedBy(updatedBy == null ? "" : updatedBy);
        appConfigRepository.save(entity);
        log.info("app_config 更新: key={} value={} by={}", key, entity.getConfigValue(), updatedBy);
    }

    /** 多键中最近一次更新时间；均无则 null */
    public LocalDateTime latestUpdatedAt(String... keys) {
        LocalDateTime latest = null;
        for (String key : keys) {
            LocalDateTime at = appConfigRepository.findById(key)
                    .map(AppConfigEntity::getUpdatedAt)
                    .orElse(null);
            if (at != null && (latest == null || at.isAfter(latest))) {
                latest = at;
            }
        }
        return latest;
    }
}
