package com.traininginsights.controller;

import com.traininginsights.dto.GroupDtos;
import com.traininginsights.model.Group;
import com.traininginsights.service.GroupService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/groups")
public class GroupController {
    private final GroupService service;
    public GroupController(GroupService service){ this.service = service; }

    @GetMapping
    public List<GroupDtos.GroupDTO> all(){
        return service.all().stream().map(g -> {
            GroupDtos.GroupDTO dto = new GroupDtos.GroupDTO();
            dto.id = g.getId();
            dto.name = g.getName();
            return dto;
        }).collect(Collectors.toList());
    }

    @PreAuthorize("hasAnyRole('TRAINER','ADMIN','SUPERADMIN')")
    @PostMapping
    public Group create(@RequestBody Group g){ return service.save(g); }

    @PreAuthorize("hasAnyRole('TRAINER','ADMIN','SUPERADMIN')")
    @PutMapping("/{id}")
    public Group update(@PathVariable Long id, @RequestBody Group g){ g.setId(id); return service.save(g); }

    @PreAuthorize("hasAnyRole('TRAINER','ADMIN','SUPERADMIN')")
    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id){ service.delete(id); }
}
