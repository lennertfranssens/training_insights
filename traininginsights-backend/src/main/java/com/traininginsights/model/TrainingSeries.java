package com.traininginsights.model;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "training_series")
public class TrainingSeries {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 255)
    private String rrule; // Canonical RRULE fragment (no DTSTART)

    @Column(nullable = false, length = 64)
    private String timezone = "UTC";

    @Column(name = "start_time", nullable = false)
    private Instant startTime;

    @Column(name = "end_time", nullable = false)
    private Instant endTime;

    @Column(name = "until")
    private Instant until; // optional termination

    @Column(name = "count")
    private Integer count; // optional termination

    @Column(name = "created_at")
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at")
    private Instant updatedAt = Instant.now();

    @PreUpdate
    public void onUpdate(){ this.updatedAt = Instant.now(); }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getRrule() { return rrule; }
    public void setRrule(String rrule) { this.rrule = rrule; }
    public String getTimezone() { return timezone; }
    public void setTimezone(String timezone) { this.timezone = timezone; }
    public Instant getStartTime() { return startTime; }
    public void setStartTime(Instant startTime) { this.startTime = startTime; }
    public Instant getEndTime() { return endTime; }
    public void setEndTime(Instant endTime) { this.endTime = endTime; }
    public Instant getUntil() { return until; }
    public void setUntil(Instant until) { this.until = until; }
    public Integer getCount() { return count; }
    public void setCount(Integer count) { this.count = count; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
