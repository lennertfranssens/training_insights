package com.traininginsights.controller;

import org.springframework.web.bind.annotation.*;
import com.traininginsights.repository.BaseUrlConfigRepository;

@RestController
@RequestMapping("/api/config")
public class ConfigController {

    private final BaseUrlConfigRepository baseUrlRepo;
    public ConfigController(BaseUrlConfigRepository baseUrlRepo){ this.baseUrlRepo = baseUrlRepo; }

    @org.springframework.beans.factory.annotation.Value("${app.attachments.maxMb:25}")
    private int maxAttachmentMb;
    @org.springframework.beans.factory.annotation.Value("${app.public.environment:local}")
    private String environmentName;
    @org.springframework.beans.factory.annotation.Value("${app.baseUrl:http://localhost:3000}")
    private String baseUrl;

    public static class AttachmentConfigDTO { public int maxMb; public AttachmentConfigDTO(int m){ this.maxMb = m; } }
    public static class UnifiedConfigDTO { public Attachments attachments = new Attachments(); public String environment; public String baseUrl; public static class Attachments { public int maxMb; } }

    @GetMapping("/attachments")
    public AttachmentConfigDTO attachmentConfig(){
        return new AttachmentConfigDTO(maxAttachmentMb);
    }

    @GetMapping
    public UnifiedConfigDTO unified(){
        UnifiedConfigDTO dto = new UnifiedConfigDTO();
        dto.attachments.maxMb = maxAttachmentMb;
        dto.environment = environmentName;
        // If a DB override exists, prefer it
        try {
            var opt = baseUrlRepo.findTopByOrderByIdDesc();
            if (opt.isPresent()) {
                dto.baseUrl = opt.get().getBaseUrl();
            } else {
                dto.baseUrl = baseUrl;
            }
        } catch (Exception e){ dto.baseUrl = baseUrl; }
        return dto;
    }
}
