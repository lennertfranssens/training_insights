package com.traininginsights.repository;

import com.traininginsights.model.GoalProgress;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface GoalProgressRepository extends JpaRepository<GoalProgress, Long> {
    List<GoalProgress> findByGoalIdOrderByCreatedAtDesc(Long goalId);
}
