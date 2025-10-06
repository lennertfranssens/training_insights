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

    // Test SMTP connectivity (simple socket connect; does not send an email)
    @PreAuthorize("hasAnyRole('ADMIN','SUPERADMIN')")
    @PostMapping("/admin/{id}/smtp/test")
    public java.util.Map<String,Object> testSmtp(@PathVariable Long id, @RequestBody(required = false) java.util.Map<String,Object> body){
        Club c = service.findById(id).orElseThrow();
        // Allow overriding unsaved form values by providing them in body
        String host = body != null && body.get("smtpHost") != null ? body.get("smtpHost").toString() : c.getSmtpHost();
        Integer port = null;
        if (body != null && body.get("smtpPort") != null) {
            try { port = Integer.valueOf(body.get("smtpPort").toString()); } catch (Exception ignored) {}
        } else { port = c.getSmtpPort(); }
        Boolean useTls = body != null && body.get("smtpUseTls") != null ? Boolean.valueOf(body.get("smtpUseTls").toString()) : c.getSmtpUseTls();
        Integer timeoutMs =  body != null && body.get("timeoutMs") != null ? Integer.valueOf(body.get("timeoutMs").toString()) : 4000;
        if (timeoutMs == null || timeoutMs < 1000) timeoutMs = 4000;
        java.util.Map<String,Object> result = new java.util.HashMap<>();
        result.put("host", host);
        result.put("port", port);
        result.put("useTls", useTls);
        result.put("timeoutMs", timeoutMs);
        if (host == null || host.isBlank() || port == null) {
            result.put("success", false);
            result.put("message", "Host and port required");
            return result;
        }
        long start = System.currentTimeMillis();
        java.net.Socket socket = null;
        try {
            boolean implicitTls = Boolean.TRUE.equals(useTls) && (port == 465 || port == 587); // 587 often STARTTLS but we'll probe below
            if (implicitTls && port == 465) {
                javax.net.ssl.SSLSocketFactory factory = (javax.net.ssl.SSLSocketFactory) javax.net.ssl.SSLSocketFactory.getDefault();
                socket = factory.createSocket();
            } else {
                socket = new java.net.Socket();
            }
            socket.connect(new java.net.InetSocketAddress(host, port), timeoutMs);
            socket.setSoTimeout(timeoutMs);
            // Basic protocol banner read (non-blocking short read) to differentiate timeout vs connected-no-banner
            try {
                socket.getOutputStream().write("\r\n".getBytes()); // provoke banner if any
            } catch (Exception ignored) {}
            result.put("success", true);
            result.put("message", "Connection successful");
        } catch (java.net.SocketTimeoutException e) {
            result.put("success", false);
            result.put("errorType", "TIMEOUT");
            result.put("message", "Connect timed out – verify host/port, firewall, or that TLS setting matches server (465 implicit TLS; 587 usually STARTTLS)." );
        } catch (java.net.UnknownHostException e) {
            result.put("success", false);
            result.put("errorType", "UNKNOWN_HOST");
            result.put("message", "Unknown host: " + e.getMessage());
        } catch (javax.net.ssl.SSLHandshakeException e) {
            result.put("success", false);
            result.put("errorType", "SSL_HANDSHAKE");
            result.put("message", "SSL handshake failed – likely incorrect TLS usage or certificate issue: " + e.getMessage());
        } catch (Exception e) {
            result.put("success", false);
            result.put("errorType", e.getClass().getSimpleName());
            result.put("message", e.getClass().getSimpleName() + ": " + e.getMessage());
        } finally {
            long elapsed = System.currentTimeMillis() - start;
            result.put("elapsedMs", elapsed);
            if (socket != null) try { socket.close(); } catch (Exception ignored) {}
        }
        return result;
    }

    @PreAuthorize("hasRole('SUPERADMIN')")
    @DeleteMapping("/{id}") public void delete(@PathVariable Long id){ service.delete(id); }
}
