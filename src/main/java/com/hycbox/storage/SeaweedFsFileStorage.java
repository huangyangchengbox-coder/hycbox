package com.hycbox.storage;

import com.hycbox.config.HycBoxProperties;
import com.hycbox.exception.BizException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

/**
 * 经 SeaweedFS Filer HTTP PUT 写入对象，公网 URL 由 nginx 反代 /uploads 到 Filer。
 */
@Slf4j
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(prefix = "hycbox", name = "storage-type", havingValue = "seaweedfs")
public class SeaweedFsFileStorage implements FileStorage {

    private final HycBoxProperties properties;
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(8))
            .build();

    @Override
    public String store(String objectKey, InputStream data, long size, String contentType) throws IOException {
        HycBoxProperties.SeaweedFs cfg = properties.getSeaweedfs();
        String filerUrl = trimTrailingSlash(cfg.getFilerUrl());
        String pathPrefix = normalizePrefix(cfg.getPathPrefix());
        String putUrl = filerUrl + pathPrefix + "/" + objectKey;

        byte[] body = data.readAllBytes();
        HttpRequest.Builder builder = HttpRequest.newBuilder()
                .uri(URI.create(putUrl))
                .timeout(Duration.ofSeconds(60))
                .PUT(HttpRequest.BodyPublishers.ofByteArray(body));
        if (StringUtils.hasText(contentType)) {
            builder.header("Content-Type", contentType);
        }

        try {
            HttpResponse<String> resp = httpClient.send(builder.build(), HttpResponse.BodyHandlers.ofString());
            int code = resp.statusCode();
            if (code < 200 || code >= 300) {
                log.error("SeaweedFS 上传失败: status={}, url={}, body={}", code, putUrl, resp.body());
                throw new BizException("图片上传失败");
            }
            String url = buildPublicUrl(objectKey);
            log.info("SeaweedFS 存储成功: key={}, size={}, url={}", objectKey, size > 0 ? size : body.length, url);
            return url;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            log.error("SeaweedFS 上传被中断: url={}", putUrl, e);
            throw new BizException("图片上传失败");
        }
    }

    private String buildPublicUrl(String objectKey) {
        String base = properties.getUploadPublicUrl();
        if (!StringUtils.hasText(base)) {
            base = properties.getPublicBaseUrl().replaceAll("/api/?$", "") + "/uploads";
        }
        return base.replaceAll("/$", "") + "/" + objectKey;
    }

    private static String trimTrailingSlash(String url) {
        if (!StringUtils.hasText(url)) {
            return "http://127.0.0.1:8888";
        }
        return url.replaceAll("/$", "");
    }

    private static String normalizePrefix(String prefix) {
        if (!StringUtils.hasText(prefix)) {
            return "/uploads";
        }
        String p = prefix.startsWith("/") ? prefix : "/" + prefix;
        return p.replaceAll("/$", "");
    }
}
