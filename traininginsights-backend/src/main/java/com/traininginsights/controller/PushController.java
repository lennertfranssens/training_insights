package com.traininginsights.controller;

import com.traininginsights.model.PushSubscription;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.traininginsights.model.User;
import com.traininginsights.repository.PushSubscriptionRepository;
import com.traininginsights.repository.UserRepository;
import com.traininginsights.service.PushService;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/push")
public class PushController {
    private final PushSubscriptionRepository repo;
    private final UserRepository userRepository;
    private final PushService pushService;
    private final ObjectMapper objectMapper;

    public PushController(PushSubscriptionRepository repo, UserRepository userRepository, PushService pushService, ObjectMapper objectMapper){ this.repo = repo; this.userRepository = userRepository; this.pushService = pushService; this.objectMapper = objectMapper; }

    public static class SubscribePayload {
        public String endpoint;
        public java.util.Map<String,String> keys; // { p256dh, auth }
        public String getEndpoint(){ return endpoint; }
        public void setEndpoint(String e){ this.endpoint = e; }
        public java.util.Map<String,String> getKeys(){ return keys; }
        public void setKeys(java.util.Map<String,String> k){ this.keys = k; }
    }

    @PreAuthorize("isAuthenticated()")
    @PostMapping("/subscribe")
    public PushSubscription subscribe(@RequestBody SubscribePayload payload){
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        User u = userRepository.findByEmailIgnoreCase(email).orElseThrow();
        PushSubscription s = new PushSubscription();
        s.setUser(u);
        s.setEndpoint(payload.getEndpoint());
        try {
            String keysJson = payload.getKeys() == null ? null : objectMapper.writeValueAsString(payload.getKeys());
            s.setKeys(keysJson);
        } catch (Exception e){ s.setKeys(null); }
        return pushService.save(s);
    }

    @PreAuthorize("isAuthenticated()")
    @PostMapping("/unsubscribe/{id}")
    public void unsubscribe(@PathVariable Long id){ pushService.delete(id); }

    @GetMapping("/vapid-public")
    public String vapidPublic(){ return pushService.getVapidPublic(); }

    // for admin/testing: list subscriptions for current user
    @PreAuthorize("isAuthenticated()")
    @GetMapping("/my")
    public List<PushSubscription> my(){ String email = SecurityContextHolder.getContext().getAuthentication().getName(); var u = userRepository.findByEmailIgnoreCase(email).orElseThrow(); return repo.findByUser(u); }
}
