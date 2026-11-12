package com.hycbox.storage;

import com.hycbox.config.HycBoxProperties;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;

/**
 * 本地磁盘存储（兼容原有 ./uploads + nginx 静态目录方案）。
 */
@Slf4j
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(prefix = "hycbox", name = "storage-type", havingValue = "local", matchIfMissing = true)
public class LocalFileStorage implements FileStorage {

    private final HycBoxProperties properties;

    @Override
    public String store(String objectKey, InputStream data, long size, String contentType) throws IOException {
        Path uploadDir = Paths.get(properties.getUploadDir()).toAbsolutePath().normalize();
        if (!Files.exists(uploadDir)) {
            Files.createDirectories(uploadDir);
        }
        // 允许 game/xian/... 这类静态资源子路径，禁止跳出 uploads 根目录
        Path target = uploadDir.resolve(objectKey).normalize();
        if (!target.startsWith(uploadDir)) {
            throw new IOException("非法对象键: " + objectKey);
        }
        Path parent = target.getParent();
        if (parent != null && !Files.exists(parent)) {
            Files.createDirectories(parent);
        }
        Files.copy(data, target, StandardCopyOption.REPLACE_EXISTING);
        String url = buildPublicUrl(objectKey);
        log.info("本地存储成功: key={}, size={}, url={}", objectKey, size, url);
        return url;
    }

    private String buildPublicUrl(String objectKey) {
        String base = properties.getUploadPublicUrl();
        if (!StringUtils.hasText(base)) {
            base = properties.getPublicBaseUrl().replaceAll("/api/?$", "") + "/uploads";
        }
        return base.replaceAll("/$", "") + "/" + objectKey;
    }
}
