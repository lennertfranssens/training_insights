package com.traininginsights.model;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
public class Notification {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    private User sender;

    @ManyToOne
    private User recipient;

    @ManyToOne
    private Club club;

    @ManyToOne
    private Group group;

    private String title;
    @Column(length = 4000)
    private String body;

    private Instant createdAt = Instant.now();
    private boolean isRead = false;
    // whether an email for this notification was dispatched and when
    private boolean dispatched = false;
    private Instant sentAt;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public User getSender() { return sender; }
    public void setSender(User sender) { this.sender = sender; }
    public User getRecipient() { return recipient; }
    public void setRecipient(User recipient) { this.recipient = recipient; }
    public Club getClub() { return club; }
    public void setClub(Club club) { this.club = club; }
    public Group getGroup() { return group; }
    public void setGroup(Group group) { this.group = group; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getBody() { return body; }
    public void setBody(String body) { this.body = body; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
    public boolean isRead() { return isRead; }
    public void setRead(boolean read) { isRead = read; }
    public boolean isDispatched() { return dispatched; }
    public void setDispatched(boolean dispatched) { this.dispatched = dispatched; }
    public Instant getSentAt() { return sentAt; }
    public void setSentAt(Instant sentAt) { this.sentAt = sentAt; }
}
