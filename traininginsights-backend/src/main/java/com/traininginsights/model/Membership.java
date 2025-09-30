package com.traininginsights.model;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
public class Membership {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    private User user;

    @ManyToOne
    private Club club;

    @ManyToOne
    private Season season;

    private Instant startDate;
    private Instant endDate;

    private String status; // ACTIVE, EXPIRED, CANCELLED
    // notification flags to avoid duplicate emails
    private boolean notified7Days = false;
    private boolean notified1Day = false;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }
    public Club getClub() { return club; }
    public void setClub(Club club) { this.club = club; }
    public Season getSeason() { return season; }
    public void setSeason(Season season) { this.season = season; }
    public Instant getStartDate() { return startDate; }
    public void setStartDate(Instant startDate) { this.startDate = startDate; }
    public Instant getEndDate() { return endDate; }
    public void setEndDate(Instant endDate) { this.endDate = endDate; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public boolean isNotified7Days() { return notified7Days; }
    public void setNotified7Days(boolean notified7Days) { this.notified7Days = notified7Days; }
    public boolean isNotified1Day() { return notified1Day; }
    public void setNotified1Day(boolean notified1Day) { this.notified1Day = notified1Day; }
}
