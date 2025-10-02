package com.traininginsights.service;

import com.traininginsights.model.Group;
import com.traininginsights.model.Training;
import com.traininginsights.model.TrainingAttendance;
import com.traininginsights.model.User;
import com.traininginsights.repository.TrainingAttendanceRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
public class TrainingAttendanceService {
    private final TrainingAttendanceRepository repo;
    private final TrainingService trainingService;
    public TrainingAttendanceService(TrainingAttendanceRepository repo, TrainingService trainingService){
        this.repo = repo; this.trainingService = trainingService;
    }

    @Transactional
    public TrainingAttendance setPresence(Training training, User athlete, boolean present){
        TrainingAttendance ta = repo.findByTrainingAndUser(training, athlete).orElseGet(() -> {
            TrainingAttendance x = new TrainingAttendance(); x.setTraining(training); x.setUser(athlete); return x;
        });
        ta.setPresent(present);
        return repo.save(ta);
    }

    @Transactional(readOnly = true)
    public List<TrainingAttendance> byTraining(Training t){ return repo.findByTraining(t); }

    // Presence rate per training over eligible athletes (athletes in the training's groups)
    @Transactional(readOnly = true)
    public double trainingPresenceRate(Training t){
        // Collect eligible athletes from the training groups
        Set<Long> eligibleAthleteIds = new HashSet<>();
        if (t.getGroups() != null) {
            for (var g : t.getGroups()) {
                for (var a : g.getAthletes()) eligibleAthleteIds.add(a.getId());
            }
        }
        int total = eligibleAthleteIds.size();
        if (total == 0) return 0.0;
        List<TrainingAttendance> list = repo.findByTraining(t);
        long present = list.stream().filter(ta -> ta.isPresent() && eligibleAthleteIds.contains(ta.getUser().getId())).count();
        return (double) present / (double) total;
    }

    // Presence rate for an athlete across all trainings of their group
    @Transactional(readOnly = true)
    public double athletePresenceRate(User athlete){
        Group g = athlete.getGroupEntity();
        if (g == null) return 0.0;
        List<Training> trainings = trainingService.findByGroupId(g.getId());
        int total = trainings.size();
        if (total == 0) return 0.0;
        int present = 0;
        for (Training t : trainings){
            var ta = repo.findByTrainingAndUser(t, athlete).orElse(null);
            if (ta != null && ta.isPresent()) present++;
        }
        return (double) present / (double) total;
    }
}
