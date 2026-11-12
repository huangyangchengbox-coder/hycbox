package com.hycbox.util;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.util.StringUtils;

/**
 * 管理员密码哈希工具：支持 BCrypt，并兼容历史明文（登录成功后迁移）。
 */
public final class AdminPasswordHasher {

    private AdminPasswordHasher() {
    }

    public static boolean isEncoded(String stored) {
        return StringUtils.hasText(stored)
                && (stored.startsWith("$2a$") || stored.startsWith("$2b$") || stored.startsWith("$2y$"));
    }

    public static boolean matches(PasswordEncoder encoder, String raw, String stored) {
        if (!StringUtils.hasText(raw) || !StringUtils.hasText(stored)) {
            return false;
        }
        if (isEncoded(stored)) {
            return encoder.matches(raw, stored);
        }
        return raw.equals(stored);
    }

    public static String encode(PasswordEncoder encoder, String raw) {
        return encoder.encode(raw);
    }
}
