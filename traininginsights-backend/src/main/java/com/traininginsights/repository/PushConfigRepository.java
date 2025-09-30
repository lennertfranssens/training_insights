package com.traininginsights.repository;

import com.traininginsights.model.PushConfig;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface PushConfigRepository extends JpaRepository<PushConfig, Long> {
    Optional<PushConfig> findTopByOrderByIdDesc();
}
