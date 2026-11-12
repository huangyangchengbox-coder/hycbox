package com.hycbox.dto.req;

import lombok.Data;

import java.util.List;

/**
 * 物流中国售后备注与图片
 */
@Data
public class AfterSaleReq {

    private String afterSaleRemark;
    /** 售后图片 URL 列表 */
    private List<String> afterSaleImages;
}
