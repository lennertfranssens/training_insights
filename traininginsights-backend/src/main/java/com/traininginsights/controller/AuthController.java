package com.traininginsights.controller;

import com.traininginsights.dto.AuthDtos;
import com.traininginsights.model.*;
import com.traininginsights.repository.UserRepository;
import com.traininginsights.security.JwtService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.web.bind.annotation.*;
import com.traininginsights.model.TokenType;
import com.traininginsights.service.UserTokenService;
import com.traininginsights.service.UserService;
import com.traininginsights.service.AppConfigService;
import com.traininginsights.service.EmailService;
import com.traininginsights.model.Club;
import com.traininginsights.repository.PasswordResetLogRepository;
import com.traininginsights.model.PasswordResetLog;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final UserRepository userRepository;
    private final UserTokenService userTokenService;
    private final UserService userService;
    private final EmailService emailService;
    private final AppConfigService appConfigService;
    private final PasswordResetLogRepository passwordResetLogRepository;
    // Removed signup endpoint; auxiliary repositories retained earlier are now unused and removed.

    public AuthController(AuthenticationManager authenticationManager, JwtService jwtService, UserRepository userRepository, UserTokenService userTokenService, UserService userService, EmailService emailService, AppConfigService appConfigService, PasswordResetLogRepository passwordResetLogRepository) {
        this.authenticationManager = authenticationManager;
        this.jwtService = jwtService;
        this.userRepository = userRepository;
        this.userTokenService = userTokenService;
        this.userService = userService;
        this.emailService = emailService;
        this.appConfigService = appConfigService;
        this.passwordResetLogRepository = passwordResetLogRepository;
    }

    @PostMapping("/signin")
    public ResponseEntity<AuthDtos.AuthResponse> signin(@RequestBody @Valid AuthDtos.SigninRequest request) {
        authenticationManager.authenticate(new UsernamePasswordAuthenticationToken(request.email, request.password));
        User user = userRepository.findByEmailIgnoreCase(request.email).orElseThrow();
        if (!user.isActive()) {
            return ResponseEntity.status(403).build();
        }
        var roleNames = user.getRoles().stream().map(r -> r.getName().name()).toArray(String[]::new);
        var claims = new HashMap<String,Object>();
        claims.put("roles", roleNames);
        String token = jwtService.generateToken(user.getEmail(), claims);
        return ResponseEntity.ok(new AuthDtos.AuthResponse(token, user.getId(), user.getEmail(), roleNames));
    }

    public static class ActivationRequest { public String token; public String password; }
    public static class PasswordResetRequest { public String email; }
    public static class PasswordResetConfirm { public String token; public String password; }
    public static class ResendActivationRequest { public String email; }

    @PostMapping("/activate")
    public ResponseEntity<?> activate(@RequestBody ActivationRequest req){
        if (req.token == null || req.password == null || req.password.isBlank()) return ResponseEntity.badRequest().body(Map.of("message","token and password required"));
        User u = userTokenService.consumeToken(req.token, TokenType.ACTIVATION);
        // set password & activate
        userService.updateUser(u.getId(), Map.of("password", req.password));
        userService.activateUser(u);
        return ResponseEntity.ok(Map.of("status","activated"));
    }

    @PostMapping("/password-reset/request")
    public ResponseEntity<?> passwordResetRequest(@RequestBody PasswordResetRequest req){
        if (req.email != null){
            userRepository.findByEmailIgnoreCase(req.email).ifPresent(user -> {
                try {
                    String token = userTokenService.generateToken(user, TokenType.PASSWORD_RESET, 24);
                    Club smtpClub = user.getClubs().stream().filter(c->c.getSmtpHost()!=null).findFirst().orElse(null);
                    if (smtpClub != null && user.getEmail() != null){
                        String baseUrl = appConfigService.getBaseUrl();
                        String link = baseUrl + "/reset?token=" + token;
                        String text = "Password reset requested. If this was you, set a new password: \n" + link + "\nIf not, ignore this email.";
                        String html = "<html><body><h2>Password reset requested</h2><p>If you initiated this request, click the button below to set a new password.</p><p><a href='" + link + "' style='display:inline-block;padding:10px 16px;background:#1976d2;color:#fff;text-decoration:none;border-radius:4px;font-weight:600'>Reset Password</a></p><p>If the button does not work, copy & paste this URL:<br>" + link + "</p><p>If you did not request this, you can safely ignore this email.</p><hr><small>Training Insights</small></body></html>";
                        emailService.sendHtmlMail(smtpClub, user.getEmail(), "Password reset", html, text);
                    }
                } catch (Exception ignored) {}
            });
        }
        return ResponseEntity.ok(Map.of("status","ok")); // always OK to avoid enumeration
    }

    @PostMapping("/password-reset/confirm")
    public ResponseEntity<?> passwordResetConfirm(@RequestBody PasswordResetConfirm req){
        if (req.token == null || req.password == null || req.password.isBlank()) return ResponseEntity.badRequest().body(Map.of("message","token and password required"));
        User u = userTokenService.consumeToken(req.token, TokenType.PASSWORD_RESET);
        userService.updateUser(u.getId(), Map.of("password", req.password));
        try { passwordResetLogRepository.save(new PasswordResetLog(u.getId())); } catch (Exception ignored) {}
        return ResponseEntity.ok(Map.of("status","reset"));
    }

    @PostMapping("/resend-activation")
    public ResponseEntity<?> resendActivation(@RequestBody ResendActivationRequest req){
        if (req.email == null || req.email.isBlank()) return ResponseEntity.badRequest().body(Map.of("message","email required"));
        userRepository.findByEmailIgnoreCase(req.email).ifPresent(user -> {
            if (user.isActive()) return; // already active -> no resend
            try {
                String token = userTokenService.generateToken(user, TokenType.ACTIVATION, 24);
                Club smtpClub = user.getClubs().stream().filter(c->c.getSmtpHost()!=null).findFirst().orElse(null);
                if (smtpClub != null && user.getEmail() != null){
                    String baseUrl = appConfigService.getBaseUrl();
                    String link = baseUrl + "/activate?token=" + token;
                    String text = "Activate your account (24h):\n" + link;
                    String html = "<html><body><h2>Activate your account</h2><p>Click the button below to activate your account. This link is valid for 24 hours.</p><p><a href='" + link + "' style='display:inline-block;padding:10px 16px;background:#2e7d32;color:#fff;text-decoration:none;border-radius:4px;font-weight:600'>Activate Account</a></p><p>If the button does not work, copy & paste this URL:<br>" + link + "</p><hr><small>Training Insights</small></body></html>";
                    emailService.sendHtmlMail(smtpClub, user.getEmail(), "Activate your account", html, text);
                }
            } catch (Exception ignored) {}
        });
        return ResponseEntity.ok(Map.of("status","ok"));
    }

    // Public signup endpoint removed to prevent automated/bot registrations.
    // Users are now provisioned exclusively by trainers/admins/superadmins via secured endpoints.
}
