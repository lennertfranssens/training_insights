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

    // Admins of a club (or superadmin) may update SMTP settings via admin endpoints
    @PreAuthorize("hasAnyRole('ADMIN','SUPERADMIN')")
    @GetMapping("/admin/{id}/smtp")
    public java.util.Map<String,Object> getSmtp(@PathVariable Long id){
        Club c = service.findById(id).orElseThrow();
        java.util.Map<String,Object> map = new java.util.HashMap<>();
        map.put("smtpHost", c.getSmtpHost()); map.put("smtpPort", c.getSmtpPort()); map.put("smtpUsername", c.getSmtpUsername()); map.put("smtpFrom", c.getSmtpFrom()); map.put("smtpUseTls", c.getSmtpUseTls());
        return map;
    }

    @PreAuthorize("hasAnyRole('ADMIN','SUPERADMIN')")
    @PutMapping("/admin/{id}/smtp")
    public Club updateSmtp(@PathVariable Long id, @RequestBody java.util.Map<String,Object> body){
        Club c = service.findById(id).orElseThrow();
        c.setSmtpHost((String) body.get("smtpHost"));
        c.setSmtpPort(body.get("smtpPort") == null ? null : Integer.valueOf(body.get("smtpPort").toString()));
        c.setSmtpUsername((String) body.get("smtpUsername"));
        c.setSmtpPassword((String) body.get("smtpPassword"));
        c.setSmtpFrom((String) body.get("smtpFrom"));
        c.setSmtpUseTls(body.get("smtpUseTls") == null ? true : Boolean.valueOf(body.get("smtpUseTls").toString()));
        return service.save(c);
    }

    @PreAuthorize("hasRole('SUPERADMIN')")
    @DeleteMapping("/{id}") public void delete(@PathVariable Long id){ service.delete(id); }
}
