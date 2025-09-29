package com.traininginsights.service;

import com.traininginsights.model.Group;
import com.traininginsights.model.Questionnaire;
import com.traininginsights.model.Training;
import com.traininginsights.repository.GroupRepository;
import com.traininginsights.repository.QuestionnaireRepository;
import com.traininginsights.repository.TrainingRepository;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
public class TrainingService {
    private final TrainingRepository repo;
    private final GroupRepository groupRepo;
    private final QuestionnaireRepository qRepo;

    public TrainingService(TrainingRepository repo, GroupRepository groupRepo, QuestionnaireRepository qRepo) {
        this.repo = repo; this.groupRepo = groupRepo; this.qRepo = qRepo;
    }

    public List<Training> all(){ return repo.findAll(); }
    public Training get(Long id){ return repo.findById(id).orElseThrow(); }
    public Training save(Training t){ return repo.save(t); }
    public void delete(Long id){ repo.deleteById(id); }

    public List<Training> upcomingForGroup(Group group){
        return repo.findUpcomingForGroup(group, Instant.now());
    }

    public Training assignGroups(Long trainingId, Set<Long> groupIds){
        Training t = get(trainingId);
        Set<Group> gs = new HashSet<>(groupRepo.findAllById(groupIds));
        t.setGroups(gs);
        return repo.save(t);
    }

    public Training setQuestionnaires(Long trainingId, Long preId, Long postId){
        Training t = get(trainingId);
        Questionnaire pre = preId != null ? qRepo.findById(preId).orElse(null) : null;
        Questionnaire post = postId != null ? qRepo.findById(postId).orElse(null) : null;
        t.setPreQuestionnaire(pre);
        t.setPostQuestionnaire(post);
        return repo.save(t);
    }
}
