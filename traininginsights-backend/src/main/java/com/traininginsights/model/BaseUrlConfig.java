package com.traininginsights.model;

import jakarta.persistence.*;

@Entity
public class BaseUrlConfig {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 255)
    private String baseUrl; // full base URL including protocol and optional port

    public Long getId() { return id; }
    public String getBaseUrl() { return baseUrl; }
    public void setBaseUrl(String baseUrl) { this.baseUrl = baseUrl; }
}
