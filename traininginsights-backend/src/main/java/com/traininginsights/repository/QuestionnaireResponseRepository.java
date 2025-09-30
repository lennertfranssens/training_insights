package com.traininginsights.repository;

import com.traininginsights.model.Questionnaire;
import com.traininginsights.model.QuestionnaireResponse;
import com.traininginsights.model.Training;
import com.traininginsights.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface QuestionnaireResponseRepository extends JpaRepository<QuestionnaireResponse, Long> {
    Optional<QuestionnaireResponse> findByUserAndTrainingAndQuestionnaire(User user, Training training, Questionnaire questionnaire);
    List<QuestionnaireResponse> findByTraining(Training training);
    List<QuestionnaireResponse> findByUser(User user);
    List<QuestionnaireResponse> findByQuestionnaire(Questionnaire questionnaire);
}
