package com.hycbox.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Data
@Configuration
@ConfigurationProperties(prefix = "hycbox")
public class HycBoxProperties {

    /**
     * 文件存储类型：local（本地盘）| seaweedfs（SeaweedFS Filer）。
     * 多机部署时用 seaweedfs，避免文件只落在单机。
     */
    private String storageType = "local";
    private String uploadDir = "./uploads";
    /** API 根地址（对外域名） */
    private String publicBaseUrl = "https://hychyr.top/api";
    /** 上传文件对外访问根地址（经 nginx /uploads） */
    private String uploadPublicUrl = "https://hychyr.top/uploads";
    /** SeaweedFS 相关配置（storage-type=seaweedfs 时生效） */
    private SeaweedFs seaweedfs = new SeaweedFs();
    /** 超级管理员初始/同步密码（来自环境变量，勿写死仓库） */
    private String adminPassword = "";
    /** 微信小程序 AppId */
    private String wxAppId = "";
    /** 微信小程序 AppSecret（仅服务端） */
    private String wxAppSecret = "";
    /**
     * 是否清空并重建演示数据。
     * 仅在 spring profile=local 且本项为 true 时执行，防止生产误开。
     */
    private boolean resetDemoData = false;
    /** 小程序一次性订阅消息模板 ID（管理员新订单提醒） */
    private String wxSubscribeTemplateId = "";
    /**
     * 用户订单进度订阅模板；为空时回退 {@link #wxSubscribeTemplateId}（需字段结构一致）。
     */
    private String wxUserOrderTemplateId = "";

    /**
     * 生成小程序码时的 env_version：release / trial / develop。
     * 体验环境（trial 进程）应设为 trial，否则扫码会打开正式版。
     */
    private String wxMpEnvVersion = "release";

    /** 多模态 AI（OpenAI 兼容接口），用于发布物品详情识别 / Agnes 生图生视频 */
    private Ai ai = new Ai();
    /** Cloudflare Workers AI（REST API） */
    private CloudflareWorkersAi cloudflareWorkersAi = new CloudflareWorkersAi();
    /** NVIDIA NIM（integrate.api，OpenAI 兼容） */
    private NvidiaNimAi nvidiaNimAi = new NvidiaNimAi();

    @Data
    public static class SeaweedFs {
        /** Filer 内网地址 */
        private String filerUrl = "http://127.0.0.1:8888";
        /** Filer 路径前缀，需与 nginx /uploads 反代一致 */
        private String pathPrefix = "/uploads";
    }

    @Data
    public static class Ai {
        /** API Key，未配置时不调用外网 AI */
        private String apiKey = "";
        /** 兼容 OpenAI 的根路径，默认 Agnes AI 网关 */
        private String baseUrl = "https://apihub.agnes-ai.com/v1";
        /** 视觉模型名，默认 Agnes 2.0 Flash（支持 image_url） */
        private String model = "agnes-2.0-flash";
        /** 图片生成模型 */
        private String imageModel = "agnes-image-2.0-flash";
        /** 视频生成模型 */
        private String videoModel = "agnes-video-v2.0";
    }

    @Data
    public static class CloudflareWorkersAi {
        /** Cloudflare Account ID */
        private String accountId = "";
        /** Workers AI API Token（仅服务端，勿写入前端） */
        private String apiToken = "";
        /** 默认文本模型 */
        private String defaultModel = "@cf/meta/llama-3.1-8b-instruct";
    }

    @Data
    public static class NvidiaNimAi {
        /** NVIDIA API Key（nvapi-…，仅服务端） */
        private String apiKey = "";
        /** OpenAI 兼容根路径 */
        private String baseUrl = "https://integrate.api.nvidia.com/v1";
        /** 默认文本模型 */
        private String defaultModel = "meta/llama-3.1-8b-instruct";
    }
}
