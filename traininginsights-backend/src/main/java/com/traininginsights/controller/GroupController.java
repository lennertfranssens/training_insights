package com.traininginsights.controller;

import com.traininginsights.dto.GroupDtos;
import com.traininginsights.model.Group;
import com.traininginsights.service.GroupService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;
import com.traininginsights.repository.UserRepository;
import com.traininginsights.repository.ClubRepository;
import java.util.Arrays;
import org.springframework.security.core.context.SecurityContextHolder;
import com.traininginsights.model.User;
import java.util.Set;

@RestController
@RequestMapping("/api/groups")
public class GroupController {
    private final GroupService service;
    private final UserRepository userRepository;
    private final ClubRepository clubRepository;
    public GroupController(GroupService service, UserRepository userRepository, ClubRepository clubRepository){ this.service = service; this.userRepository = userRepository; this.clubRepository = clubRepository; }

    @GetMapping
    public List<GroupDtos.GroupDTO> all(){
        return service.all().stream().map(g -> {
            GroupDtos.GroupDTO dto = new GroupDtos.GroupDTO();
            dto.id = g.getId();
            dto.name = g.getName();
            dto.clubIds = g.getClubs().stream().map(c -> c.getId()).toArray(Long[]::new);
            dto.trainerIds = g.getTrainers().stream().map(t -> t.getId()).toArray(Long[]::new);
            dto.athleteIds = g.getAthletes().stream().map(a -> a.getId()).toArray(Long[]::new);
            return dto;
        }).collect(Collectors.toList());
    }

    @PreAuthorize("hasAnyRole('TRAINER','ADMIN','SUPERADMIN')")
    @PostMapping
    public Group create(@RequestBody com.traininginsights.dto.GroupDtos.CreateGroupRequest req){
        String callerEmail = SecurityContextHolder.getContext().getAuthentication().getName();
        User caller = userRepository.findByEmailIgnoreCase(callerEmail).orElseThrow();
        Set<Long> callerClubIds = caller.getClubs().stream().map(c->c.getId()).collect(Collectors.toSet());
        boolean isSuper = caller.getRoles().stream().anyMatch(r->r.getName().name().equals("ROLE_SUPERADMIN"));

        Group g = new Group();
        g.setName(req.name);
        if (req.clubIds != null) {
            Set<com.traininginsights.model.Club> clubs = Arrays.stream(req.clubIds).map(i -> clubRepository.findById(i).orElseThrow()).collect(Collectors.toSet());
            g.setClubs(clubs);
        }
        // For trainers, load users by id
        if (req.trainerIds != null) {
            Set<User> trainers = Arrays.stream(req.trainerIds).map(i -> userRepository.findById(i).orElseThrow()).collect(Collectors.toSet());
            g.setTrainers(trainers);
        }
        // validate clubs subset for non-super
        if (!isSuper && g.getClubs() != null) {
            for (com.traininginsights.model.Club c : g.getClubs()) if (!callerClubIds.contains(c.getId())) throw new SecurityException("Cannot assign group to clubs you are not part of");
        }
        // ensure trainers share at least one club
        for (User t : g.getTrainers()){
            Set<Long> trainerClubIds = t.getClubs().stream().map(c->c.getId()).collect(Collectors.toSet());
            boolean ok = g.getClubs().stream().anyMatch(c->trainerClubIds.contains(c.getId()));
            if (!ok) throw new IllegalArgumentException("Trainer must be part of at least one club assigned to the group");
        }
        return service.save(g);
    }

    @PreAuthorize("hasAnyRole('TRAINER','ADMIN','SUPERADMIN')")
    @PutMapping("/{id}")
    public Group update(@PathVariable Long id, @RequestBody com.traininginsights.dto.GroupDtos.UpdateGroupRequest req){
        String callerEmail = SecurityContextHolder.getContext().getAuthentication().getName();
        User caller = userRepository.findByEmailIgnoreCase(callerEmail).orElseThrow();
        Set<Long> callerClubIds = caller.getClubs().stream().map(c->c.getId()).collect(Collectors.toSet());
        boolean isSuper = caller.getRoles().stream().anyMatch(r->r.getName().name().equals("ROLE_SUPERADMIN"));

        Group g = service.get(id).orElseThrow();
        g.setName(req.name);
        if (req.clubIds != null) g.setClubs(Arrays.stream(req.clubIds).map(i -> clubRepository.findById(i).orElseThrow()).collect(Collectors.toSet()));
        if (req.trainerIds != null) g.setTrainers(Arrays.stream(req.trainerIds).map(i -> userRepository.findById(i).orElseThrow()).collect(Collectors.toSet()));

        if (!isSuper && g.getClubs() != null) {
            for (com.traininginsights.model.Club c : g.getClubs()) if (!callerClubIds.contains(c.getId())) throw new SecurityException("Cannot assign group to clubs you are not part of");
        }
        for (User t : g.getTrainers()){
            Set<Long> trainerClubIds = t.getClubs().stream().map(c->c.getId()).collect(Collectors.toSet());
            boolean ok = g.getClubs().stream().anyMatch(c->trainerClubIds.contains(c.getId()));
            if (!ok) throw new IllegalArgumentException("Trainer must be part of at least one club assigned to the group");
        }
        return service.save(g); }

    @PreAuthorize("hasAnyRole('TRAINER','ADMIN','SUPERADMIN')")
    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id){ service.delete(id); }
}
