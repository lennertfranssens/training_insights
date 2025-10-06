package com.traininginsights.model;

import jakarta.persistence.*;

@Entity
@Table(name = "app_config")
public class AppConfig {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Public facing base URL (including protocol) used for links in emails
    @Column(name = "public_base_url")
    private String publicBaseUrl;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getPublicBaseUrl() { return publicBaseUrl; }
    public void setPublicBaseUrl(String publicBaseUrl) { this.publicBaseUrl = publicBaseUrl; }
}
