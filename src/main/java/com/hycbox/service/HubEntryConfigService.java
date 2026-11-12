package com.hycbox.service;

import com.hycbox.dto.req.HubEntryUpdateReq;
import com.hycbox.dto.resp.HubEntryResp;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 首页/工具业务入口显隐：默认全关，管理员可分别打开。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class HubEntryConfigService {

    public static final String KEY_FLASH = "hub.entry.flash";
    public static final String KEY_EXPRESS = "hub.entry.express";
    public static final String KEY_VILLAGE = "hub.entry.village";
    public static final String KEY_XIAN = "hub.entry.xian";

    private final AppConfigService appConfigService;

    public HubEntryResp getEntries() {
        HubEntryResp resp = new HubEntryResp();
        resp.setFlash(appConfigService.getBoolean(KEY_FLASH, false));
        resp.setExpress(appConfigService.getBoolean(KEY_EXPRESS, false));
        resp.setVillage(appConfigService.getBoolean(KEY_VILLAGE, false));
        resp.setXian(appConfigService.getBoolean(KEY_XIAN, false));
        resp.setUpdatedAt(appConfigService.latestUpdatedAt(KEY_FLASH, KEY_EXPRESS, KEY_VILLAGE, KEY_XIAN));
        return resp;
    }

    @Transactional
    public HubEntryResp updateEntries(HubEntryUpdateReq req, String adminId) {
        if (req.getFlash() != null) {
            appConfigService.setBoolean(KEY_FLASH, req.getFlash(), adminId);
        }
        if (req.getExpress() != null) {
            appConfigService.setBoolean(KEY_EXPRESS, req.getExpress(), adminId);
        }
        if (req.getVillage() != null) {
            appConfigService.setBoolean(KEY_VILLAGE, req.getVillage(), adminId);
        }
        if (req.getXian() != null) {
            appConfigService.setBoolean(KEY_XIAN, req.getXian(), adminId);
        }
        HubEntryResp after = getEntries();
        log.info("hub 入口配置已更新: adminId={} flash={} express={} village={} xian={}",
                adminId, after.isFlash(), after.isExpress(), after.isVillage(), after.isXian());
        return after;
    }
}
