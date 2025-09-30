package com.traininginsights.model;

import jakarta.persistence.*;

import java.time.Instant;

@Entity
@Table(name = "sent_notifications")
public class SentNotification {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long trainingId;

    private String type; // e.g., PRE_QUESTIONNAIRE

    private Instant sentAt;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getTrainingId() { return trainingId; }
    public void setTrainingId(Long trainingId) { this.trainingId = trainingId; }
    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
    public Instant getSentAt() { return sentAt; }
    public void setSentAt(Instant sentAt) { this.sentAt = sentAt; }
}
