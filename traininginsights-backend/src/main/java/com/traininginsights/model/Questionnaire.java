package com.traininginsights.model;

import jakarta.persistence.*;
import com.fasterxml.jackson.annotation.JsonIgnore;

import java.util.regex.Pattern;

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
    public void setStructure(String structure) {
        // Guard against accidental numeric OID or other non-JSON values being persisted.
        if (structure != null) {
            String trimmed = structure.trim();
            // If it's just a number (e.g., "16787") we reject it to surface upstream issue rather than silently store.
            if (NUMERIC_PATTERN.matcher(trimmed).matches()) {
                throw new IllegalArgumentException("Questionnaire.structure appears to be a numeric placeholder ('" + trimmed + "') rather than JSON.");
            }
            // Basic sanity: must start with { or [ for JSON object/array. (We allow pretty-printed multi-line JSON.)
            if (!(trimmed.startsWith("{") || trimmed.startsWith("["))) {
                // Accept if user intentionally stores plain text? For now enforce JSON shape to avoid silent corruption.
                throw new IllegalArgumentException("Questionnaire.structure must be JSON starting with '{' or '['.");
            }
        }
        this.structure = structure;
    }

    private static final Pattern NUMERIC_PATTERN = Pattern.compile("^[0-9]+$");

    public boolean isDaily() { return daily; }
    public void setDaily(boolean daily) { this.daily = daily; }

    public User getCreator() { return creator; }
    public void setCreator(User creator) { this.creator = creator; }
}
