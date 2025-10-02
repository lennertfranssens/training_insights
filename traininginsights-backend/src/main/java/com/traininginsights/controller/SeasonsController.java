package com.traininginsights.controller;

import com.traininginsights.model.Season;
import com.traininginsights.repository.SeasonRepository;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/seasons")
public class SeasonsController {
    private final SeasonRepository repo;
    public SeasonsController(SeasonRepository repo){ this.repo = repo; }

    @PreAuthorize("hasAnyRole('ATHLETE','TRAINER','ADMIN','SUPERADMIN')")
    @GetMapping
    public List<Season> list(){
        return repo.findAll();
    }
}
