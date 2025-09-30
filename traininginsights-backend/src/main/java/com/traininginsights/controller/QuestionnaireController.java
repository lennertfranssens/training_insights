package com.traininginsights.controller;

import com.traininginsights.dto.QuestionnaireDtos;
import com.traininginsights.model.Questionnaire;
import com.traininginsights.model.User;
import com.traininginsights.repository.UserRepository;
import com.traininginsights.service.QuestionnaireService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.HashMap;
// import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/questionnaires")
public class QuestionnaireController {
    private final QuestionnaireService service;
    private final UserRepository userRepository;
    private final com.traininginsights.service.QuestionnaireResponseService responseService;
    public QuestionnaireController(QuestionnaireService service, UserRepository userRepository, com.traininginsights.service.QuestionnaireResponseService responseService){
        this.service = service; this.userRepository = userRepository; this.responseService = responseService;
    }

    @GetMapping public List<Questionnaire> all(){ return service.all(); }
    @GetMapping("/{id}") public Questionnaire get(@PathVariable Long id){ return service.get(id); }

    @PreAuthorize("hasAnyRole('TRAINER','ADMIN','SUPERADMIN')")
    @PostMapping
    public Questionnaire create(@RequestBody QuestionnaireDtos.QuestionnaireDTO dto, Authentication auth){
        User creator = userRepository.findByEmailIgnoreCase(auth.getName()).orElseThrow();
        Questionnaire q = new Questionnaire();
        q.setTitle(dto.title);
        q.setStructure(dto.structure);
        if (dto.daily != null) q.setDaily(dto.daily);
        q.setCreator(creator);
        return service.save(q);
    }

    @PreAuthorize("hasAnyRole('TRAINER','ADMIN','SUPERADMIN')")
    @PutMapping("/{id}")
    public Questionnaire update(@PathVariable Long id, @RequestBody QuestionnaireDtos.QuestionnaireDTO dto){
        Questionnaire q = service.get(id);
        if (dto.title != null) q.setTitle(dto.title);
        if (dto.structure != null) q.setStructure(dto.structure);
        if (dto.daily != null) q.setDaily(dto.daily);
        return service.save(q);
    }

    @PreAuthorize("hasAnyRole('TRAINER','ADMIN','SUPERADMIN')")
    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id){ service.delete(id); }

    @PreAuthorize("hasAnyRole('TRAINER','ADMIN','SUPERADMIN')")
    @GetMapping("/{id}/aggregations")
    public Map<String,Object> aggregations(@PathVariable Long id){
    Questionnaire q = service.get(id);
    var responses = responseService.byQuestionnaire(q);
        Map<String,Object> out = new HashMap<>();
        // overall numeric averages for top-level numeric fields
        // gather all field names by parsing first response
        double avgScore = 0.0; int count=0;
        // naive approach: if responses have numeric 'score' field, compute average
        for (var r : responses){
            try {
                var node = responseService.getObjectMapper().readTree(r.getResponses());
                if (node.has("score") && node.get("score").isNumber()){
                    avgScore += node.get("score").asDouble(); count++;
                }
            } catch (Exception ignored){}
        }
        out.put("averageScore", count==0?0.0:avgScore/count);

        // group by athlete category
        Map<String, Double> byCategory = new HashMap<>();
        Map<String, Integer> byCategoryCount = new HashMap<>();
        for (var r : responses){
            var user = r.getUser();
            var cat = user.getAthleteCategory() == null ? "UNKNOWN" : user.getAthleteCategory().name();
            try {
                var node = responseService.getObjectMapper().readTree(r.getResponses());
                if (node.has("score") && node.get("score").isNumber()){
                    double v = node.get("score").asDouble();
                    byCategory.put(cat, byCategory.getOrDefault(cat, 0.0) + v);
                    byCategoryCount.put(cat, byCategoryCount.getOrDefault(cat, 0) + 1);
                }
            } catch (Exception ignored){}
        }
        Map<String, Double> byCategoryAvg = new HashMap<>();
        for (var e : byCategory.entrySet()){
            byCategoryAvg.put(e.getKey(), e.getValue() / byCategoryCount.getOrDefault(e.getKey(),1));
        }
        out.put("byCategory", byCategoryAvg);

        // group by age buckets (e.g., <18,18-30,31-45,46+)
        Map<String, Double> ageSum = new HashMap<>();
        Map<String, Integer> ageCount = new HashMap<>();
        for (var r : responses){
            var user = r.getUser();
            String bucket = "UNKNOWN";
            if (user.getBirthDate() != null){
                int age = java.time.Period.between(user.getBirthDate(), java.time.LocalDate.now()).getYears();
                if (age < 18) bucket = "<18";
                else if (age <= 30) bucket = "18-30";
                else if (age <= 45) bucket = "31-45";
                else bucket = "46+";
            }
            try {
                var node = responseService.getObjectMapper().readTree(r.getResponses());
                if (node.has("score") && node.get("score").isNumber()){
                    double v = node.get("score").asDouble();
                    ageSum.put(bucket, ageSum.getOrDefault(bucket, 0.0) + v);
                    ageCount.put(bucket, ageCount.getOrDefault(bucket, 0) + 1);
                }
            } catch (Exception ignored){}
        }
        Map<String, Double> ageAvg = new HashMap<>();
        for (var e : ageSum.entrySet()){
            ageAvg.put(e.getKey(), e.getValue() / ageCount.getOrDefault(e.getKey(),1));
        }
        out.put("byAgeBucket", ageAvg);
        return out;
    }
}
