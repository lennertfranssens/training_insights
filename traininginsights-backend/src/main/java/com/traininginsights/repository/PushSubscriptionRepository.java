package com.traininginsights.repository;

import com.traininginsights.model.PushSubscription;
import com.traininginsights.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface PushSubscriptionRepository extends JpaRepository<PushSubscription, Long> {
    List<PushSubscription> findByUser(User user);
}
