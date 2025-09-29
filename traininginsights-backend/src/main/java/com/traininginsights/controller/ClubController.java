package com.traininginsights.controller;

import com.traininginsights.model.Club;
import com.traininginsights.service.ClubService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/clubs")
public class ClubController {
    private final ClubService service;
    public ClubController(ClubService service){ this.service = service; }

    @GetMapping public List<Club> all(){ return service.findAll(); }

    @PreAuthorize("hasRole('SUPERADMIN')")
    @PostMapping public Club create(@RequestBody Club c){ return service.save(c); }

    @PreAuthorize("hasRole('SUPERADMIN')")
    @PutMapping("/{id}") public Club update(@PathVariable Long id, @RequestBody Club c){ c.setId(id); return service.save(c); }

    @PreAuthorize("hasRole('SUPERADMIN')")
    @DeleteMapping("/{id}") public void delete(@PathVariable Long id){ service.delete(id); }
}
