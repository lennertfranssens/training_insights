package com.traininginsights.model;

import jakarta.persistence.*;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.time.Instant;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "trainings")
public class Training {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false)
    private Instant trainingTime;

    @Column(name = "training_end_time")
    private Instant trainingEndTime;

    private boolean isVisibleToAthletes = true;

    @ManyToMany
    @JoinTable(name = "training_groups",
            joinColumns = @JoinColumn(name = "training_id"),
            inverseJoinColumns = @JoinColumn(name = "group_id"))
    private Set<Group> groups = new HashSet<>();

    @ManyToOne
    @JoinColumn(name = "pre_questionnaire_id")
    private Questionnaire preQuestionnaire;

    @ManyToOne
    @JoinColumn(name = "post_questionnaire_id")
    private Questionnaire postQuestionnaire;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public Instant getTrainingTime() { return trainingTime; }
    public void setTrainingTime(Instant trainingTime) { this.trainingTime = trainingTime; }

    public Instant getTrainingEndTime() { return trainingEndTime; }
    public void setTrainingEndTime(Instant trainingEndTime) { this.trainingEndTime = trainingEndTime; }

    public boolean isVisibleToAthletes() { return isVisibleToAthletes; }
    public void setVisibleToAthletes(boolean visibleToAthletes) { isVisibleToAthletes = visibleToAthletes; }

    public Set<Group> getGroups() { return groups; }
    public void setGroups(Set<Group> groups) { this.groups = groups; }

    public Questionnaire getPreQuestionnaire() { return preQuestionnaire; }
    public void setPreQuestionnaire(Questionnaire preQuestionnaire) { this.preQuestionnaire = preQuestionnaire; }

    public Questionnaire getPostQuestionnaire() { return postQuestionnaire; }
    public void setPostQuestionnaire(Questionnaire postQuestionnaire) { this.postQuestionnaire = postQuestionnaire; }

    @Column(name = "pre_notification_minutes")
    private Integer preNotificationMinutes = 0;

    public Integer getPreNotificationMinutes() { return preNotificationMinutes; }
    public void setPreNotificationMinutes(Integer preNotificationMinutes) { this.preNotificationMinutes = preNotificationMinutes; }

    private Instant notificationTime;

    public Instant getNotificationTime() { return notificationTime; }
    public void setNotificationTime(Instant notificationTime) { this.notificationTime = notificationTime; }

    // Recurrence fields
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "series_id")
    @JsonIgnore
    private TrainingSeries series;

    @Column(name = "series_sequence")
    private Integer seriesSequence; // 1-based index within the series

    @Column(name = "detached", nullable = false)
    private boolean detached = false; // true if edited independently after creation

    // If true, this occurrence's group assignments are independent from its series (no cascade updates)
    @Column(name = "group_detached", nullable = false)
    private boolean groupDetached = false;

    // Creator (trainer/admin) who authored this training; used to allow visibility for ungrouped trainings
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by_user_id")
    @JsonIgnore
    private User createdBy;

    public User getCreatedBy() { return createdBy; }
    public void setCreatedBy(User createdBy) { this.createdBy = createdBy; }

    public TrainingSeries getSeries() { return series; }
    public void setSeries(TrainingSeries series) { this.series = series; }
    @JsonProperty("seriesId")
    public Long getSeriesId(){ return series != null ? series.getId() : null; }
    public Integer getSeriesSequence() { return seriesSequence; }
    public void setSeriesSequence(Integer seriesSequence) { this.seriesSequence = seriesSequence; }
    public boolean isDetached() { return detached; }
    public void setDetached(boolean detached) { this.detached = detached; }

    public boolean isGroupDetached() { return groupDetached; }
    public void setGroupDetached(boolean groupDetached) { this.groupDetached = groupDetached; }
}
