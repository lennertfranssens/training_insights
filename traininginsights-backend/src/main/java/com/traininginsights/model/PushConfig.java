package com.traininginsights.model;

import jakarta.persistence.*;

@Entity
@Table(name = "push_config")
public class PushConfig {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(columnDefinition = "TEXT")
    private String vapidPublic;

    @Column(columnDefinition = "TEXT")
    private String vapidPrivate;

    private String subject;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getVapidPublic() { return vapidPublic; }
    public void setVapidPublic(String vapidPublic) { this.vapidPublic = vapidPublic; }
    public String getVapidPrivate() { return vapidPrivate; }
    public void setVapidPrivate(String vapidPrivate) { this.vapidPrivate = vapidPrivate; }
    public String getSubject() { return subject; }
    public void setSubject(String subject) { this.subject = subject; }
}
