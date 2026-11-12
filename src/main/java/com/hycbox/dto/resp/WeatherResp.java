package com.hycbox.dto.resp;

import lombok.Data;

/**
 * 首页天气：根据定位经纬度查询（Open-Meteo，免 Key）。
 */
@Data
public class WeatherResp {

    /** 展示用地点文案，如「当前位置」 */
    private String placeLabel;
    private Double latitude;
    private Double longitude;
    /** 气温 ℃ */
    private Double temperature;
    /** 相对湿度 % */
    private Integer humidity;
    /** 天气中文描述 */
    private String weatherText;
    /** WMO weather_code */
    private Integer weatherCode;
    /** 风速 km/h */
    private Double windSpeed;
}
