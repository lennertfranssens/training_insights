package com.traininginsights.controller;

import com.traininginsights.model.Goal;
import com.traininginsights.model.GoalFeedback;
import com.traininginsights.model.Season;
import com.traininginsights.model.User;
import com.traininginsights.repository.UserRepository;
import com.traininginsights.repository.SeasonRepository;
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
    private final SeasonRepository seasonRepo;

    public GoalController(GoalService goalService, UserRepository userRepo, SeasonRepository seasonRepo){ this.goalService = goalService; this.userRepo = userRepo; this.seasonRepo = seasonRepo; }

    // create goal (athlete)
    @PreAuthorize("hasRole('ATHLETE')")
    @PostMapping("/api/athlete/goals")
    public Goal createGoal(Authentication auth, @RequestBody Map<String,String> req){
        User user = userRepo.findByEmailIgnoreCase(auth.getName()).orElseThrow();
        Instant start = parseDateFlexible(req.get("start"));
        Instant end = parseDateFlexible(req.get("end"));
        String desc = req.getOrDefault("description", "");
        String sid = req.get("seasonId");
        if (sid == null || sid.isBlank()) throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST, "seasonId is required");
        Long seasonId;
        try { seasonId = Long.parseLong(sid); } catch (NumberFormatException e){ throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST, "seasonId must be a number"); }
    Season s = seasonRepo.findById(seasonId).orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST, "season not found"));
    if (start == null || end == null) throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST, "start and end are required (yyyy-MM-dd)");
    if (end.isBefore(start)) throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST, "end date must be on or after start date");
    // If season has start/end, ensure goal dates fall within
    if (s.getStartDate() != null && start.isBefore(s.getStartDate())) throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST, "start is before season start");
    if (s.getEndDate() != null && end.isAfter(s.getEndDate())) throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST, "end is after season end");
        return goalService.createGoal(user, start, end, desc, s);
    }

    // get own goals (athlete)
    @PreAuthorize("hasRole('ATHLETE')")
    @GetMapping("/api/athlete/goals")
    public List<java.util.Map<String,Object>> myGoals(Authentication auth, @RequestParam(value = "seasonId", required = false) Long seasonId){
        User user = userRepo.findByEmailIgnoreCase(auth.getName()).orElseThrow();
        List<Goal> goals;
        if (seasonId != null) {
            Season s = seasonRepo.findById(seasonId).orElse(null);
            goals = (s == null) ? goalService.forUser(user) : goalService.forUserAndSeason(user, s);
        } else {
            goals = goalService.forUser(user);
        }
        java.util.List<java.util.Map<String,Object>> out = new java.util.ArrayList<>();
        for (var g : goals){
            var m = new java.util.HashMap<String,Object>();
            m.put("id", g.getId()); m.put("startDate", g.getStartDate()); m.put("endDate", g.getEndDate()); m.put("description", g.getDescription());
            m.put("currentProgress", g.getCurrentProgress());
            m.put("cumulativeProgress", g.getCumulativeProgress());
            m.put("completionDate", g.getCompletionDate());
            m.put("feedbacks", goalService.feedbackForGoal(g.getId()));
            m.put("progress", goalService.progressForGoal(g.getId()));
            out.add(m);
        }
        return out;
    }

    // trainer: view athlete goals
    @PreAuthorize("hasAnyRole('TRAINER','ADMIN','SUPERADMIN')")
    @GetMapping("/api/trainers/athletes/{userId}/goals")
    public List<java.util.Map<String,Object>> athleteGoals(Authentication auth, @PathVariable Long userId, @RequestParam(value = "seasonId", required = false) Long seasonId){
        User caller = userRepo.findByEmailIgnoreCase(auth.getName()).orElseThrow();
        User user = userRepo.findById(userId).orElseThrow();
        // permission: caller must be trainer of user's group, or share a club, or be admin/superadmin
        boolean isAdmin = caller.getRoles().stream().anyMatch(r->r.getName().name().equals("ROLE_ADMIN") || r.getName().name().equals("ROLE_SUPERADMIN"));
        boolean trainerOfGroup = user.getGroupEntity() != null && user.getGroupEntity().getTrainers().stream().anyMatch(t->t.getId().equals(caller.getId()));
        boolean sharesClub = caller.getClubs().stream().anyMatch(c -> user.getClubs().stream().anyMatch(uc -> uc.getId().equals(c.getId())));
        if (!isAdmin && !trainerOfGroup && !sharesClub) throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.FORBIDDEN, "Not allowed to view goals for this athlete");

        List<Goal> goals;
        if (seasonId != null) {
            Season s = seasonRepo.findById(seasonId).orElse(null);
            goals = (s == null) ? goalService.forUser(user) : goalService.forUserAndSeason(user, s);
        } else {
            goals = goalService.forUser(user);
        }
        java.util.List<java.util.Map<String,Object>> out = new java.util.ArrayList<>();
        for (var g : goals){
            var m = new java.util.HashMap<String,Object>();
            m.put("id", g.getId()); m.put("startDate", g.getStartDate()); m.put("endDate", g.getEndDate()); m.put("description", g.getDescription());
            m.put("currentProgress", g.getCurrentProgress());
            m.put("cumulativeProgress", g.getCumulativeProgress());
            m.put("completionDate", g.getCompletionDate());
            m.put("feedbacks", goalService.feedbackForGoal(g.getId()));
            m.put("progress", goalService.progressForGoal(g.getId()));
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

    // athlete: add progress update
    @PreAuthorize("hasRole('ATHLETE')")
    @PostMapping("/api/goals/{goalId}/progress")
    public com.traininginsights.model.GoalProgress addProgress(Authentication auth, @PathVariable Long goalId, @RequestBody Map<String,Object> req){
        User athlete = userRepo.findByEmailIgnoreCase(auth.getName()).orElseThrow();
        Goal goal = goalService.findById(goalId);
        if (goal == null) throw new RuntimeException("Goal not found");
        if (!goal.getUser().getId().equals(athlete.getId())) throw new RuntimeException("Not your goal");
        Integer progress = null;
        Object p = req.get("progress"); if (p instanceof Number) progress = ((Number)p).intValue();
        String note = (String) req.getOrDefault("note", "");
        return goalService.addProgress(goal, progress, note);
    }

    // athlete: reset cumulative progress
    @PreAuthorize("hasRole('ATHLETE')")
    @PostMapping("/api/goals/{goalId}/reset")
    public Map<String,Object> reset(Authentication auth, @PathVariable Long goalId){
        User athlete = userRepo.findByEmailIgnoreCase(auth.getName()).orElseThrow();
        Goal goal = goalService.findById(goalId);
        if (goal == null) throw new RuntimeException("Goal not found");
        if (!goal.getUser().getId().equals(athlete.getId())) throw new RuntimeException("Not your goal");
        goal = goalService.resetCumulative(goal);
    return Map.of("id", goal.getId(), "cumulativeProgress", goal.getCumulativeProgress(), "currentProgress", goal.getCurrentProgress(), "completionDate", goal.getCompletionDate());
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
