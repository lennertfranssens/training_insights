package com.traininginsights.controller;

import com.traininginsights.model.User;
import com.traininginsights.repository.UserRepository;
import com.traininginsights.service.MetricsService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/metrics")
public class MetricsController {
    private final MetricsService metricsService;
    private final UserRepository userRepository;

    public MetricsController(MetricsService metricsService, UserRepository userRepository){
        this.metricsService = metricsService;
        this.userRepository = userRepository;
    }

    @GetMapping("/dashboard")
    public ResponseEntity<?> dashboard(@RequestParam(value = "clubId", required = false) Long clubId, Authentication auth){
        if (auth == null) return ResponseEntity.status(401).build();
        boolean isSuper = auth.getAuthorities().stream().map(GrantedAuthority::getAuthority).anyMatch(a -> a.equals("ROLE_SUPERADMIN"));
        boolean isAdmin = auth.getAuthorities().stream().map(GrantedAuthority::getAuthority).anyMatch(a -> a.equals("ROLE_ADMIN"));
        if (!isSuper && !isAdmin){
            return ResponseEntity.status(403).build();
        }
        if (isSuper){
            return ResponseEntity.ok(metricsService.globalMetrics());
        }
        // admin scope
        User u = userRepository.findByEmailIgnoreCase(auth.getName()).orElse(null);
        return ResponseEntity.ok(metricsService.adminMetrics(u, clubId));
    }
}
