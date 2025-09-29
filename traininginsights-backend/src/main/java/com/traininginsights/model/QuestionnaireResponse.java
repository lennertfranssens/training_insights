package com.traininginsights.model;

import jakarta.persistence.*;

import java.time.Instant;

@Entity
@Table(name = "questionnaire_responses",
        uniqueConstraints = @UniqueConstraint(name = "uq_user_training_questionnaire",
                columnNames = {"user_id","training_id","questionnaire_id"}))
public class QuestionnaireResponse {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne @JoinColumn(name = "user_id")
    private User user;

    @ManyToOne @JoinColumn(name = "training_id")
    private Training training;

    @ManyToOne @JoinColumn(name = "questionnaire_id")
    private Questionnaire questionnaire;

    private Instant submittedAt;

    @Lob
    @Column(columnDefinition = "TEXT")
    private String responses; // JSON payload

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }

    public Training getTraining() { return training; }
    public void setTraining(Training training) { this.training = training; }

    public Questionnaire getQuestionnaire() { return questionnaire; }
    public void setQuestionnaire(Questionnaire questionnaire) { this.questionnaire = questionnaire; }

    public Instant getSubmittedAt() { return submittedAt; }
    public void setSubmittedAt(Instant submittedAt) { this.submittedAt = submittedAt; }

    public String getResponses() { return responses; }
    public void setResponses(String responses) { this.responses = responses; }
}
