package com.hycbox.dto.req;

import lombok.Data;

@Data
public class CreateOrderReq {

    private String publicationId;
    private String userId;
    /** 昵称（物流中国）或称呼（小区闪送） */
    private String userName;
    /** 小区闪送：门牌 ID */
    private String roomId;
    private Integer quantity;
    /** 用户备注，可选 */
    private String remark;
    /** 物流中国：手机号 */
    private String phone;
    /** 物流中国：收货地址 */
    private String address;
    /** 物流中国：省份 */
    private String province;
    /** 村村送：收货点纬度 */
    private Double locationLat;
    /** 村村送：收货点经度 */
    private Double locationLng;
    /** 村村送：地图选点名称 */
    private String locationName;
}
