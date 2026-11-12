package com.hycbox.repository;

import com.hycbox.entity.OrderEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface OrderRepository extends JpaRepository<OrderEntity, String> {

    List<OrderEntity> findByPublicationIdOrderByCreatedAtDesc(String publicationId);

    List<OrderEntity> findByUserIdOrderByCreatedAtDesc(String userId);

    List<OrderEntity> findByPublicationIdAndStatusOrderByCreatedAtDesc(String publicationId, String status);

    List<OrderEntity> findByPublicationIdInAndStatusOrderByCreatedAtDesc(List<String> publicationIds, String status);

    List<OrderEntity> findByStatusOrderByCreatedAtDesc(String status);

    Page<OrderEntity> findByUserIdOrderByCreatedAtDesc(String userId, Pageable pageable);

    Page<OrderEntity> findByPublicationIdOrderByCreatedAtDesc(String publicationId, Pageable pageable);

    Page<OrderEntity> findByPublicationIdAndStatusOrderByCreatedAtDesc(String publicationId, String status, Pageable pageable);

    Page<OrderEntity> findByUserIdAndPublicationIdOrderByCreatedAtDesc(String userId, String publicationId, Pageable pageable);

    Page<OrderEntity> findByUserIdAndStatusOrderByCreatedAtDesc(String userId, String status, Pageable pageable);

    Page<OrderEntity> findByUserIdAndPublicationIdAndStatusOrderByCreatedAtDesc(
            String userId, String publicationId, String status, Pageable pageable);
}
