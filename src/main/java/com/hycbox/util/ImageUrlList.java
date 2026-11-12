package com.hycbox.util;

import org.springframework.util.StringUtils;

import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

/**
 * 多图 URL 存库约定：英文逗号拼接；接口侧拆成 List。
 * 物流发货图、发布主图等复用。
 */
public final class ImageUrlList {

    private ImageUrlList() {
    }

    public static String join(List<String> images) {
        if (images == null || images.isEmpty()) {
            return null;
        }
        String joined = images.stream()
                .filter(StringUtils::hasText)
                .map(String::trim)
                .collect(Collectors.joining(","));
        return StringUtils.hasText(joined) ? joined : null;
    }

    public static List<String> split(String joined) {
        if (!StringUtils.hasText(joined)) {
            return List.of();
        }
        return Arrays.stream(joined.split(","))
                .map(String::trim)
                .filter(StringUtils::hasText)
                .collect(Collectors.toList());
    }

    /** 列表封面：取第一张 */
    public static String first(String joined) {
        List<String> list = split(joined);
        return list.isEmpty() ? null : list.get(0);
    }
}
