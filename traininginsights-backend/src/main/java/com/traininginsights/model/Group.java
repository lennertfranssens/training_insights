package com.traininginsights.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;

import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "groups")
public class Group {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String name;

    @OneToMany(mappedBy = "groupEntity")
    @JsonIgnore
    private Set<User> athletes = new HashSet<>();

    @ManyToMany
    @JoinTable(name = "group_clubs",
        joinColumns = @JoinColumn(name = "group_id"),
        inverseJoinColumns = @JoinColumn(name = "club_id"))
    private Set<Club> clubs = new HashSet<>();

    @ManyToMany
    @JoinTable(name = "group_trainers",
        joinColumns = @JoinColumn(name = "group_id"),
        inverseJoinColumns = @JoinColumn(name = "user_id"))
    @JsonIgnore // prevent deep recursive serialization (Group -> trainers -> roles/clubs/groups)
    private Set<User> trainers = new HashSet<>();

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public Set<User> getAthletes() { return athletes; }
    public void setAthletes(Set<User> athletes) { this.athletes = athletes; }

    public Set<Club> getClubs() { return clubs; }
    public void setClubs(Set<Club> clubs) { this.clubs = clubs; }

    public Set<User> getTrainers() { return trainers; }
    public void setTrainers(Set<User> trainers) { this.trainers = trainers; }
}
