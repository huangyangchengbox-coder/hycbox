package com.hycbox.dto.resp;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class RegionResp {

    private String adcode;
    private String name;
    /** 1省 2市 3区县 */
    private Integer level;
    private String levelName;
    private String parentAdcode;
    private Integer childrenNum;
    private Double centerLng;
    private Double centerLat;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss", timezone = "GMT+8")
    private LocalDateTime updatedAt;
}
