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
        // If questionnaire is daily, allow only one submission per day per user; allow editing that submission on the same day
        Optional<QuestionnaireResponse> existingOpt = find(user, training, questionnaire);
        if (questionnaire.isDaily()){
            if (existingOpt.isPresent()){
                QuestionnaireResponse existing = existingOpt.get();
                // if existing submittedAt is today -> update it
                java.time.LocalDate existingDate = existing.getSubmittedAt() == null ? null : java.time.LocalDate.ofInstant(existing.getSubmittedAt(), java.time.ZoneId.systemDefault());
                java.time.LocalDate today = java.time.LocalDate.now();
                if (existingDate != null && existingDate.equals(today)){
                    existing.setResponses(responsesJson);
                    existing.setSubmittedAt(Instant.now());
                    return repo.save(existing);
                } else {
                    // previous submission exists but not today -> create a new one (unique constraint prevents duplicates only for same training/questionnaire/user)
                    QuestionnaireResponse qr = new QuestionnaireResponse();
                    qr.setUser(user);
                    qr.setTraining(training);
                    qr.setQuestionnaire(questionnaire);
                    qr.setResponses(responsesJson);
                    qr.setSubmittedAt(Instant.now());
                    return repo.save(qr);
                }
            } else {
                QuestionnaireResponse qr = new QuestionnaireResponse();
                qr.setUser(user);
                qr.setTraining(training);
                qr.setQuestionnaire(questionnaire);
                qr.setResponses(responsesJson);
                qr.setSubmittedAt(Instant.now());
                return repo.save(qr);
            }
        }
        // Non-daily: default behavior (upsert)
        QuestionnaireResponse qr = existingOpt.orElseGet(QuestionnaireResponse::new);
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
    public List<QuestionnaireResponse> byQuestionnaire(Questionnaire q){ return repo.findByQuestionnaire(q); }
    public com.fasterxml.jackson.databind.ObjectMapper getObjectMapper(){ return objectMapper; }
}
