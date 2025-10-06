package com.traininginsights.repository;

import com.traininginsights.model.EmailLog;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EmailLogRepository extends JpaRepository<EmailLog, Long> {
    long countByClubId(Long clubId);
}
