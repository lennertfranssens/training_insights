package com.traininginsights.controller;

import com.traininginsights.dto.QuestionnaireResponseDtos;
import com.traininginsights.model.*;
import com.traininginsights.repository.QuestionnaireRepository;
import com.traininginsights.repository.TrainingRepository;
import com.traininginsights.repository.UserRepository;
import com.traininginsights.service.QuestionnaireResponseService;
import com.traininginsights.service.TrainingService;
import com.traininginsights.service.TrainingAttendanceService;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
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
    private final TrainingAttendanceService attendanceService;

    public AthleteController(UserRepository userRepository,
                             TrainingService trainingService,
                             TrainingRepository trainingRepository,
                             QuestionnaireRepository questionnaireRepository,
                             QuestionnaireResponseService responseService,
                             TrainingAttendanceService attendanceService) {
        this.userRepository = userRepository;
        this.trainingService = trainingService;
        this.trainingRepository = trainingRepository;
        this.questionnaireRepository = questionnaireRepository;
        this.responseService = responseService;
        this.attendanceService = attendanceService;
    }

    @GetMapping("/trainings/upcoming")
    @Transactional(readOnly = true)
    public List<Training> upcomingTrainings(Authentication auth){
        User athlete = userRepository.findByEmailIgnoreCase(auth.getName()).orElseThrow();
        Group g = athlete.getGroupEntity();
        if (g == null) return List.of();
        return trainingService.upcomingForGroup(g);
    }

    @GetMapping("/trainings/all")
    @Transactional(readOnly = true)
    public List<Training> allTrainings(Authentication auth){
        User athlete = userRepository.findByEmailIgnoreCase(auth.getName()).orElseThrow();
        Group g = athlete.getGroupEntity();
        if (g == null) return List.of();
        return trainingService.allForGroup(g);
    }

    @GetMapping("/questionnaires/pending")
    @Transactional(readOnly = true)
    public List<Map<String,Object>> pendingQuestionnaires(Authentication auth){
        User athlete = userRepository.findByEmailIgnoreCase(auth.getName()).orElseThrow();
        Group g = athlete.getGroupEntity();
        if (g == null) return List.of();
        Instant now = Instant.now();
        List<Map<String,Object>> pending = new ArrayList<>();
        for (Training t : trainingRepository.findAll()) {
            // visibility should only affect description/attachments; questionnaires remain available to athletes
            if (t.getGroups() == null || !t.getGroups().contains(g)) continue;
            if (t.getPreQuestionnaire() != null && t.getTrainingTime().isAfter(now)) {
                boolean filled = responseService.find(athlete, t, t.getPreQuestionnaire(), "PRE").isPresent();
                if (!filled) {
                    Map<String,Object> item = new HashMap<>();
                    item.put("trainingId", t.getId());
                    item.put("questionnaireId", t.getPreQuestionnaire().getId());
                    item.put("type", "PRE");
                    pending.add(item);
                }
            }
            if (t.getPostQuestionnaire() != null && t.getTrainingTime().isBefore(now)) {
                boolean filled = responseService.find(athlete, t, t.getPostQuestionnaire(), "POST").isPresent();
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
        String phase = req.phase != null ? req.phase : "DEFAULT";
        return responseService.submit(athlete, t, q, phase, req.responses);
    }

    @GetMapping("/questionnaires/filled")
    @Transactional(readOnly = true)
    public List<QuestionnaireResponse> filledQuestionnaires(Authentication auth){
        User athlete = userRepository.findByEmailIgnoreCase(auth.getName()).orElseThrow();
        return responseService.byUser(athlete);
    }

    @GetMapping("/trainings/{id}/view")
    @Transactional(readOnly = true)
    public Map<String,Object> viewTraining(Authentication auth, @PathVariable Long id){
        User athlete = userRepository.findByEmailIgnoreCase(auth.getName()).orElseThrow();
        Training t = trainingRepository.findById(id).orElseThrow();
        Group g = athlete.getGroupEntity();
        // ensure athlete belongs to one of the training groups
        if (g == null || t.getGroups() == null || t.getGroups().stream().noneMatch(gr -> gr.getId() != null && gr.getId().equals(g.getId()))){
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You are not allowed to view this training");
        }
        Map<String,Object> res = new HashMap<>();
        res.put("id", t.getId());
        res.put("title", t.getTitle());
        res.put("trainingTime", t.getTrainingTime());
    res.put("trainingEndTime", t.getTrainingEndTime());
        res.put("visibleToAthletes", t.isVisibleToAthletes());
        res.put("groups", t.getGroups());
        // If training is visible to athletes, include description and questionnaires
        if (t.isVisibleToAthletes()){
            res.put("description", t.getDescription());
            res.put("preQuestionnaire", t.getPreQuestionnaire());
            res.put("postQuestionnaire", t.getPostQuestionnaire());
        } else {
            // limited info
            res.put("description", null);
            res.put("preQuestionnaire", t.getPreQuestionnaire() != null ? Map.of("id", t.getPreQuestionnaire().getId()) : null);
            res.put("postQuestionnaire", t.getPostQuestionnaire() != null ? Map.of("id", t.getPostQuestionnaire().getId()) : null);
        }
        // include current athlete presence (if any)
        var taOpt = attendanceService.byTraining(t).stream().filter(a -> a.getUser().getId().equals(athlete.getId())).findFirst();
        res.put("myPresence", taOpt.map(a -> Map.of(
                "present", a.isPresent(),
                "updatedAt", a.getUpdatedAt()
        )).orElse(null));
        return res;
    }

    // Athlete self presence endpoints
    @GetMapping("/trainings/{id}/presence")
    @Transactional(readOnly = true)
    public Map<String,Object> getMyPresence(Authentication auth, @PathVariable Long id){
        User athlete = userRepository.findByEmailIgnoreCase(auth.getName()).orElseThrow();
        Training t = trainingRepository.findById(id).orElseThrow();
        Group g = athlete.getGroupEntity();
        if (g == null || t.getGroups() == null || t.getGroups().stream().noneMatch(gr -> gr.getId() != null && gr.getId().equals(g.getId()))){
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You are not allowed to access this training");
        }
        var ta = attendanceService.byTraining(t).stream().filter(a -> a.getUser().getId().equals(athlete.getId())).findFirst().orElse(null);
        boolean present = ta != null && ta.isPresent();
        return Map.of("trainingId", t.getId(), "present", present, "updatedAt", ta != null ? ta.getUpdatedAt() : null);
    }

    @PostMapping("/trainings/{id}/presence")
    @Transactional
    public Map<String,Object> setMyPresence(Authentication auth, @PathVariable Long id, @RequestBody Map<String,Object> body){
        User athlete = userRepository.findByEmailIgnoreCase(auth.getName()).orElseThrow();
        Training t = trainingRepository.findById(id).orElseThrow();
        Group g = athlete.getGroupEntity();
        if (g == null || t.getGroups() == null || t.getGroups().stream().noneMatch(gr -> gr.getId() != null && gr.getId().equals(g.getId()))){
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You are not allowed to modify presence for this training");
        }
        Object pv = body.get("present");
        if (pv == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "present required");
        boolean present = Boolean.parseBoolean(String.valueOf(pv));
        var ta = attendanceService.setPresence(t, athlete, present);
        return Map.of("id", ta.getId(), "trainingId", t.getId(), "present", ta.isPresent(), "updatedAt", ta.getUpdatedAt());
    }
}
