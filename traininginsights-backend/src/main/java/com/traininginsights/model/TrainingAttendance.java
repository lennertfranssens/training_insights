package com.traininginsights.model;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "training_attendance", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"training_id", "user_id"})
})
public class TrainingAttendance {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "training_id")
    private Training training;

    @ManyToOne(optional = false)
    @JoinColumn(name = "user_id")
    private User user;

    @Column(nullable = false)
    private boolean present = false;

    private Instant updatedAt;

    @PrePersist @PreUpdate
    public void touch(){ this.updatedAt = Instant.now(); }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Training getTraining() { return training; }
    public void setTraining(Training training) { this.training = training; }
    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }
    public boolean isPresent() { return present; }
    public void setPresent(boolean present) { this.present = present; }
    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}
