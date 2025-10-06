package com.traininginsights.repository;

import com.traininginsights.model.BaseUrlConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface BaseUrlConfigRepository extends JpaRepository<BaseUrlConfig, Long> {
    Optional<BaseUrlConfig> findTopByOrderByIdDesc();
}
