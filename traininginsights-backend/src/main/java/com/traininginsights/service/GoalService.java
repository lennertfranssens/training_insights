package com.traininginsights.service;

import com.traininginsights.model.Goal;
import com.traininginsights.model.GoalFeedback;
import com.traininginsights.model.GoalProgress;
import com.traininginsights.model.Season;
import com.traininginsights.model.User;
import com.traininginsights.repository.GoalFeedbackRepository;
import com.traininginsights.repository.GoalProgressRepository;
import com.traininginsights.repository.GoalRepository;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;

@Service
public class GoalService {
    private final GoalRepository goalRepository;
    private final GoalFeedbackRepository feedbackRepository;
    private final GoalProgressRepository progressRepository;

    public GoalService(GoalRepository goalRepository, GoalFeedbackRepository feedbackRepository, GoalProgressRepository progressRepository) {
        this.goalRepository = goalRepository;
        this.feedbackRepository = feedbackRepository;
        this.progressRepository = progressRepository;
    }

    public Goal createGoal(User user, Instant start, Instant end, String description){
        Goal g = new Goal();
        g.setUser(user);
        g.setStartDate(start);
        g.setEndDate(end);
        g.setDescription(description);
        return goalRepository.save(g);
    }

    public Goal createGoal(User user, Instant start, Instant end, String description, Season season){
        Goal g = new Goal();
        g.setUser(user);
        g.setSeason(season);
        g.setStartDate(start);
        g.setEndDate(end);
        g.setDescription(description);
        return goalRepository.save(g);
    }

    public List<Goal> forUser(User user){ return goalRepository.findByUserAndSeasonIsNotNull(user); }
    public List<Goal> forUserAndSeason(User user, com.traininginsights.model.Season season){ return goalRepository.findByUserAndSeason(user, season); }
    public List<Goal> forUserId(User user){ return goalRepository.findByUser(user); }
    public Goal findById(Long id){ return goalRepository.findById(id).orElse(null); }

    public GoalFeedback addFeedback(Goal goal, User trainer, String comment){
        GoalFeedback fb = new GoalFeedback();
        fb.setGoal(goal); fb.setTrainer(trainer); fb.setComment(comment); fb.setCreatedAt(Instant.now());
        return feedbackRepository.save(fb);
    }

    public List<GoalFeedback> feedbackForGoal(Long goalId){ return feedbackRepository.findByGoalId(goalId); }

    public GoalProgress addProgress(Goal goal, Integer progress, String note){
        if (progress == null) progress = 0;
        if (progress < 0) progress = 0; if (progress > 100) progress = 100;
        GoalProgress gp = new GoalProgress();
        gp.setGoal(goal); gp.setProgress(progress); gp.setNote(note); gp.setCreatedAt(Instant.now());
        goal.setCurrentProgress(progress);
        goalRepository.save(goal);
        return progressRepository.save(gp);
    }

    public List<GoalProgress> progressForGoal(Long goalId){ return progressRepository.findByGoalIdOrderByCreatedAtDesc(goalId); }
}
