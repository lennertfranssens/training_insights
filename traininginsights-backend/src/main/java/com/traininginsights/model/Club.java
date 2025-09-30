package com.traininginsights.model;

import jakarta.persistence.*;

@Entity
@Table(name = "clubs")
public class Club {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String name;

    // SMTP settings for club-level notifications (optional)
    private String smtpHost;
    private Integer smtpPort;
    private String smtpUsername;
    private String smtpPassword;
    private String smtpFrom;
    private Boolean smtpUseTls = true;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getSmtpHost() { return smtpHost; }
    public void setSmtpHost(String smtpHost) { this.smtpHost = smtpHost; }
    public Integer getSmtpPort() { return smtpPort; }
    public void setSmtpPort(Integer smtpPort) { this.smtpPort = smtpPort; }
    public String getSmtpUsername() { return smtpUsername; }
    public void setSmtpUsername(String smtpUsername) { this.smtpUsername = smtpUsername; }
    public String getSmtpPassword() { return smtpPassword; }
    public void setSmtpPassword(String smtpPassword) { this.smtpPassword = smtpPassword; }
    public String getSmtpFrom() { return smtpFrom; }
    public void setSmtpFrom(String smtpFrom) { this.smtpFrom = smtpFrom; }
    public Boolean getSmtpUseTls() { return smtpUseTls; }
    public void setSmtpUseTls(Boolean smtpUseTls) { this.smtpUseTls = smtpUseTls; }
}
