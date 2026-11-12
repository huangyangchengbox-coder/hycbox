package com.hycbox.service;

import com.hycbox.dto.req.XianProgressSaveReq;
import com.hycbox.dto.resp.XianProgressResp;
import com.hycbox.entity.XianProgressEntity;
import com.hycbox.entity.WxUserEntity;
import com.hycbox.exception.BizException;
import com.hycbox.repository.WxUserRepository;
import com.hycbox.repository.XianProgressRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;

/**
 * 仙途进度读写：按小程序用户 id 一人一条，可扩容为多存档槽。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class XianProgressService {

    private final XianProgressRepository xianProgressRepository;
    private final WxUserRepository wxUserRepository;

    public XianProgressResp getProgress(String userId) {
        String uid = resolveUserId(userId);
        return xianProgressRepository.findById(uid)
                .map(this::toResp)
                .orElseGet(() -> emptyResp(uid));
    }

    @Transactional
    public XianProgressResp saveProgress(XianProgressSaveReq req) {
        if (req == null) {
            throw new BizException("缺少进度数据");
        }
        String uid = resolveUserId(req.getUserId());
        XianProgressEntity entity = xianProgressRepository.findById(uid).orElseGet(XianProgressEntity::new);
        entity.setUserId(uid);
        entity.setRealmLv(clamp(req.getRealmLv(), 1, 99, 1));
        entity.setKills(clamp(req.getKills(), 0, 999999, 0));
        entity.setSwordCount(clamp(req.getSwordCount(), 1, 64, 1));
        entity.setWave(clamp(req.getWave(), 1, 9999, 1));
        entity.setCorpseDan(clamp(req.getCorpseDan(), 0, 9999, 0));
        entity.setQiAbsorb(clamp(req.getQiAbsorb(), 0, 100, 0));
        entity.setUpdatedAt(LocalDateTime.now());
        xianProgressRepository.save(entity);
        log.info("仙途进度已保存: userId={} realmLv={} kills={}", uid, entity.getRealmLv(), entity.getKills());
        return toResp(entity);
    }

    @Transactional
    public void clearProgress(String userId) {
        String uid = resolveUserId(userId);
        if (xianProgressRepository.existsById(uid)) {
            xianProgressRepository.deleteById(uid);
            log.info("仙途进度已清除: userId={}", uid);
        }
    }

    /**
     * 兼容：优先认 wx_user.id；若传入 openid 则解析为用户 id。
     */
    private String resolveUserId(String raw) {
        if (!StringUtils.hasText(raw)) {
            throw new BizException("缺少用户 id");
        }
        String id = raw.trim();
        if (wxUserRepository.existsById(id)) {
            return id;
        }
        return wxUserRepository.findByOpenid(id)
                .map(WxUserEntity::getId)
                .orElseThrow(() -> new BizException("用户不存在，请先登录"));
    }

    private XianProgressResp emptyResp(String userId) {
        XianProgressResp resp = new XianProgressResp();
        resp.setHasProgress(false);
        resp.setUserId(userId);
        return resp;
    }

    private XianProgressResp toResp(XianProgressEntity e) {
        XianProgressResp resp = new XianProgressResp();
        resp.setHasProgress(true);
        resp.setUserId(e.getUserId());
        resp.setRealmLv(e.getRealmLv());
        resp.setKills(e.getKills());
        resp.setSwordCount(e.getSwordCount());
        resp.setWave(e.getWave());
        resp.setCorpseDan(e.getCorpseDan());
        resp.setQiAbsorb(e.getQiAbsorb());
        resp.setUpdatedAt(e.getUpdatedAt());
        return resp;
    }

    private int clamp(Integer v, int min, int max, int def) {
        if (v == null) {
            return def;
        }
        return Math.max(min, Math.min(max, v));
    }
}
