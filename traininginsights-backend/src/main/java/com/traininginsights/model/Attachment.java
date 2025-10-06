package com.traininginsights.model;

import jakarta.persistence.*;

@Entity
@Table(name = "attachments")
public class Attachment {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String filename;
    private String contentType;
    private String path;

    @ManyToOne
    @JoinColumn(name = "training_id")
    private Training training;

    @ManyToOne
    @JoinColumn(name = "notification_id")
    private Notification notification;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getFilename() { return filename; }
    public void setFilename(String filename) { this.filename = filename; }

    public String getContentType() { return contentType; }
    public void setContentType(String contentType) { this.contentType = contentType; }

    public String getPath() { return path; }
    public void setPath(String path) { this.path = path; }

    public Training getTraining() { return training; }
    public void setTraining(Training training) { this.training = training; }

    public Notification getNotification() { return notification; }
    public void setNotification(Notification notification) { this.notification = notification; }
}
