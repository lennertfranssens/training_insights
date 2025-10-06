package com.traininginsights.model;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "email_log")
public class EmailLog {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private Instant sentAt = Instant.now();
    private String toAddress;
    private String subject;
    private Long clubId; // nullable

    public EmailLog() {}
    public EmailLog(String toAddress, String subject, Long clubId){ this.toAddress = toAddress; this.subject = subject; this.clubId = clubId; }
    public Long getId() { return id; }
    public Instant getSentAt() { return sentAt; }
    public String getToAddress() { return toAddress; }
    public String getSubject() { return subject; }
    public Long getClubId() { return clubId; }
}
