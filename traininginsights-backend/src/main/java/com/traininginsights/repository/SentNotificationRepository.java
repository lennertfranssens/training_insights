package com.traininginsights.repository;

import com.traininginsights.model.SentNotification;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.List;

public interface SentNotificationRepository extends JpaRepository<SentNotification, Long> {
    List<SentNotification> findByTrainingIdAndTypeAndSentAtAfter(Long trainingId, String type, Instant after);
}
