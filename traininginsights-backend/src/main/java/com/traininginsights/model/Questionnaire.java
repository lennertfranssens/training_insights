package com.traininginsights.model;

import jakarta.persistence.*;

@Entity
@Table(name = "questionnaires")
public class Questionnaire {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String title;

    @Lob
    @Column(columnDefinition = "TEXT")
    private String structure; // JSON definition

    private boolean daily = false;

    @ManyToOne
    @JoinColumn(name = "creator_id")
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
