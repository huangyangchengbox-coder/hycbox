package com.hycbox.dto.resp;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;

/**
 * 驾驶舱：某次小区发布的配送热力数据。
 */
@Data
public class CockpitDeliveryMapResp {

    private String publicationId;
    private String title;
    private String scope;
    private String communityId;
    private String communityName;
    private String phaseId;
    private String phaseName;
    private int pendingCount;
    private int completedCount;
    private List<CockpitRoomStatusResp> rooms = new ArrayList<>();
}
