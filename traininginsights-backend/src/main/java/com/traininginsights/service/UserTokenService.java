package com.traininginsights.service;

import com.traininginsights.model.*;
import com.traininginsights.repository.UserTokenRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;

@Service
public class UserTokenService {
    private final UserTokenRepository tokenRepo;
    private final SecureRandom random = new SecureRandom();

    public UserTokenService(UserTokenRepository tokenRepo){ this.tokenRepo = tokenRepo; }

    public String generateToken(User user, TokenType type, int hoursValid){
        // optionally clear previous tokens of same type
        tokenRepo.deleteByUserIdAndType(user.getId(), type);
        byte[] buf = new byte[32]; random.nextBytes(buf);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(buf);
        UserToken ut = new UserToken();
        ut.setUser(user); ut.setToken(token); ut.setType(type);
        ut.setExpiresAt(Instant.now().plus(hoursValid, ChronoUnit.HOURS));
        tokenRepo.save(ut);
        return token;
    }

    @Transactional
    public User consumeToken(String token, TokenType expectedType){
        UserToken ut = tokenRepo.findByToken(token).orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST, "Invalid token"));
        if (ut.isUsed()) throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST, "Token already used");
        if (!ut.getType().equals(expectedType)) throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST, "Invalid token type");
        if (ut.getExpiresAt().isBefore(Instant.now())) throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST, "Token expired");
        ut.setUsed(true); tokenRepo.save(ut);
        return ut.getUser();
    }

    public int purgeExpired(){ return (int) tokenRepo.deleteByExpiresAtBefore(Instant.now().minus(1, ChronoUnit.DAYS)); }
}
