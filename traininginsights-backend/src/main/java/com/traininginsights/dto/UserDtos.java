package com.traininginsights.dto;

import com.traininginsights.model.AthleteCategory;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class UserDtos {
    public static class UserDTO {
        public Long id;
        public String firstName;
        public String lastName;
        public String email;
        public AthleteCategory athleteCategory;
        public boolean active;
    public Boolean activeOverride;
        public String birthDate;
        public Long groupId;
        public String groupName;
        public String[] roles;
        public Long[] clubIds;
        public String phone;
        public String address;
        public String dailyReminderTime; // HH:mm
    }

    public static class CreateUserRequest {
        @NotBlank(message = "firstName required")
        public String firstName;
        @NotBlank(message = "lastName required")
        public String lastName;
        @NotBlank(message = "email required")
        @Email(message = "email invalid")
        public String email;
    // Password optional (will be auto-generated if blank); enforce length only if provided
    @Size(min = 6, message = "password must be at least 6 chars")
    public String password;
        public String birthDate; // yyyy-MM-dd
        public String athleteCategory;
        public Long groupId;
        public Long[] clubIds;
        public String[] roleNames; // ROLE_ADMIN, etc.
        public String phone;
        public String address;
        public String dailyReminderTime; // HH:mm
    }

    public static class UpdateUserRequest {
        public String firstName;
        public String lastName;
        public String email;
        public String birthDate;
        public String athleteCategory;
        public Boolean active;
    public Boolean activeOverride;
        public Long groupId;
            public Long[] clubIds;
        public String[] roleNames;
        public String password; // optional to reset
        public String phone;
        public String address;
        public String dailyReminderTime;
    }
}
