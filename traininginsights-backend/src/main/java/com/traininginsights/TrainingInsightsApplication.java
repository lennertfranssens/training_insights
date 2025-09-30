package com.traininginsights;

import com.traininginsights.model.*;
import com.traininginsights.repository.RoleRepository;
import com.traininginsights.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.context.annotation.Bean;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDate;
import java.util.Arrays;
import java.util.HashSet;

@SpringBootApplication
@EnableScheduling
public class TrainingInsightsApplication {

    public static void main(String[] args) {
        SpringApplication.run(TrainingInsightsApplication.class, args);
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    CommandLineRunner seed(RoleRepository roleRepository, UserRepository userRepository, PasswordEncoder encoder) {
        return args -> {
            // Ensure roles
            for (RoleName rn : RoleName.values()) {
                roleRepository.findByName(rn).orElseGet(() -> {
                    Role r = new Role();
                    r.setName(rn);
                    return roleRepository.save(r);
                });
            }

            // Create default superadmin if not exists
            String email = "superadmin@ti.local";
            if (userRepository.findByEmailIgnoreCase(email).isEmpty()) {
                User u = new User();
                u.setFirstName("Super");
                u.setLastName("Admin");
                u.setEmail(email);
                u.setPasswordHash(encoder.encode("superadmin"));
                u.setBirthDate(LocalDate.of(1990, 1, 1));
                u.setAthleteCategory(AthleteCategory.SENIOR);
                u.setActive(true);
                var superRole = roleRepository.findByName(RoleName.ROLE_SUPERADMIN).get();
                u.setRoles(new HashSet<>(Arrays.asList(superRole)));
                userRepository.save(u);
                System.out.println("Created default superadmin: " + email + " / superadmin");
            }
        };
    }
}
