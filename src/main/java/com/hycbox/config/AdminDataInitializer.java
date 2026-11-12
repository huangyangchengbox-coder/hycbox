package com.hycbox.config;

import com.hycbox.entity.AdminEntity;
import com.hycbox.entity.PublicationEntity;
import com.hycbox.repository.AdminRepository;
import com.hycbox.repository.PublicationRepository;
import com.hycbox.util.AdminPasswordHasher;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 初始化超级管理员 hyc，禁用多余测试账号，历史发布归属到 hyc。
 */
@Slf4j
@Component
@Order(10)
@RequiredArgsConstructor
public class AdminDataInitializer implements ApplicationRunner {

    private final AdminRepository adminRepository;
    private final PublicationRepository publicationRepository;
    private final HycBoxProperties properties;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(ApplicationArguments args) {
        AdminEntity superAdmin = ensureSuperAdmin("hyc", properties.getAdminPassword(), "超级管理员");

        adminRepository.findByUsernameAndStatus("hyc2", "active").ifPresent(admin -> {
            admin.setStatus("disabled");
            adminRepository.save(admin);
            log.info("已禁用测试账号: hyc2");
        });

        List<PublicationEntity> orphans = publicationRepository.findAll().stream()
                .filter(p -> !StringUtils.hasText(p.getAdminId()))
                .toList();
        for (PublicationEntity pub : orphans) {
            pub.setAdminId(superAdmin.getId());
            pub.setAdminName(superAdmin.getDisplayName());
            publicationRepository.save(pub);
        }
        if (!orphans.isEmpty()) {
            log.info("历史发布已归属超级管理员: count={}", orphans.size());
        }
    }

    private AdminEntity ensureSuperAdmin(String username, String password, String displayName) {
        return adminRepository.findByUsernameAndStatus(username, "active").map(admin -> {
            boolean changed = false;
            if (!"super".equals(admin.getRole())) {
                admin.setRole("super");
                changed = true;
                log.info("已升级为超级管理员: {}", username);
            }
            // 仅当配置了明文密码时：匹配则必要时升 BCrypt；不匹配则按配置重置
            if (StringUtils.hasText(password)) {
                String raw = password.trim();
                if (!AdminPasswordHasher.matches(passwordEncoder, raw, admin.getPassword())) {
                    admin.setPassword(AdminPasswordHasher.encode(passwordEncoder, raw));
                    changed = true;
                    log.info("已按配置重置超级管理员密码哈希: {}", username);
                } else if (!AdminPasswordHasher.isEncoded(admin.getPassword())) {
                    admin.setPassword(AdminPasswordHasher.encode(passwordEncoder, raw));
                    changed = true;
                    log.info("超级管理员密码已从明文迁移为 BCrypt: {}", username);
                }
            }
            if (!displayName.equals(admin.getDisplayName())) {
                admin.setDisplayName(displayName);
                changed = true;
            }
            if (changed) {
                adminRepository.save(admin);
                log.info("已同步超级管理员信息: {}", username);
            }
            return admin;
        }).orElseGet(() -> {
            if (!StringUtils.hasText(password)) {
                throw new IllegalStateException(
                        "缺少超级管理员：请设置环境变量 HYCBOX_ADMIN_PASSWORD 或 local 配置 hycbox.admin-password");
            }
            AdminEntity admin = new AdminEntity();
            admin.setId("adm_" + username);
            admin.setUsername(username);
            admin.setPassword(AdminPasswordHasher.encode(passwordEncoder, password.trim()));
            admin.setDisplayName(displayName);
            admin.setRole("super");
            admin.setStatus("active");
            admin.setCreatedAt(LocalDateTime.now());
            adminRepository.save(admin);
            log.info("初始化超级管理员(BCrypt): {}", username);
            return admin;
        });
    }
}
