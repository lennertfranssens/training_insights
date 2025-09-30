package com.traininginsights.repository;

import com.traininginsights.model.GoalFeedback;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface GoalFeedbackRepository extends JpaRepository<GoalFeedback, Long> {
    List<GoalFeedback> findByGoalId(Long goalId);
}
