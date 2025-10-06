package com.traininginsights.controller;

import com.traininginsights.model.BaseUrlConfig;
import com.traininginsights.repository.BaseUrlConfigRepository;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.Map;

@RestController
@RequestMapping("/api/config/base-url")
public class BaseUrlConfigController {
    private final BaseUrlConfigRepository repo;
    public BaseUrlConfigController(BaseUrlConfigRepository repo){ this.repo = repo; }

    @PreAuthorize("hasRole('SUPERADMIN')")
    @GetMapping
    public BaseUrlConfig get(){ return repo.findTopByOrderByIdDesc().orElse(null); }

    @PreAuthorize("hasRole('SUPERADMIN')")
    @PostMapping
    public BaseUrlConfig set(@RequestBody Map<String,String> body){
        String raw = body.getOrDefault("baseUrl", "").trim();
        if (raw.isEmpty()) throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST, "baseUrl required");
        // basic validation: must parse as URI with http or https and host present
        try {
            URI u = URI.create(raw);
            if (u.getScheme()==null || (!u.getScheme().equals("http") && !u.getScheme().equals("https")))
                throw new IllegalArgumentException("Scheme must be http or https");
            if (u.getHost()==null) throw new IllegalArgumentException("Host required");
        } catch (Exception e){
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST, "Invalid baseUrl: " + e.getMessage());
        }
        BaseUrlConfig cfg = new BaseUrlConfig();
        cfg.setBaseUrl(raw);
        return repo.save(cfg);
    }
}
