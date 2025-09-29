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

@RestController
@RequestMapping("/api/questionnaires")
public class QuestionnaireController {
    private final QuestionnaireService service;
    private final UserRepository userRepository;
    public QuestionnaireController(QuestionnaireService service, UserRepository userRepository){
        this.service = service; this.userRepository = userRepository;
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
        q.setCreator(creator);
        return service.save(q);
    }

    @PreAuthorize("hasAnyRole('TRAINER','ADMIN','SUPERADMIN')")
    @PutMapping("/{id}")
    public Questionnaire update(@PathVariable Long id, @RequestBody QuestionnaireDtos.QuestionnaireDTO dto){
        Questionnaire q = service.get(id);
        if (dto.title != null) q.setTitle(dto.title);
        if (dto.structure != null) q.setStructure(dto.structure);
        return service.save(q);
    }

    @PreAuthorize("hasAnyRole('TRAINER','ADMIN','SUPERADMIN')")
    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id){ service.delete(id); }
}
