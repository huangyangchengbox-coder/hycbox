package com.hycbox.dto.resp;

import lombok.Data;

@Data
public class RoomResp {

    private String id;
    private String communityId;
    private String communityName;
    private String phaseId;
    private String phaseName;
    private String buildingId;
    private String buildingName;
    private Integer unit;
    private String roomNo;
    private String label;
}
