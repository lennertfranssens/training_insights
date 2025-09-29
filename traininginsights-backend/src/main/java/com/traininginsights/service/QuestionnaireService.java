package com.traininginsights.service;

import com.traininginsights.model.Questionnaire;
import com.traininginsights.repository.QuestionnaireRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class QuestionnaireService {
    private final QuestionnaireRepository repo;
    public QuestionnaireService(QuestionnaireRepository repo){ this.repo = repo; }
    public List<Questionnaire> all(){ return repo.findAll(); }
    public Questionnaire get(Long id){ return repo.findById(id).orElseThrow(); }
    public Questionnaire save(Questionnaire q){ return repo.save(q); }
    public void delete(Long id){ repo.deleteById(id); }
}
