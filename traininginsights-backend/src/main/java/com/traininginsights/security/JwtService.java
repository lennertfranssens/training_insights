package com.traininginsights.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.io.Decoders;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.Key;
import java.security.MessageDigest;
import java.util.Date;
import java.util.Map;
import java.util.function.Function;

@Service
public class JwtService {

    @Value("${app.jwt.secret}")
    private String jwtSecret;

    @Value("${app.jwt.expirationMillis}")
    private long jwtExpirationMillis;

    private Key getSignInKey() {
        if (jwtSecret == null || jwtSecret.isBlank()) {
            throw new IllegalStateException("app.jwt.secret is empty");
        }
        byte[] keyBytes = null;

        // 1) Try standard Base64
        try {
            keyBytes = Decoders.BASE64.decode(jwtSecret);
        } catch (Exception ignored) { }

        // 2) Try URL-safe Base64 (replace - _ to + /)
        if (keyBytes == null) {
            try {
                String normalized = jwtSecret.replace('-', '+').replace('_', '/');
                // pad with '=' if necessary
                int pad = (4 - (normalized.length() % 4)) % 4;
                normalized = normalized + "====".substring(0, pad);
                keyBytes = Decoders.BASE64.decode(normalized);
            } catch (Exception ignored) { }
        }

        // 3) Fallback: derive 256-bit key from raw secret via SHA-256
        if (keyBytes == null) {
            try {
                MessageDigest sha = MessageDigest.getInstance("SHA-256");
                keyBytes = sha.digest(jwtSecret.getBytes(StandardCharsets.UTF_8));
            } catch (Exception e) {
                throw new IllegalStateException("Cannot initialize JWT key", e);
            }
        }

        // Ensure HS256-compatible key
        if (keyBytes.length < 32) { // 256 bits
            // If shorter, stretch deterministically
            try {
                MessageDigest sha = MessageDigest.getInstance("SHA-256");
                keyBytes = sha.digest(keyBytes);
            } catch (Exception e) {
                throw new IllegalStateException("Cannot stretch JWT key", e);
            }
        }
        return new SecretKeySpec(keyBytes, "HmacSHA256");
        // or: return Keys.hmacShaKeyFor(keyBytes);
    }

    public String extractUsername(String token) {
        return extractClaim(token, Claims::getSubject);
    }

    public <T> T extractClaim(String token, Function<Claims, T> claimsResolver) {
        final Claims claims = Jwts.parserBuilder()
                .setSigningKey(getSignInKey())
                .build()
                .parseClaimsJws(token)
                .getBody();
        return claimsResolver.apply(claims);
    }

    public String generateToken(String subject, Map<String, Object> extraClaims) {
        Date now = new Date();
        Date expiry = new Date(now.getTime() + jwtExpirationMillis);
        return Jwts.builder()
                .setClaims(extraClaims)
                .setSubject(subject)
                .setIssuedAt(now)
                .setExpiration(expiry)
                .signWith(getSignInKey(), SignatureAlgorithm.HS256)
                .compact();
    }

    public boolean isTokenValid(String token, String username) {
        final String tokenUsername = extractUsername(token);
        return (tokenUsername.equalsIgnoreCase(username) && !isTokenExpired(token));
    }

    private boolean isTokenExpired(String token) {
        return extractExpiration(token).before(new Date());
    }

    private Date extractExpiration(String token) {
        return extractClaim(token, Claims::getExpiration);
    }
}