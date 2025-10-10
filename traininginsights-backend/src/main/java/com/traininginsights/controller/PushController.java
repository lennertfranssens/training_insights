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

import java.util.HashMap;
import java.util.List;
import java.util.Map;

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

    // Diagnostics: show VAPID subject, whether private is configured, and the expected audience for a given subscription id
    @PreAuthorize("hasAnyRole('ADMIN','SUPERADMIN')")
    @GetMapping("/diag/{id}")
    public Map<String, Object> diag(@PathVariable Long id){
        Map<String,Object> out = new HashMap<>();
        out.put("vapidPublic", pushService.getVapidPublic());
        out.put("vapidSubject", pushService.getVapidSubject());
        out.put("hasPrivate", pushService.hasVapidPrivate());
        String audience = null, host = null;
        try {
            var sub = repo.findById(id).orElse(null);
            if (sub != null && sub.getEndpoint() != null){
                java.net.URI u = java.net.URI.create(sub.getEndpoint());
                host = u.getHost();
                // Per spec, audience is the origin of the push service (scheme + host)
                String scheme = (u.getScheme()==null?"https":u.getScheme());
                audience = scheme + "://" + host;
            }
        } catch (Exception ignored){}
        out.put("endpointHost", host);
        out.put("audience", audience);
        return out;
    }

    // for admin/testing: list subscriptions for current user
    @PreAuthorize("isAuthenticated()")
    @GetMapping("/my")
    public List<PushSubscription> my(){ String email = SecurityContextHolder.getContext().getAuthentication().getName(); var u = userRepository.findByEmailIgnoreCase(email).orElseThrow(); return repo.findByUser(u); }

    // Simple test endpoint to validate push end-to-end for the current user.
    // Sends a lightweight notification to all of the user's subscriptions.
    @PreAuthorize("isAuthenticated()")
    @PostMapping("/test")
    public Map<String, Object> testPush(){
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        User u = userRepository.findByEmailIgnoreCase(email).orElseThrow();
        List<PushSubscription> subs = repo.findByUser(u);

        int sent = 0;
        List<Map<String,Object>> results = new java.util.ArrayList<>();
        for (PushSubscription s : subs){
            try {
                Integer code = pushService.sendNotificationStatus(
                    s,
                    "TrainingInsights test",
                    "If you see this, push notifications are working on this device.",
                    "/"
                );
                boolean ok = (code == null) || (code >= 200 && code < 300) || code == 0; // null means log-only
                if (ok) sent++;
                var item = new java.util.LinkedHashMap<String, Object>();
                item.put("id", s.getId());
                item.put("endpoint", s.getEndpoint());
                item.put("status", code);
                results.add(item);
            } catch (Exception ignored) {}
        }
        Map<String, Object> res = new HashMap<>();
        res.put("subscriptions", subs.size());
        res.put("sent", sent);
        res.put("results", results);
        return res;
    }

    // Send a test push to a specific subscription (owned by current user)
    @PreAuthorize("isAuthenticated()")
    @PostMapping("/test/{id}")
    public Map<String, Object> testPushOne(@PathVariable Long id){
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        User u = userRepository.findByEmailIgnoreCase(email).orElseThrow();
        var opt = repo.findById(id);
        int sent = 0;
        Integer status = null;
        if (opt.isPresent()){
            PushSubscription s = opt.get();
            // ensure ownership
            if (s.getUser() != null && s.getUser().getId().equals(u.getId())){
                try {
                    status = pushService.sendNotificationStatus(
                        s,
                        "TrainingInsights test",
                        "Test sent to this specific device.",
                        "/"
                    );
                    boolean ok = (status == null) || (status >= 200 && status < 300) || status == 0;
                    sent = ok ? 1 : 0;
                } catch (Exception ignored) {}
            }
        }
        Map<String, Object> res = new HashMap<>();
        res.put("sent", sent);
        res.put("id", id);
        res.put("status", status);
        return res;
    }
}
