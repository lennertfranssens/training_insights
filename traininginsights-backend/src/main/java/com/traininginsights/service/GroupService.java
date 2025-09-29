package com.traininginsights.service;

import com.traininginsights.model.Group;
import com.traininginsights.repository.GroupRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class GroupService {
    private final GroupRepository repo;
    public GroupService(GroupRepository repo) { this.repo = repo; }
    public List<Group> all(){ return repo.findAll(); }
    public Optional<Group> get(Long id){ return repo.findById(id); }
    public Group save(Group g){ return repo.save(g); }
    public void delete(Long id){ repo.deleteById(id); }
}
