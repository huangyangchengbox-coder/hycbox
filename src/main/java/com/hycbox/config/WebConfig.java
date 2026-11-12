package com.hycbox.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.util.StringUtils;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.nio.file.Paths;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    private final HycBoxProperties properties;

    public WebConfig(HycBoxProperties properties) {
        this.properties = properties;
    }

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/**")
                .allowedOriginPatterns(
                        "https://hychyr.top",
                        "https://hychyr.top:*",
                        "https://www.hychyr.top",
                        "https://trial.hychyr.top",
                        "http://hychyr.top",
                        "http://hychyr.top:*",
                        "http://trial.hychyr.top",
                        "https://servicewechat.com",
                        "http://127.0.0.1:*",
                        "http://localhost:*")
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                .allowedHeaders("*")
                .allowCredentials(true);
    }

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        // SeaweedFS 模式下由 nginx 反代 Filer，应用内不再映射本地 uploads
        if (!"local".equalsIgnoreCase(nullToLocal(properties.getStorageType()))) {
            return;
        }
        String uploadPath = Paths.get(properties.getUploadDir()).toAbsolutePath().normalize().toUri().toString();
        if (!uploadPath.endsWith("/")) {
            uploadPath = uploadPath + "/";
        }
        registry.addResourceHandler("/uploads/**")
                .addResourceLocations(uploadPath);
    }

    private static String nullToLocal(String storageType) {
        return StringUtils.hasText(storageType) ? storageType : "local";
    }
}
