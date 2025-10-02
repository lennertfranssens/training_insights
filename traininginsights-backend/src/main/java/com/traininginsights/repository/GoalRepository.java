package com.traininginsights.repository;

import com.traininginsights.model.Goal;
import com.traininginsights.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import com.traininginsights.model.Season;

public interface GoalRepository extends JpaRepository<Goal, Long> {
    List<Goal> findByUser(User user);
    List<Goal> findByUserAndSeason(User user, Season season);
    List<Goal> findByUserAndSeasonIsNotNull(User user);
}
