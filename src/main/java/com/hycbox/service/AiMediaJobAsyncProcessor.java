package com.hycbox.service;

import com.hycbox.entity.AiMediaJobEntity;
import com.hycbox.repository.AiMediaJobRepository;
import com.hycbox.service.AgnesMediaClient.AgnesMediaResult;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.Optional;

/**
 * AI 媒资后台执行：根据任务流水异步调 Agnes，并回写结果（含失败）。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AiMediaJobAsyncProcessor {

    private static final long VIDEO_POLL_TIMEOUT_MS = 15 * 60 * 1000L;
    private static final long VIDEO_POLL_INTERVAL_MS = 5_000L;

    private final AiMediaJobRepository repository;
    private final AgnesMediaClient agnesMediaClient;

    @Async("aiMediaExecutor")
    public void processImage(String jobId) {
        Optional<AiMediaJobEntity> opt = repository.findById(jobId);
        if (opt.isEmpty()) {
            log.warn("图片 AI 异步任务不存在: id={}", jobId);
            return;
        }
        AiMediaJobEntity job = opt.get();
        markRunning(job);
        try {
            AgnesMediaResult result = agnesMediaClient.generateImage(
                    job.getModel(), job.getPrompt(), job.getReqN(), job.getReqSize());
            applySuccessOrRunning(job, result, ".png");
            if (!"succeeded".equals(job.getStatus()) && !"failed".equals(job.getStatus())) {
                fail(job, "图片生成结果为空");
            } else {
                repository.save(job);
                log.info("图片 AI 异步完成: id={}, status={}", jobId, job.getStatus());
            }
        } catch (Exception e) {
            String msg = e.getMessage();
            if (!StringUtils.hasText(msg)) {
                msg = "图片生成失败，请稍后再试";
            }
            fail(job, msg);
            log.warn("图片 AI 异步失败: id={}, err={}", jobId, msg);
        }
    }

    @Async("aiMediaExecutor")
    public void processVideo(String jobId) {
        Optional<AiMediaJobEntity> opt = repository.findById(jobId);
        if (opt.isEmpty()) {
            log.warn("视频 AI 异步任务不存在: id={}", jobId);
            return;
        }
        AiMediaJobEntity job = opt.get();
        markRunning(job);
        try {
            AgnesMediaResult created = agnesMediaClient.createVideo(
                    job.getModel(), job.getPrompt(), job.getReqSeconds(), job.getReqSize());
            applySuccessOrRunning(job, created, ".mp4");
            repository.save(job);

            if ("succeeded".equals(job.getStatus()) || "failed".equals(job.getStatus())) {
                log.info("视频 AI 异步同步完成: id={}, status={}", jobId, job.getStatus());
                return;
            }
            if (!StringUtils.hasText(job.getRemoteJobId())) {
                fail(job, "视频任务未返回任务 ID");
                return;
            }

            long deadline = System.currentTimeMillis() + VIDEO_POLL_TIMEOUT_MS;
            while (System.currentTimeMillis() < deadline) {
                try {
                    Thread.sleep(VIDEO_POLL_INTERVAL_MS);
                } catch (InterruptedException ie) {
                    Thread.currentThread().interrupt();
                    log.warn("视频 AI 轮询中断: id={}", jobId);
                    return;
                }
                AgnesMediaResult polled = agnesMediaClient.pollVideo(job.getRemoteJobId());
                applySuccessOrRunning(job, polled, ".mp4");
                repository.save(job);
                if ("succeeded".equals(job.getStatus()) || "failed".equals(job.getStatus())) {
                    log.info("视频 AI 异步轮询完成: id={}, status={}", jobId, job.getStatus());
                    return;
                }
            }
            // 超时仍保持 running，便于用户下次进入看到后台继续/已完成结果；不标失败
            log.warn("视频 AI 异步轮询超时仍未完成: id={}, remoteJobId={}", jobId, job.getRemoteJobId());
        } catch (Exception e) {
            String msg = e.getMessage();
            if (!StringUtils.hasText(msg)) {
                msg = "视频生成失败，请稍后再试";
            }
            fail(job, msg);
            log.warn("视频 AI 异步失败: id={}, err={}", jobId, msg);
        }
    }

    private void markRunning(AiMediaJobEntity job) {
        job.setStatus("running");
        job.setUpdatedAt(LocalDateTime.now());
        repository.save(job);
    }

    private void applySuccessOrRunning(AiMediaJobEntity job, AgnesMediaResult result, String defaultExt) {
        if (result == null) {
            return;
        }
        job.setRawResponse(AgnesMediaClient.truncateRaw(result.getRawResponse()));
        job.setUpdatedAt(LocalDateTime.now());
        if (StringUtils.hasText(result.getRemoteJobId())) {
            job.setRemoteJobId(result.getRemoteJobId());
        }
        if (StringUtils.hasText(result.getRemoteUrl())) {
            job.setRemoteUrl(result.getRemoteUrl());
        }
        if ("failed".equals(result.getStatus())) {
            job.setStatus("failed");
            job.setErrorMsg(StringUtils.hasText(result.getErrorMsg()) ? result.getErrorMsg() : "生成失败");
            return;
        }
        if ("succeeded".equals(result.getStatus()) && StringUtils.hasText(result.getRemoteUrl())) {
            String hosted = agnesMediaClient.persistMedia(result.getRemoteUrl(), defaultExt);
            job.setResultUrl(StringUtils.hasText(hosted) ? hosted : result.getRemoteUrl());
            job.setStatus("succeeded");
            job.setErrorMsg(null);
            return;
        }
        job.setStatus("running");
    }

    private void fail(AiMediaJobEntity job, String message) {
        job.setStatus("failed");
        job.setErrorMsg(message);
        job.setUpdatedAt(LocalDateTime.now());
        repository.save(job);
    }
}
