package com.hycbox.dto.resp;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AdminSubscribeStatusResp {

    private boolean wxBound;
    private int subscribeQuota;
    private boolean needSubscribe;
}
