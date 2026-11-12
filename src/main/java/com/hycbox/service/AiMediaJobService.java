package com.hycbox.service;

import com.hycbox.config.HycBoxProperties;
import com.hycbox.dto.req.CreateAiMediaReq;
import com.hycbox.dto.resp.AiMediaJobResp;
import com.hycbox.dto.resp.PageResult;
import com.hycbox.entity.AiMediaJobEntity;
import com.hycbox.exception.BizException;
import com.hycbox.repository.AiMediaJobRepository;
import com.hycbox.service.AdminAuthService.AdminSession;
import com.hycbox.service.AgnesMediaClient.AgnesMediaResult;
import com.hycbox.util.PageParams;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * AI 媒资任务：创建时只落库返回任务 ID，后台异步调 Agnes；前端轮询查结果。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AiMediaJobService {

    private static final String TYPE_IMAGE = "image";
    private static final String TYPE_VIDEO = "video";

    private final AiMediaJobRepository repository;
    private final AgnesMediaClient agnesMediaClient;
    private final AiMediaJobAsyncProcessor asyncProcessor;
    private final HycBoxProperties properties;

    /**
     * 创建图片任务流水并立即返回，后台异步生成。
     */
    public AiMediaJobResp createImage(CreateAiMediaReq req, AdminSession admin) {
        ensureAiReady();
        String prompt = requirePrompt(req);
        String model = resolveImageModel(req);
        String size = resolveSize(req);
        Integer n = resolveN(req);
        AiMediaJobEntity job = newJob(TYPE_IMAGE, prompt, model, admin);
        job.setReqSize(size);
        job.setReqN(n);
        job.setStatus("pending");
        repository.save(job);
        asyncProcessor.processImage(job.getId());
        log.info("图片 AI 任务已创建: id={}, adminId={}, size={}, n={}", job.getId(), admin.adminId(), size, n);
        return toResp(job);
    }

    /**
     * 创建视频任务流水并立即返回，后台异步提交并轮询 Agnes。
     */
    public AiMediaJobResp createVideo(CreateAiMediaReq req, AdminSession admin) {
        ensureAiReady();
        String prompt = requirePrompt(req);
        String model = resolveVideoModel(req);
        String size = resolveSize(req);
        String seconds = resolveSeconds(req);
        AiMediaJobEntity job = newJob(TYPE_VIDEO, prompt, model, admin);
        job.setReqSize(size);
        job.setReqSeconds(seconds);
        job.setStatus("pending");
        repository.save(job);
        asyncProcessor.processVideo(job.getId());
        log.info("视频 AI 任务已创建: id={}, adminId={}, seconds={}, size={}",
                job.getId(), admin.adminId(), seconds, size);
        return toResp(job);
    }

    public PageResult<AiMediaJobResp> list(String mediaType, Integer page, Integer pageSize) {
        String type = normalizeType(mediaType);
        int p = PageParams.page(page);
        int size = PageParams.size(pageSize);
        Page<AiMediaJobEntity> result = repository.findByMediaTypeOrderByCreatedAtDesc(
                type, PageRequest.of(p - 1, size));
        List<AiMediaJobResp> list = result.getContent().stream()
                .map(this::toResp)
                .collect(Collectors.toList());
        return PageResult.of(list, result.getTotalElements(), p, size);
    }

    public AiMediaJobResp getById(String id) {
        AiMediaJobEntity job = repository.findById(id)
                .orElseThrow(() -> new BizException("任务不存在"));
        return toResp(job);
    }

    /**
     * 轻量刷新：查库；若视频仍在跑且有 remoteJobId，则向 Agnes 补拉一次（异步线程异常时的兜底）。
     */
    @Transactional
    public AiMediaJobResp refreshVideo(String id) {
        AiMediaJobEntity job = repository.findById(id)
                .orElseThrow(() -> new BizException("任务不存在"));
        if (!TYPE_VIDEO.equals(job.getMediaType())) {
            return toResp(job);
        }
        if ("succeeded".equals(job.getStatus()) || "failed".equals(job.getStatus())) {
            return toResp(job);
        }
        if (!StringUtils.hasText(job.getRemoteJobId())) {
            return toResp(job);
        }
        try {
            AgnesMediaResult result = agnesMediaClient.pollVideo(job.getRemoteJobId());
            if (result != null) {
                job.setRawResponse(AgnesMediaClient.truncateRaw(result.getRawResponse()));
                if (StringUtils.hasText(result.getRemoteUrl())) {
                    job.setRemoteUrl(result.getRemoteUrl());
                }
                if ("failed".equals(result.getStatus())) {
                    job.setStatus("failed");
                    job.setErrorMsg(StringUtils.hasText(result.getErrorMsg()) ? result.getErrorMsg() : "生成失败");
                } else if ("succeeded".equals(result.getStatus()) && StringUtils.hasText(result.getRemoteUrl())) {
                    String hosted = agnesMediaClient.persistMedia(result.getRemoteUrl(), ".mp4");
                    job.setResultUrl(StringUtils.hasText(hosted) ? hosted : result.getRemoteUrl());
                    job.setStatus("succeeded");
                    job.setErrorMsg(null);
                }
                job.setUpdatedAt(LocalDateTime.now());
                repository.save(job);
            }
        } catch (Exception e) {
            log.debug("视频刷新兜底未完成: id={}, err={}", id, e.getMessage());
        }
        log.info("视频 AI 刷新: id={}, status={}", job.getId(), job.getStatus());
        return toResp(job);
    }

    private void ensureAiReady() {
        if (!agnesMediaClient.isConfigured()) {
            throw new BizException("AI 服务暂未开通，请稍后再试");
        }
    }

    private AiMediaJobEntity newJob(String mediaType, String prompt, String model, AdminSession admin) {
        AiMediaJobEntity job = new AiMediaJobEntity();
        String prefix = TYPE_VIDEO.equals(mediaType) ? "aiv_" : "aim_";
        job.setId(prefix + UUID.randomUUID().toString().replace("-", "").substring(0, 12));
        job.setMediaType(mediaType);
        job.setPrompt(prompt);
        job.setModel(model);
        job.setStatus("pending");
        job.setAdminId(admin.adminId());
        job.setAdminName(admin.displayName());
        LocalDateTime now = LocalDateTime.now();
        job.setCreatedAt(now);
        job.setUpdatedAt(now);
        return job;
    }

    private String requirePrompt(CreateAiMediaReq req) {
        if (req == null || !StringUtils.hasText(req.getPrompt())) {
            throw new BizException("请输入描述 prompt");
        }
        return req.getPrompt().trim();
    }

    private String resolveImageModel(CreateAiMediaReq req) {
        if (req != null && StringUtils.hasText(req.getModel())) {
            return req.getModel().trim();
        }
        HycBoxProperties.Ai ai = properties.getAi();
        if (ai != null && StringUtils.hasText(ai.getImageModel())) {
            return ai.getImageModel().trim();
        }
        return "agnes-image-2.0-flash";
    }

    private String resolveVideoModel(CreateAiMediaReq req) {
        if (req != null && StringUtils.hasText(req.getModel())) {
            return req.getModel().trim();
        }
        HycBoxProperties.Ai ai = properties.getAi();
        if (ai != null && StringUtils.hasText(ai.getVideoModel())) {
            return ai.getVideoModel().trim();
        }
        return "agnes-video-v2.0";
    }

    private static String resolveSize(CreateAiMediaReq req) {
        if (req != null && StringUtils.hasText(req.getSize())) {
            return req.getSize().trim();
        }
        return null;
    }

    private static Integer resolveN(CreateAiMediaReq req) {
        if (req != null && req.getN() != null && req.getN() > 0) {
            return req.getN();
        }
        return null;
    }

    private static String resolveSeconds(CreateAiMediaReq req) {
        if (req != null && StringUtils.hasText(req.getSeconds())) {
            return req.getSeconds().trim();
        }
        return null;
    }

    private static String normalizeType(String mediaType) {
        if (!StringUtils.hasText(mediaType)) {
            throw new BizException("请指定 type=image 或 video");
        }
        String t = mediaType.trim().toLowerCase();
        if (!TYPE_IMAGE.equals(t) && !TYPE_VIDEO.equals(t)) {
            throw new BizException("type 仅支持 image 或 video");
        }
        return t;
    }

    private AiMediaJobResp toResp(AiMediaJobEntity entity) {
        AiMediaJobResp resp = new AiMediaJobResp();
        resp.setId(entity.getId());
        resp.setMediaType(entity.getMediaType());
        resp.setPrompt(entity.getPrompt());
        resp.setModel(entity.getModel());
        resp.setReqSize(entity.getReqSize());
        resp.setReqN(entity.getReqN());
        resp.setReqSeconds(entity.getReqSeconds());
        resp.setStatus(entity.getStatus());
        resp.setResultUrl(entity.getResultUrl());
        resp.setRemoteUrl(entity.getRemoteUrl());
        resp.setRemoteJobId(entity.getRemoteJobId());
        resp.setErrorMsg(entity.getErrorMsg());
        resp.setAdminId(entity.getAdminId());
        resp.setAdminName(entity.getAdminName());
        resp.setCreatedAt(entity.getCreatedAt());
        resp.setUpdatedAt(entity.getUpdatedAt());
        return resp;
    }
}
