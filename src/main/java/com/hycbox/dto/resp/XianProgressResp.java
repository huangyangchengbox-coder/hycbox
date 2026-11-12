package com.hycbox.dto.resp;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Data;

import java.time.LocalDateTime;

/** 仙途进度；无存档时 hasProgress=false */
@Data
public class XianProgressResp {

    private boolean hasProgress;
    private String userId;
    private Integer realmLv;
    private Integer kills;
    private Integer swordCount;
    private Integer wave;
    private Integer corpseDan;
    private Integer qiAbsorb;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss", timezone = "GMT+8")
    private LocalDateTime updatedAt;
}
