package com.traininginsights.repository;

import com.traininginsights.model.PasswordResetLog;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PasswordResetLogRepository extends JpaRepository<PasswordResetLog, Long> {
    long countByUserId(Long userId);
}
