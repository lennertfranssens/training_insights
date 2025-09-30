package com.traininginsights.service;

import com.traininginsights.model.Goal;
import com.traininginsights.model.GoalFeedback;
import com.traininginsights.model.User;
import com.traininginsights.repository.GoalFeedbackRepository;
import com.traininginsights.repository.GoalRepository;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;

@Service
public class GoalService {
    private final GoalRepository goalRepository;
    private final GoalFeedbackRepository feedbackRepository;

    public GoalService(GoalRepository goalRepository, GoalFeedbackRepository feedbackRepository) {
        this.goalRepository = goalRepository;
        this.feedbackRepository = feedbackRepository;
    }

    public Goal createGoal(User user, Instant start, Instant end, String description){
        Goal g = new Goal();
        g.setUser(user);
        g.setStartDate(start);
        g.setEndDate(end);
        g.setDescription(description);
        return goalRepository.save(g);
    }

    public List<Goal> forUser(User user){ return goalRepository.findByUser(user); }
    public List<Goal> forUserId(User user){ return goalRepository.findByUser(user); }
    public Goal findById(Long id){ return goalRepository.findById(id).orElse(null); }

    public GoalFeedback addFeedback(Goal goal, User trainer, String comment){
        GoalFeedback fb = new GoalFeedback();
        fb.setGoal(goal); fb.setTrainer(trainer); fb.setComment(comment); fb.setCreatedAt(Instant.now());
        return feedbackRepository.save(fb);
    }

    public List<GoalFeedback> feedbackForGoal(Long goalId){ return feedbackRepository.findByGoalId(goalId); }
}
