package com.hycbox.repository;

import com.hycbox.entity.PublicationEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface PublicationRepository extends JpaRepository<PublicationEntity, String> {

    List<PublicationEntity> findByStatusOrderByCreatedAtDesc(String status);

    List<PublicationEntity> findByAdminIdAndStatusOrderByCreatedAtDesc(String adminId, String status);

    List<PublicationEntity> findByAdminIdOrderByCreatedAtDesc(String adminId);

    List<PublicationEntity> findByStatusAndScopeOrderByCreatedAtDesc(String status, String scope);

    Page<PublicationEntity> findByAdminIdOrderByCreatedAtDesc(String adminId, Pageable pageable);

    Page<PublicationEntity> findByStatusAndScopeOrderByCreatedAtDesc(String status, String scope, Pageable pageable);

    Page<PublicationEntity> findByStatusOrderByCreatedAtDesc(String status, Pageable pageable);

    /**
     * 条件扣库存：remain 不足时更新行数为 0，避免秒杀超卖。
     */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("update PublicationEntity p set p.remainBags = p.remainBags - :qty "
            + "where p.id = :id and p.status = 'active' and p.remainBags >= :qty")
    int tryDeductRemain(@Param("id") String id, @Param("qty") int qty);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("update PublicationEntity p set p.remainBags = p.remainBags + :qty where p.id = :id")
    int restoreRemain(@Param("id") String id, @Param("qty") int qty);

    /**
     * 仅更新 AI 详情缓存，避免 version 为空时 save 误判为 insert。
     */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("update PublicationEntity p set p.aiDetailText = :text, p.aiDetailImageFp = :fp, p.aiDetailAt = :at "
            + "where p.id = :id")
    int updateAiDetail(@Param("id") String id,
                       @Param("text") String text,
                       @Param("fp") String fp,
                       @Param("at") LocalDateTime at);
}
