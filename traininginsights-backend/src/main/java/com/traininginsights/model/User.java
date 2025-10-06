package com.traininginsights.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import jakarta.validation.constraints.Email;

import java.time.LocalDate;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "users")
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String firstName;
    private String lastName;

    @Email
    @Column(nullable = false, unique = true)
    private String email;

    @JsonIgnore
    @Column(nullable = false)
    private String passwordHash;

    private LocalDate birthDate;

    @Enumerated(EnumType.STRING)
    private AthleteCategory athleteCategory;

    private String phone;
    private String address;
    // daily reminder time for questionnaire (HH:mm) - optional
    private String dailyReminderTime;

    // When using account activation, new users may start inactive until they activate via email link
    private boolean isActive = false;
    // If true, admin/trainer has manually overridden active status; when set, automatic toggles won't change active
    private Boolean activeOverride = null;

    @ManyToOne
    @JoinColumn(name = "group_id")
    private Group groupEntity;

    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(name = "user_roles",
            joinColumns = @JoinColumn(name = "user_id"),
            inverseJoinColumns = @JoinColumn(name = "role_id"))
    private Set<Role> roles = new HashSet<>();

    @ManyToMany
    @JoinTable(name = "user_clubs",
        joinColumns = @JoinColumn(name = "user_id"),
        inverseJoinColumns = @JoinColumn(name = "club_id"))
    private Set<Club> clubs = new HashSet<>();

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getFirstName() { return firstName; }
    public void setFirstName(String firstName) { this.firstName = firstName; }

    public String getLastName() { return lastName; }
    public void setLastName(String lastName) { this.lastName = lastName; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPasswordHash() { return passwordHash; }
    public void setPasswordHash(String passwordHash) { this.passwordHash = passwordHash; }

    public LocalDate getBirthDate() { return birthDate; }
    public void setBirthDate(LocalDate birthDate) { this.birthDate = birthDate; }

    public AthleteCategory getAthleteCategory() { return athleteCategory; }
    public void setAthleteCategory(AthleteCategory athleteCategory) { this.athleteCategory = athleteCategory; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }

    public String getDailyReminderTime() { return dailyReminderTime; }
    public void setDailyReminderTime(String dailyReminderTime) { this.dailyReminderTime = dailyReminderTime; }

    public boolean isActive() { return isActive; }
    public void setActive(boolean active) { isActive = active; }

    public Boolean getActiveOverride() { return activeOverride; }
    public void setActiveOverride(Boolean activeOverride) { this.activeOverride = activeOverride; }

    public Group getGroupEntity() { return groupEntity; }
    public void setGroupEntity(Group groupEntity) { this.groupEntity = groupEntity; }

    public Set<Role> getRoles() { return roles; }
    public void setRoles(Set<Role> roles) { this.roles = roles; }

    public Set<Club> getClubs() { return clubs; }
    public void setClubs(Set<Club> clubs) { this.clubs = clubs; }
}
