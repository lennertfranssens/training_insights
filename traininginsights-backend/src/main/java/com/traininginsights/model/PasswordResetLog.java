package com.traininginsights.model;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "password_reset_log")
public class PasswordResetLog {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private Instant resetAt = Instant.now();
    private Long userId;
    public PasswordResetLog() {}
    public PasswordResetLog(Long userId){ this.userId = userId; }
    public Long getId() { return id; }
    public Instant getResetAt() { return resetAt; }
    public Long getUserId() { return userId; }
}
