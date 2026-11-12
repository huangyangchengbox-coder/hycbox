package com.hycbox.dto.resp;

import lombok.Data;

/**
 * 行政区划导入结果摘要。
 */
@Data
public class RegionImportResult {

    private int provinceCount;
    private int cityCount;
    private int districtCount;
    private int total;
    private long elapsedMs;
    private String source;
}
