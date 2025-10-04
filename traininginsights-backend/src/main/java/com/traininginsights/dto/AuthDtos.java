package com.traininginsights.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public class AuthDtos {
    public static class SigninRequest {
        @Email @NotBlank
        public String email;
        @NotBlank
        public String password;
    }

    public static class SignupRequest {
        @NotBlank public String firstName;
        @NotBlank public String lastName;
        @Email @NotBlank public String email;
        @NotBlank public String password;
        public String birthDate; // ISO yyyy-MM-dd
        public String athleteCategory; // enum name
        public Long groupId; // optional
        public Long clubId; // optional
    }

    public static class AuthResponse {
        public String token;
        public Long userId;
        public String email;
        public String[] roles;

        public AuthResponse(String token, Long userId, String email, String[] roles) {
            this.token = token; this.userId = userId; this.email = email; this.roles = roles;
        }
    }
}
