package com.hycbox.dto.req;

import lombok.Data;

@Data
public class CreateAiMediaReq {

    private String prompt;
    /** 不传则使用配置默认模型 */
    private String model;
    /** 图片尺寸，如 1024x1024 */
    private String size;
    /** 图片生成数量，默认 1 */
    private Integer n;
    /** 视频时长（字符串），如 "4"、"5" */
    private String seconds;
}
