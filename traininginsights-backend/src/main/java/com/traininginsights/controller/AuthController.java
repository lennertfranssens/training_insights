package com.traininginsights.controller;

import com.traininginsights.dto.AuthDtos;
import com.traininginsights.model.*;
import com.traininginsights.repository.GroupRepository;
import com.traininginsights.repository.ClubRepository;
import com.traininginsights.repository.RoleRepository;
import com.traininginsights.repository.UserRepository;
import com.traininginsights.security.JwtService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.Set;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final GroupRepository groupRepository;
    private final PasswordEncoder encoder;
    private final ClubRepository clubRepository;

    public AuthController(AuthenticationManager authenticationManager, JwtService jwtService, UserRepository userRepository, RoleRepository roleRepository, GroupRepository groupRepository, PasswordEncoder encoder, ClubRepository clubRepository) {
        this.authenticationManager = authenticationManager;
        this.jwtService = jwtService;
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.groupRepository = groupRepository;
        this.encoder = encoder;
        this.clubRepository = clubRepository;
    }

    @PostMapping("/signin")
    public ResponseEntity<AuthDtos.AuthResponse> signin(@RequestBody @Valid AuthDtos.SigninRequest request) {
    authenticationManager.authenticate(
        new UsernamePasswordAuthenticationToken(request.email, request.password));
        User user = userRepository.findByEmailIgnoreCase(request.email).orElseThrow();
        var roleNames = user.getRoles().stream().map(r -> r.getName().name()).toArray(String[]::new);
        var claims = new HashMap<String,Object>();
        claims.put("roles", roleNames);
        String token = jwtService.generateToken(user.getEmail(), claims);
        return ResponseEntity.ok(new AuthDtos.AuthResponse(token, user.getId(), user.getEmail(), roleNames));
    }

    @PostMapping("/signup")
    public ResponseEntity<AuthDtos.AuthResponse> signup(@RequestBody @Valid AuthDtos.SignupRequest req){
        if (userRepository.existsByEmailIgnoreCase(req.email)) {
            return ResponseEntity.badRequest().build();
        }
        User u = new User();
        u.setFirstName(req.firstName);
        u.setLastName(req.lastName);
        u.setEmail(req.email);
        u.setPasswordHash(encoder.encode(req.password));
        if (req.birthDate != null) u.setBirthDate(LocalDate.parse(req.birthDate));
        if (req.athleteCategory != null) u.setAthleteCategory(AthleteCategory.valueOf(req.athleteCategory));
        if (req.groupId != null) {
            groupRepository.findById(req.groupId).ifPresent(u::setGroupEntity);
        }
        if (req.clubId != null) {
            var clubOpt = clubRepository.findById(req.clubId);
            if (clubOpt.isEmpty()) {
                return ResponseEntity.badRequest().body(new AuthDtos.AuthResponse("INVALID_CLUB", null, null, new String[]{}));
            } else {
                u.setClubs(Set.of(clubOpt.get()));
            }
        }
        // default role ATHLETE
        Role athlete = roleRepository.findByName(RoleName.ROLE_ATHLETE).orElseThrow();
        u.setRoles(Set.of(athlete));
        userRepository.save(u);

        var roleNames = new String[]{athlete.getName().name()};
        var claims = new HashMap<String,Object>();
        claims.put("roles", roleNames);
        String token = jwtService.generateToken(u.getEmail(), claims);
        return ResponseEntity.ok(new AuthDtos.AuthResponse(token, u.getId(), u.getEmail(), roleNames));
    }
}
