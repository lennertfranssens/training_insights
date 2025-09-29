package com.traininginsights.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.traininginsights.model.*;
import com.traininginsights.repository.QuestionnaireResponseRepository;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Service
public class QuestionnaireResponseService {
    private final QuestionnaireResponseRepository repo;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public QuestionnaireResponseService(QuestionnaireResponseRepository repo) { this.repo = repo; }

    public Optional<QuestionnaireResponse> find(User user, Training training, Questionnaire questionnaire){
        return repo.findByUserAndTrainingAndQuestionnaire(user, training, questionnaire);
    }

    public QuestionnaireResponse submit(User user, Training training, Questionnaire questionnaire, String responsesJson){
        QuestionnaireResponse qr = find(user, training, questionnaire).orElseGet(QuestionnaireResponse::new);
        qr.setUser(user);
        qr.setTraining(training);
        qr.setQuestionnaire(questionnaire);
        qr.setResponses(responsesJson);
        qr.setSubmittedAt(Instant.now());
        return repo.save(qr);
    }

    public double extractNumericFieldAverage(List<QuestionnaireResponse> responses, String fieldName){
        double sum=0; int count=0;
        for (QuestionnaireResponse r : responses){
            try {
                JsonNode node = objectMapper.readTree(r.getResponses());
                if (node.has(fieldName) && node.get(fieldName).isNumber()){
                    sum += node.get(fieldName).asDouble();
                    count++;
                }
            } catch (Exception ignored){}
        }
        return count==0 ? 0.0 : sum / count;
    }

    public List<QuestionnaireResponse> byTraining(Training t){ return repo.findByTraining(t); }
    public List<QuestionnaireResponse> byUser(User u){ return repo.findByUser(u); }
}
