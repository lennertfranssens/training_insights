package com.traininginsights.model;

import jakarta.persistence.*;
import com.fasterxml.jackson.annotation.JsonIgnore;

@Entity
@Table(name = "questionnaires")
public class Questionnaire {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String title;

    // Store JSON as standard TEXT (avoid PostgreSQL Large Object API triggered by @Lob on some drivers)
    @Column(columnDefinition = "TEXT")
    private String structure; // JSON definition

    private boolean daily = false;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "creator_id")
    @JsonIgnore // prevent lazy proxy serialization and large nested graphs
    private User creator;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getStructure() { return structure; }
    public void setStructure(String structure) { this.structure = structure; }

    public boolean isDaily() { return daily; }
    public void setDaily(boolean daily) { this.daily = daily; }

    public User getCreator() { return creator; }
    public void setCreator(User creator) { this.creator = creator; }
}
