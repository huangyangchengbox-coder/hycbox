package com.hycbox.dto.req;

import lombok.Data;

/**
 * 管理员上报配送位置（经纬度来自小程序 wx.getLocation）。
 */
@Data
public class AdminLocationReq {

    /** true=分享中；false=停止分享 */
    private Boolean sharing;
    private Double latitude;
    private Double longitude;
}
