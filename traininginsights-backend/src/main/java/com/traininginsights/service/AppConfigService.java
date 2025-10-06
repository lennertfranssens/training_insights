package com.traininginsights.service;

import com.traininginsights.model.AppConfig;
import com.traininginsights.repository.AppConfigRepository;
import org.springframework.stereotype.Service;

@Service
public class AppConfigService {
    private final AppConfigRepository repo;
    public AppConfigService(AppConfigRepository repo){ this.repo = repo; }

    public String getBaseUrl(){
    return repo.findTopByOrderByIdDesc()
        .map(AppConfig::getPublicBaseUrl)
        .filter(v -> v != null && !v.isBlank())
        .map(v -> normalize(v, null))
        .orElse("http://localhost:3000");
    }

    public AppConfig setBaseUrl(String url){
        return setBaseUrl(url, null);
    }

    public AppConfig setBaseUrl(String url, String protocol){
        AppConfig cfg = repo.findTopByOrderByIdDesc().orElseGet(AppConfig::new);
        cfg.setPublicBaseUrl(normalize(url, protocol));
        return repo.save(cfg);
    }

    private String normalize(String url, String protocol){
        String u = url.trim();
        boolean hasScheme = u.startsWith("http://") || u.startsWith("https://");
        if (!hasScheme){
            String p = (protocol == null || protocol.isBlank()) ? "https" : protocol.toLowerCase();
            if (!p.equals("http") && !p.equals("https")) throw new IllegalArgumentException("protocol must be http or https");
            u = p + "://" + u;
        }
        // remove trailing slash
        if (u.endsWith("/")) u = u.substring(0, u.length()-1);
        return u;
    }
}
