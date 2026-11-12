package com.hycbox.dto.resp;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 用户查看配送员位置：仅经纬度 + 是否在分享，无地图 Key。
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class CourierLocationResp {

    /** 是否正在分享且位置未过期 */
    private boolean sharing;
    private Double latitude;
    private Double longitude;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss", timezone = "GMT+8")
    private LocalDateTime updatedAt;

    public static CourierLocationResp offline() {
        return new CourierLocationResp(false, null, null, null);
    }
}
