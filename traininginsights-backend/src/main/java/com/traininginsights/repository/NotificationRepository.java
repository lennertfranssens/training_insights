package com.traininginsights.repository;

import com.traininginsights.model.Notification;
import com.traininginsights.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface NotificationRepository extends JpaRepository<Notification, Long> {
    List<Notification> findByRecipient(User recipient);
    long countByRecipientAndIsReadFalse(User recipient);
}
