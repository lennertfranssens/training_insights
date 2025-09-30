package com.traininginsights.controller;

import com.traininginsights.model.Goal;
import com.traininginsights.model.GoalFeedback;
import com.traininginsights.model.User;
import com.traininginsights.repository.UserRepository;
import com.traininginsights.service.GoalService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;
import java.util.Map;

@RestController
public class GoalController {
    private final GoalService goalService;
    private final UserRepository userRepo;

    public GoalController(GoalService goalService, UserRepository userRepo){ this.goalService = goalService; this.userRepo = userRepo; }

    // create goal (athlete)
    @PreAuthorize("hasRole('ATHLETE')")
    @PostMapping("/api/athlete/goals")
    public Goal createGoal(Authentication auth, @RequestBody Map<String,String> req){
        User user = userRepo.findByEmailIgnoreCase(auth.getName()).orElseThrow();
        Instant start = parseDateFlexible(req.get("start"));
        Instant end = parseDateFlexible(req.get("end"));
        String desc = req.getOrDefault("description", "");
        return goalService.createGoal(user, start, end, desc);
    }

    // get own goals (athlete)
    @PreAuthorize("hasRole('ATHLETE')")
    @GetMapping("/api/athlete/goals")
    public List<java.util.Map<String,Object>> myGoals(Authentication auth){
        User user = userRepo.findByEmailIgnoreCase(auth.getName()).orElseThrow();
        var goals = goalService.forUser(user);
        java.util.List<java.util.Map<String,Object>> out = new java.util.ArrayList<>();
        for (var g : goals){
            var m = new java.util.HashMap<String,Object>();
            m.put("id", g.getId()); m.put("startDate", g.getStartDate()); m.put("endDate", g.getEndDate()); m.put("description", g.getDescription());
            m.put("feedbacks", goalService.feedbackForGoal(g.getId()));
            out.add(m);
        }
        return out;
    }

    // trainer: view athlete goals
    @PreAuthorize("hasAnyRole('TRAINER','ADMIN','SUPERADMIN')")
    @GetMapping("/api/trainers/athletes/{userId}/goals")
    public List<java.util.Map<String,Object>> athleteGoals(@PathVariable Long userId){
        var user = userRepo.findById(userId).orElseThrow();
        var goals = goalService.forUser(user);
        java.util.List<java.util.Map<String,Object>> out = new java.util.ArrayList<>();
        for (var g : goals){
            var m = new java.util.HashMap<String,Object>();
            m.put("id", g.getId()); m.put("startDate", g.getStartDate()); m.put("endDate", g.getEndDate()); m.put("description", g.getDescription());
            m.put("feedbacks", goalService.feedbackForGoal(g.getId()));
            out.add(m);
        }
        return out;
    }

    // trainer: add feedback
    @PreAuthorize("hasAnyRole('TRAINER','ADMIN','SUPERADMIN')")
    @PostMapping("/api/goals/{goalId}/feedback")
    public GoalFeedback addFeedback(Authentication auth, @PathVariable Long goalId, @RequestBody Map<String,String> req){
        User trainer = userRepo.findByEmailIgnoreCase(auth.getName()).orElseThrow();
        Goal goal = goalService.findById(goalId);
        if (goal == null) throw new RuntimeException("Goal not found");
        String comment = req.getOrDefault("comment", "");
        return goalService.addFeedback(goal, trainer, comment);
    }

    // flexible date parser: supports Instant ISO, yyyy-MM-dd, and dd/MM/yyyy (local zone)
    private Instant parseDateFlexible(String s){
        if (s == null) return null;
        try { return Instant.parse(s); } catch (Exception ignored){}
        try { // try ISO local date yyyy-MM-dd
            java.time.LocalDate ld = java.time.LocalDate.parse(s);
            return ld.atStartOfDay(java.time.ZoneId.systemDefault()).toInstant();
        } catch (Exception ignored){}
        try { java.time.format.DateTimeFormatter f = java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy"); java.time.LocalDate ld = java.time.LocalDate.parse(s, f); return ld.atStartOfDay(java.time.ZoneId.systemDefault()).toInstant(); } catch (Exception ignored){}
        return null;
    }
}
