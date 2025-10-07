package com.traininginsights.repository;

import com.traininginsights.model.TrainingSeries;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TrainingSeriesRepository extends JpaRepository<TrainingSeries, Long> {
}
