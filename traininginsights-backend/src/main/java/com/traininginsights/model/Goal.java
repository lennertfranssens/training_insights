package com.traininginsights.model;

import jakarta.persistence.*;

import java.time.Instant;

@Entity
@Table(name = "goals")
public class Goal {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "user_id")
    private User user;

    @ManyToOne
    @JoinColumn(name = "season_id")
    private Season season;

    private Instant startDate;
    private Instant endDate;

    @Column(columnDefinition = "TEXT")
    private String description;

    // cached latest progress percentage to show quickly (0-100); authoritative history lives in GoalProgress
    private Integer currentProgress = 0;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }

    public Season getSeason() { return season; }
    public void setSeason(Season season) { this.season = season; }

    public Instant getStartDate() { return startDate; }
    public void setStartDate(Instant startDate) { this.startDate = startDate; }

    public Instant getEndDate() { return endDate; }
    public void setEndDate(Instant endDate) { this.endDate = endDate; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public Integer getCurrentProgress() { return currentProgress; }
    public void setCurrentProgress(Integer currentProgress) { this.currentProgress = currentProgress; }
}
