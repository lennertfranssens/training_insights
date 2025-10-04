package com.traininginsights.controller;

import com.traininginsights.repository.ClubRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.HashMap;

@RestController
@RequestMapping("/api/public")
public class PublicClubController {
    private final ClubRepository clubRepository;
    public PublicClubController(ClubRepository clubRepository){ this.clubRepository = clubRepository; }

    @GetMapping("/clubs")
    public List<Map<String,Object>> clubs(){
        return clubRepository.findAll().stream().map(c -> {
            Map<String,Object> m = new HashMap<>();
            m.put("id", c.getId());
            m.put("name", c.getName());
            return m;
        }).toList();
    }
}
