package com.traininginsights.dto;

import com.traininginsights.model.AthleteCategory;

public class UserDtos {
    public static class UserDTO {
        public Long id;
        public String firstName;
        public String lastName;
        public String email;
        public AthleteCategory athleteCategory;
        public boolean active;
    public Boolean activeOverride;
        public Long groupId;
        public String groupName;
        public String[] roles;
        public Long[] clubIds;
        public String phone;
        public String address;
        public String dailyReminderTime; // HH:mm
    }

    public static class CreateUserRequest {
        public String firstName;
        public String lastName;
        public String email;
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
