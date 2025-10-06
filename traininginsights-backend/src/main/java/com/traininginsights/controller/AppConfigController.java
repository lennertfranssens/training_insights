package com.traininginsights.controller;

import com.traininginsights.service.AppConfigService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/app-config")
public class AppConfigController {
    private final AppConfigService service;
    public AppConfigController(AppConfigService service){ this.service = service; }

    @PreAuthorize("hasRole('SUPERADMIN')")
    @GetMapping
    public Map<String,String> get(){ return Map.of("publicBaseUrl", service.getBaseUrl()); }

    @PreAuthorize("hasRole('SUPERADMIN')")
    @PostMapping
    public Map<String,String> update(@RequestBody Map<String,String> body){
        String base = body.get("publicBaseUrl");
        String protocol = body.get("protocol"); // optional: http | https
        if (base == null || base.isBlank()) throw new IllegalArgumentException("publicBaseUrl required");
        if (protocol != null && !protocol.isBlank()){
            service.setBaseUrl(base, protocol);
        } else {
            service.setBaseUrl(base);
        }
        return Map.of(
                "publicBaseUrl", service.getBaseUrl()
        );
    }
}
