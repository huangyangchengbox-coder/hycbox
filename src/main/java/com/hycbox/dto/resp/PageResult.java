package com.hycbox.dto.resp;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Collections;
import java.util.List;

/**
 * 通用分页结果，便于列表接口水平扩容后仍保持稳定响应体积。
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class PageResult<T> {

    private List<T> list;
    private long total;
    private int page;
    private int pageSize;

    public static <T> PageResult<T> of(List<T> list, long total, int page, int pageSize) {
        return new PageResult<>(list == null ? Collections.emptyList() : list, total, page, pageSize);
    }

    public static <T> PageResult<T> empty(int page, int pageSize) {
        return of(Collections.emptyList(), 0, page, pageSize);
    }
}
