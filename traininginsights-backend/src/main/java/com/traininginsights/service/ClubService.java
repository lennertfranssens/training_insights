package com.traininginsights.service;

import com.traininginsights.model.Club;
import com.traininginsights.repository.ClubRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class ClubService {
    private final ClubRepository repo;
    public ClubService(ClubRepository repo) { this.repo = repo; }

    public List<Club> findAll(){ return repo.findAll(); }
    public Optional<Club> findById(Long id){ return repo.findById(id); }
    public Club save(Club c){ return repo.save(c); }
    public void delete(Long id){ repo.deleteById(id); }
}
