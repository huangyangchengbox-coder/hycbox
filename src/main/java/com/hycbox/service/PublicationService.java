package com.hycbox.service;

import com.hycbox.dto.req.CreatePublicationReq;
import com.hycbox.dto.req.UpdatePublicationReq;
import com.hycbox.dto.resp.PageResult;
import com.hycbox.dto.resp.PublicationDetailResp;
import com.hycbox.dto.resp.PublicationResp;
import com.hycbox.entity.PublicationEntity;
import com.hycbox.exception.BizException;
import com.hycbox.repository.PublicationRepository;
import com.hycbox.service.AdminAuthService.AdminSession;
import com.hycbox.util.ImageUrlList;
import com.hycbox.util.PageParams;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class PublicationService {

    public static final String SCOPE_COMMUNITY = "community";
    public static final String SCOPE_NATIONWIDE = "nationwide";
    /** 村村送：山村坐标配送 */
    public static final String SCOPE_VILLAGE = "village";

    private final PublicationRepository publicationRepository;
    private final CommunityService communityService;

    public List<PublicationResp> listActivePublications(String communityId, String phaseId) {
        return listActivePublicationsPage(communityId, phaseId, 1, 100).getList();
    }

    public PageResult<PublicationResp> listActivePublicationsPage(String communityId, String phaseId,
                                                                  Integer page, Integer pageSize) {
        int p = PageParams.page(page);
        int size = PageParams.size(pageSize);
        String cid = StringUtils.hasText(communityId)
                ? communityId.trim()
                : communityService.getDefaultCommunityId();
        // 小区筛选含 phase，先取一页放大再内存过滤；活动数通常有限
        Page<PublicationEntity> raw = publicationRepository.findByStatusOrderByCreatedAtDesc(
                "active", PageRequest.of(0, Math.min(200, size * 5)));
        List<PublicationResp> filtered = raw.getContent().stream()
                .filter(this::isCommunityScope)
                .filter(e -> cid.equals(e.getCommunityId())
                        || (!StringUtils.hasText(e.getCommunityId())
                        && cid.equals(communityService.getDefaultCommunityId())))
                .filter(e -> !StringUtils.hasText(phaseId)
                        || !StringUtils.hasText(e.getPhaseId())
                        || phaseId.equals(e.getPhaseId()))
                .map(this::toResp)
                .collect(Collectors.toList());
        long total = filtered.size();
        int from = Math.min((p - 1) * size, filtered.size());
        int to = Math.min(from + size, filtered.size());
        return PageResult.of(filtered.subList(from, to), total, p, size);
    }

    public List<PublicationResp> listNationwideActive() {
        return listNationwideActivePage(1, 100).getList();
    }

    public PageResult<PublicationResp> listNationwideActivePage(Integer page, Integer pageSize) {
        int p = PageParams.page(page);
        int size = PageParams.size(pageSize);
        Page<PublicationEntity> result = publicationRepository.findByStatusAndScopeOrderByCreatedAtDesc(
                "active", SCOPE_NATIONWIDE, PageRequest.of(p - 1, size));
        List<PublicationResp> list = result.getContent().stream().map(this::toResp).collect(Collectors.toList());
        return PageResult.of(list, result.getTotalElements(), p, size);
    }

    public PageResult<PublicationResp> listVillageActivePage(Integer page, Integer pageSize) {
        int p = PageParams.page(page);
        int size = PageParams.size(pageSize);
        Page<PublicationEntity> result = publicationRepository.findByStatusAndScopeOrderByCreatedAtDesc(
                "active", SCOPE_VILLAGE, PageRequest.of(p - 1, size));
        List<PublicationResp> list = result.getContent().stream().map(this::toResp).collect(Collectors.toList());
        return PageResult.of(list, result.getTotalElements(), p, size);
    }

    public List<PublicationResp> listActivePublications() {
        return listActivePublications(communityService.getDefaultCommunityId(), null);
    }

    public List<PublicationResp> listMine(String adminId) {
        return listMinePage(adminId, 1, 100).getList();
    }

    public PageResult<PublicationResp> listMinePage(String adminId, Integer page, Integer pageSize) {
        int p = PageParams.page(page);
        int size = PageParams.size(pageSize);
        Page<PublicationEntity> result = publicationRepository.findByAdminIdOrderByCreatedAtDesc(
                adminId, PageRequest.of(p - 1, size));
        List<PublicationResp> list = result.getContent().stream().map(this::toResp).collect(Collectors.toList());
        return PageResult.of(list, result.getTotalElements(), p, size);
    }

    public PublicationEntity getById(String id) {
        return publicationRepository.findById(id)
                .orElseThrow(() -> new BizException("发布不存在"));
    }

    /**
     * 用户端物品详情：仅返回已落库字段，不触发任何生成逻辑。
     */
    public PublicationDetailResp getDetail(String id) {
        PublicationEntity entity = getById(id);
        PublicationDetailResp resp = new PublicationDetailResp();
        resp.setId(entity.getId());
        resp.setTitle(entity.getTitle());
        resp.setImages(ImageUrlList.split(entity.getImageUrl()));
        // 已有介绍文案则展示；字段名用 description，避免对外暴露生成能力命名
        resp.setDescription(StringUtils.hasText(entity.getAiDetailText())
                ? entity.getAiDetailText().trim()
                : "");
        resp.setTotalBags(entity.getTotalBags());
        resp.setRemainBags(entity.getRemainBags());
        resp.setUnit(StringUtils.hasText(entity.getUnit()) ? entity.getUnit() : "袋");
        resp.setUnitPrice(entity.getUnitPrice());
        resp.setScope(normalizeScope(entity.getScope()));
        resp.setCommunityName(entity.getCommunityName());
        resp.setPhaseName(entity.getPhaseName());
        resp.setStatus(entity.getStatus());
        resp.setAdminName(entity.getAdminName());
        resp.setCreatedAt(entity.getCreatedAt());
        log.info("查询物品详情: publicationId={}, hasDescription={}",
                id, StringUtils.hasText(resp.getDescription()));
        return resp;
    }

    public PublicationEntity requireOwned(String publicationId, String adminId) {
        PublicationEntity entity = getById(publicationId);
        if (!adminId.equals(entity.getAdminId())) {
            throw new BizException("无权操作该发布");
        }
        return entity;
    }

    /** 条件扣库存，失败则超卖/库存不足 */
    @Transactional
    public void deductRemain(String publicationId, int qty) {
        if (qty <= 0) {
            throw new BizException("扣减数量无效");
        }
        int updated = publicationRepository.tryDeductRemain(publicationId, qty);
        if (updated == 0) {
            throw new BizException("库存不足或活动已结束");
        }
        log.info("库存扣减成功: publicationId={}, qty={}", publicationId, qty);
    }

    /** 取消/回补库存 */
    @Transactional
    public void restoreRemain(String publicationId, int qty) {
        if (qty <= 0) {
            return;
        }
        int updated = publicationRepository.restoreRemain(publicationId, qty);
        log.info("库存回补: publicationId={}, qty={}, rows={}", publicationId, qty, updated);
    }

    @Transactional
    public PublicationResp endActivity(String publicationId, AdminSession admin) {
        PublicationEntity entity = requireOwned(publicationId, admin.adminId());
        if ("ended".equals(entity.getStatus())) {
            throw new BizException("活动已结束");
        }
        entity.setStatus("ended");
        publicationRepository.save(entity);
        log.info("活动结束: id={}, title={}, adminId={}", entity.getId(), entity.getTitle(), admin.adminId());
        return toResp(entity);
    }

    /**
     * 进行中发布可改标题/单价/总库存；已售数量 = total - remain，新总量不得小于已售。
     */
    @Transactional
    public PublicationResp updatePublication(String publicationId, UpdatePublicationReq req, AdminSession admin) {
        PublicationEntity entity = requireOwned(publicationId, admin.adminId());
        if (!"active".equals(entity.getStatus())) {
            throw new BizException("已结束活动不可修改");
        }
        if (req == null) {
            throw new BizException("请填写修改内容");
        }
        boolean changed = false;
        if (StringUtils.hasText(req.getTitle())) {
            entity.setTitle(req.getTitle().trim());
            changed = true;
        }
        if (req.getUnitPrice() != null) {
            entity.setUnitPrice(normalizePrice(req.getUnitPrice()));
            changed = true;
        }
        if (req.getTotalBags() != null) {
            int newTotal = req.getTotalBags();
            if (newTotal <= 0) {
                throw new BizException("总库存须大于 0");
            }
            int oldTotal = entity.getTotalBags() == null ? 0 : entity.getTotalBags();
            int remain = entity.getRemainBags() == null ? 0 : entity.getRemainBags();
            int sold = Math.max(0, oldTotal - remain);
            if (newTotal < sold) {
                throw new BizException("总库存不能小于已售数量 " + sold);
            }
            entity.setTotalBags(newTotal);
            entity.setRemainBags(newTotal - sold);
            changed = true;
        }
        if (!changed) {
            throw new BizException("没有需要修改的字段");
        }
        publicationRepository.save(entity);
        log.info("发布已更新: id={}, title={}, total={}, remain={}, unitPrice={}, adminId={}",
                entity.getId(), entity.getTitle(), entity.getTotalBags(), entity.getRemainBags(),
                entity.getUnitPrice(), admin.adminId());
        return toResp(entity);
    }

    @Transactional
    public PublicationResp create(CreatePublicationReq req, AdminSession admin) {
        if (req.getTotalBags() == null || req.getTotalBags() <= 0) {
            throw new BizException("请填写有效数量");
        }
        String scope = normalizeScope(req.getScope());
        String unit = normalizeUnit(req.getUnit());
        PublicationEntity entity = new PublicationEntity();
        entity.setId("pub_" + UUID.randomUUID().toString().replace("-", "").substring(0, 12));
        entity.setTitle(StringUtils.hasText(req.getTitle()) ? req.getTitle().trim() : "物品");
        entity.setImageUrl(resolveImageUrls(req));
        entity.setTotalBags(req.getTotalBags());
        entity.setRemainBags(req.getTotalBags());
        entity.setUnit(unit);
        entity.setUnitPrice(normalizePrice(req.getUnitPrice()));
        entity.setScope(scope);
        entity.setStatus("active");
        entity.setAdminId(admin.adminId());
        entity.setAdminName(admin.displayName());
        entity.setCreatedAt(LocalDateTime.now());

        if (SCOPE_NATIONWIDE.equals(scope)) {
            entity.setCommunityId(null);
            entity.setCommunityName("全国");
            entity.setPhaseId(null);
            entity.setPhaseName(null);
        } else if (SCOPE_VILLAGE.equals(scope)) {
            entity.setCommunityId(null);
            entity.setCommunityName("村村送");
            entity.setPhaseId(null);
            entity.setPhaseName(null);
        } else {
            String communityId = StringUtils.hasText(req.getCommunityId())
                    ? req.getCommunityId().trim()
                    : communityService.getDefaultCommunityId();
            Map<String, String> community = communityService.resolveCommunity(communityId);
            String phaseId = StringUtils.hasText(req.getPhaseId()) ? req.getPhaseId().trim() : null;
            String phaseName = null;
            if (phaseId != null) {
                Map<String, String> phase = communityService.resolvePhase(communityId, phaseId);
                phaseName = phase.get("name");
            }
            entity.setCommunityId(community.get("id"));
            entity.setCommunityName(community.get("name"));
            entity.setPhaseId(phaseId);
            entity.setPhaseName(phaseName);
        }

        publicationRepository.save(entity);
        log.info("发布物品: id={}, title={}, scope={}, community={}, phase={}, adminId={}, total={}, unit={}, unitPrice={}",
                entity.getId(), entity.getTitle(), scope, entity.getCommunityId(), entity.getPhaseId(),
                admin.adminId(), entity.getTotalBags(), unit, entity.getUnitPrice());
        return toResp(entity);
    }

    private boolean isCommunityScope(PublicationEntity p) {
        return SCOPE_COMMUNITY.equals(normalizeScope(p.getScope()));
    }

    private String normalizeScope(String scope) {
        if (SCOPE_NATIONWIDE.equals(scope)) {
            return SCOPE_NATIONWIDE;
        }
        if (SCOPE_VILLAGE.equals(scope)) {
            return SCOPE_VILLAGE;
        }
        return SCOPE_COMMUNITY;
    }

    private String normalizeUnit(String unit) {
        if (!StringUtils.hasText(unit)) {
            return "袋";
        }
        String value = unit.trim();
        if (value.length() > 8) {
            value = value.substring(0, 8);
        }
        return value;
    }

    private java.math.BigDecimal normalizePrice(java.math.BigDecimal price) {
        if (price == null) {
            return java.math.BigDecimal.ZERO;
        }
        if (price.compareTo(java.math.BigDecimal.ZERO) < 0) {
            throw new BizException("单价不能为负数");
        }
        return price.setScale(2, java.math.RoundingMode.HALF_UP);
    }

    private PublicationResp toResp(PublicationEntity entity) {
        PublicationResp resp = new PublicationResp();
        resp.setId(entity.getId());
        resp.setTitle(entity.getTitle());
        List<String> images = ImageUrlList.split(entity.getImageUrl());
        resp.setImages(images);
        resp.setImageUrl(images.isEmpty() ? null : images.get(0));
        resp.setTotalBags(entity.getTotalBags());
        resp.setRemainBags(entity.getRemainBags());
        resp.setUnit(StringUtils.hasText(entity.getUnit()) ? entity.getUnit() : "袋");
        resp.setUnitPrice(entity.getUnitPrice());
        resp.setScope(normalizeScope(entity.getScope()));
        resp.setCommunityId(entity.getCommunityId());
        resp.setCommunityName(entity.getCommunityName());
        resp.setPhaseId(entity.getPhaseId());
        resp.setPhaseName(entity.getPhaseName());
        resp.setStatus(entity.getStatus());
        resp.setAdminId(entity.getAdminId());
        resp.setAdminName(entity.getAdminName());
        resp.setCreatedAt(entity.getCreatedAt());
        String fp = PublicationAiDetailService.fingerprint(entity.getImageUrl());
        resp.setHasAiDetail(StringUtils.hasText(entity.getAiDetailText())
                && fp.equals(entity.getAiDetailImageFp()));
        return resp;
    }

    /** imageUrls 优先；否则回落单图 imageUrl */
    private String resolveImageUrls(CreatePublicationReq req) {
        if (req.getImageUrls() != null && !req.getImageUrls().isEmpty()) {
            return ImageUrlList.join(req.getImageUrls());
        }
        return StringUtils.hasText(req.getImageUrl()) ? req.getImageUrl().trim() : null;
    }
}
