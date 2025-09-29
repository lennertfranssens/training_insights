package com.traininginsights.controller;

import com.traininginsights.dto.TrainingDtos;
import com.traininginsights.model.Training;
import com.traininginsights.service.TrainingService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Set;
import java.util.List;

@RestController
@RequestMapping("/api/trainings")
public class TrainingController {
    private final TrainingService service;
    public TrainingController(TrainingService service){ this.service = service; }

    @PreAuthorize("hasAnyRole('TRAINER','ADMIN','SUPERADMIN')")
    @GetMapping public java.util.List<Training> all(){ return service.all(); }
    @PreAuthorize("hasAnyRole('TRAINER','ADMIN','SUPERADMIN')")
    @GetMapping("/{id}") public Training get(@PathVariable Long id){ return service.get(id); }

    @PreAuthorize("hasAnyRole('TRAINER','ADMIN','SUPERADMIN')")
    @GetMapping("/by-group/{groupId}")
    public List<Training> byGroup(@PathVariable Long groupId){
        return service.all().stream()
                .filter(t -> t.getGroups() != null && t.getGroups().stream().anyMatch(g -> g.getId().equals(groupId)))
                .toList();
    }

    @PreAuthorize("hasAnyRole('TRAINER','ADMIN','SUPERADMIN')")
    @PostMapping public Training create(@RequestBody Training t){ return service.save(t); }

    @PreAuthorize("hasAnyRole('TRAINER','ADMIN','SUPERADMIN')")
    @PutMapping("/{id}") public Training update(@PathVariable Long id, @RequestBody Training t){ t.setId(id); return service.save(t); }

    @PreAuthorize("hasAnyRole('TRAINER','ADMIN','SUPERADMIN')")
    @DeleteMapping("/{id}") public void delete(@PathVariable Long id){ service.delete(id); }

    @PreAuthorize("hasAnyRole('TRAINER','ADMIN','SUPERADMIN')")
    @PostMapping("/{id}/assign-groups")
    public Training assign(@PathVariable Long id, @RequestBody TrainingDtos.AssignGroupsRequest req){
        return service.assignGroups(id, req.groupIds);
    }

    @PreAuthorize("hasAnyRole('TRAINER','ADMIN','SUPERADMIN')")
    @PostMapping("/{id}/set-questionnaires")
    public Training setQuestionnaires(@PathVariable Long id, @RequestParam(required=false) Long preId, @RequestParam(required=false) Long postId){
        return service.setQuestionnaires(id, preId, postId);
    }
}
