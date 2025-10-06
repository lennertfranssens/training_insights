package com.traininginsights.repository;

import com.traininginsights.model.AppConfig;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface AppConfigRepository extends JpaRepository<AppConfig, Long> {
    Optional<AppConfig> findTopByOrderByIdDesc();
}
