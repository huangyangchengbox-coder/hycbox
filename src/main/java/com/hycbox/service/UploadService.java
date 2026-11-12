package com.hycbox.service;

import com.hycbox.exception.BizException;
import com.hycbox.storage.FileStorage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class UploadService {

    private static final Set<String> ALLOWED_EXT = Set.of(".jpg", ".jpeg", ".png", ".gif", ".webp");

    private final FileStorage fileStorage;

    /**
     * 校验图片并交由 FileStorage 落库（本地或 SeaweedFS），返回公网 URL。
     */
    public String upload(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BizException("请选择图片");
        }
        String ext = resolveExt(file.getOriginalFilename(), file.getContentType());
        if (!ALLOWED_EXT.contains(ext)) {
            throw new BizException("仅支持 jpg/png/gif/webp 图片");
        }
        String filename = UUID.randomUUID().toString().replace("-", "") + ext;
        return storeFile(filename, file);
    }

    /**
     * 固定路径上传（如 game/xian/grass.png），供小游戏静态资源复用。
     * key 仅允许 game/ 下字母数字与 ./_-。
     */
    public String uploadStatic(String objectKey, MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BizException("请选择图片");
        }
        if (!StringUtils.hasText(objectKey)) {
            throw new BizException("缺少 objectKey");
        }
        String key = objectKey.trim().replace('\\', '/');
        while (key.startsWith("/")) {
            key = key.substring(1);
        }
        if (!key.matches("^game/[a-zA-Z0-9._/-]+$") || key.contains("..")) {
            throw new BizException("objectKey 非法");
        }
        String ext = resolveExt(key, file.getContentType());
        if (!ALLOWED_EXT.contains(ext)) {
            throw new BizException("仅支持 jpg/png/gif/webp 图片");
        }
        return storeFile(key, file);
    }

    private String storeFile(String objectKey, MultipartFile file) {
        try {
            return fileStorage.store(objectKey, file.getInputStream(), file.getSize(), file.getContentType());
        } catch (BizException e) {
            throw e;
        } catch (IOException e) {
            log.error("图片上传失败: file={}", objectKey, e);
            throw new BizException("图片上传失败");
        }
    }

    private String resolveExt(String originalFilename, String contentType) {
        String ext = ".jpg";
        if (StringUtils.hasText(originalFilename) && originalFilename.contains(".")) {
            ext = originalFilename.substring(originalFilename.lastIndexOf('.')).toLowerCase(Locale.ROOT);
        } else if (StringUtils.hasText(contentType)) {
            if (contentType.contains("png")) {
                ext = ".png";
            } else if (contentType.contains("gif")) {
                ext = ".gif";
            } else if (contentType.contains("webp")) {
                ext = ".webp";
            }
        }
        return ext;
    }
}
