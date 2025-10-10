package com.traininginsights.controller;

import com.traininginsights.model.PushConfig;
import com.traininginsights.repository.PushConfigRepository;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/push/config")
public class PushConfigController {
    private final PushConfigRepository repo;
    public PushConfigController(PushConfigRepository repo){ this.repo = repo; }

    @PreAuthorize("hasRole('SUPERADMIN')")
    @GetMapping
    public PushConfig get(){ return repo.findTopByOrderByIdDesc().orElse(null); }

    @PreAuthorize("hasRole('SUPERADMIN')")
    @PostMapping
    public PushConfig set(@RequestBody Map<String,String> body){
        String pub = body.get("vapidPublic");
        String priv = body.get("vapidPrivate");
        String subj = body.getOrDefault("subject", "mailto:admin@localhost");
        PushConfig c = new PushConfig();
        c.setVapidPublic(pub);
        c.setVapidPrivate(priv);
        c.setSubject(subj);
        return repo.save(c);
    }
}
