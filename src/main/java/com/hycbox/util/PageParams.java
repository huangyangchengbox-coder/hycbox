package com.hycbox.util;

/**
 * 分页参数规范化：默认 20，最大 100，页码从 1 起。
 */
public final class PageParams {

    public static final int DEFAULT_PAGE = 1;
    public static final int DEFAULT_SIZE = 20;
    public static final int MAX_SIZE = 100;

    private PageParams() {
    }

    public static int page(Integer page) {
        if (page == null || page < 1) {
            return DEFAULT_PAGE;
        }
        return page;
    }

    public static int size(Integer pageSize) {
        if (pageSize == null || pageSize < 1) {
            return DEFAULT_SIZE;
        }
        return Math.min(pageSize, MAX_SIZE);
    }
}
