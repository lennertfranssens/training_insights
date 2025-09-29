package com.traininginsights.controller;

import com.traininginsights.dto.QuestionnaireResponseDtos;
import com.traininginsights.model.*;
import com.traininginsights.repository.QuestionnaireRepository;
import com.traininginsights.repository.TrainingRepository;
import com.traininginsights.repository.UserRepository;
import com.traininginsights.service.QuestionnaireResponseService;
import com.traininginsights.service.TrainingService;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.*;

@RestController
@RequestMapping("/api/athlete")
public class AthleteController {

    private final UserRepository userRepository;
    private final TrainingService trainingService;
    private final TrainingRepository trainingRepository;
    private final QuestionnaireRepository questionnaireRepository;
    private final QuestionnaireResponseService responseService;

    public AthleteController(UserRepository userRepository, TrainingService trainingService, TrainingRepository trainingRepository, QuestionnaireRepository questionnaireRepository, QuestionnaireResponseService responseService) {
        this.userRepository = userRepository;
        this.trainingService = trainingService;
        this.trainingRepository = trainingRepository;
        this.questionnaireRepository = questionnaireRepository;
        this.responseService = responseService;
    }

    @GetMapping("/trainings/upcoming")
    public List<Training> upcomingTrainings(Authentication auth){
        User athlete = userRepository.findByEmailIgnoreCase(auth.getName()).orElseThrow();
        Group g = athlete.getGroupEntity();
        if (g == null) return List.of();
        return trainingService.upcomingForGroup(g);
    }

    @GetMapping("/questionnaires/pending")
    public List<Map<String,Object>> pendingQuestionnaires(Authentication auth){
        User athlete = userRepository.findByEmailIgnoreCase(auth.getName()).orElseThrow();
        Group g = athlete.getGroupEntity();
        if (g == null) return List.of();
        Instant now = Instant.now();
        List<Map<String,Object>> pending = new ArrayList<>();
        for (Training t : trainingRepository.findAll()) {
            if (!t.isVisibleToAthletes()) continue;
            if (t.getGroups() == null || !t.getGroups().contains(g)) continue;
            if (t.getPreQuestionnaire() != null && t.getTrainingTime().isAfter(now)) {
                boolean filled = responseService.find(athlete, t, t.getPreQuestionnaire()).isPresent();
                if (!filled) {
                    Map<String,Object> item = new HashMap<>();
                    item.put("trainingId", t.getId());
                    item.put("questionnaireId", t.getPreQuestionnaire().getId());
                    item.put("type", "PRE");
                    pending.add(item);
                }
            }
            if (t.getPostQuestionnaire() != null && t.getTrainingTime().isBefore(now)) {
                boolean filled = responseService.find(athlete, t, t.getPostQuestionnaire()).isPresent();
                if (!filled) {
                    Map<String,Object> item = new HashMap<>();
                    item.put("trainingId", t.getId());
                    item.put("questionnaireId", t.getPostQuestionnaire().getId());
                    item.put("type", "POST");
                    pending.add(item);
                }
            }
        }
        return pending;
    }

    @PostMapping("/questionnaires/submit")
    public QuestionnaireResponse submit(Authentication auth, @RequestBody QuestionnaireResponseDtos.SubmitResponseRequest req){
        User athlete = userRepository.findByEmailIgnoreCase(auth.getName()).orElseThrow();
        Training t = req.trainingId != null ? trainingRepository.findById(req.trainingId).orElse(null) : null;
        Questionnaire q = questionnaireRepository.findById(req.questionnaireId).orElseThrow();
        return responseService.submit(athlete, t, q, req.responses);
    }
}
