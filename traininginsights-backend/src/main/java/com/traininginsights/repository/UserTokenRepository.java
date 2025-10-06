package com.traininginsights.repository;

import com.traininginsights.model.UserToken;
import com.traininginsights.model.TokenType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.Optional;

public interface UserTokenRepository extends JpaRepository<UserToken, Long> {
    Optional<UserToken> findByToken(String token);
    long deleteByExpiresAtBefore(Instant cutoff);
    long deleteByUserIdAndType(Long userId, TokenType type);
}
