package com.hycbox.service;

import com.hycbox.dto.resp.PublicationAiDetailResp;
import com.hycbox.entity.PublicationEntity;
import com.hycbox.exception.BizException;
import com.hycbox.repository.PublicationRepository;
import com.hycbox.util.ImageUrlList;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.util.HexFormat;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 发布物品详情：有缓存直接返回；无缓存则调 AI 并落库，供后续用户复用。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PublicationAiDetailService {

    private final PublicationRepository publicationRepository;
    private final OpenAiCompatibleVisionService visionService;

    /** 防止同一发布被并发多次打 AI */
    private final ConcurrentHashMap<String, Object> locks = new ConcurrentHashMap<>();

    @Transactional
    public PublicationAiDetailResp getOrGenerate(String publicationId) {
        if (!StringUtils.hasText(publicationId)) {
            throw new BizException("发布不存在");
        }
        String id = publicationId.trim();
        PublicationEntity first = publicationRepository.findById(id)
                .orElseThrow(() -> new BizException("发布不存在"));
        String fp = fingerprint(first.getImageUrl());
        if (isCacheValid(first, fp)) {
            return toResp(first, true);
        }

        Object lock = locks.computeIfAbsent(id, k -> new Object());
        synchronized (lock) {
            try {
                PublicationEntity entity = publicationRepository.findById(id)
                        .orElseThrow(() -> new BizException("发布不存在"));
                String currentFp = fingerprint(entity.getImageUrl());
                if (isCacheValid(entity, currentFp)) {
                    return toResp(entity, true);
                }
                List<String> images = ImageUrlList.split(entity.getImageUrl());
                String content = visionService.describeItem(entity.getTitle(), images);
                LocalDateTime at = LocalDateTime.now();
                int updated = publicationRepository.updateAiDetail(entity.getId(), content, currentFp, at);
                if (updated <= 0) {
                    throw new BizException("物品详情保存失败，请稍后再试");
                }
                entity.setAiDetailText(content);
                entity.setAiDetailImageFp(currentFp);
                entity.setAiDetailAt(at);
                log.info("物品详情已缓存: publicationId={}, fp={}, chars={}",
                        entity.getId(), currentFp, content.length());
                return toResp(entity, false);
            } finally {
                locks.remove(id, lock);
            }
        }
    }

    private static boolean isCacheValid(PublicationEntity entity, String fp) {
        return StringUtils.hasText(entity.getAiDetailText())
                && StringUtils.hasText(entity.getAiDetailImageFp())
                && entity.getAiDetailImageFp().equals(fp);
    }

    static String fingerprint(String joinedImageUrls) {
        String raw = joinedImageUrls == null ? "" : joinedImageUrls.trim();
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] digest = md.digest(raw.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest).substring(0, 32);
        } catch (Exception e) {
            return Integer.toHexString(raw.hashCode());
        }
    }

    private static PublicationAiDetailResp toResp(PublicationEntity entity, boolean cached) {
        PublicationAiDetailResp resp = new PublicationAiDetailResp();
        resp.setPublicationId(entity.getId());
        resp.setTitle(entity.getTitle());
        resp.setContent(entity.getAiDetailText());
        resp.setCached(cached);
        resp.setUpdatedAt(entity.getAiDetailAt());
        return resp;
    }
}
