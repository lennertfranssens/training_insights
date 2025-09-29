package com.traininginsights.controller;

import com.traininginsights.dto.UserDtos;
import com.traininginsights.model.AthleteCategory;
import com.traininginsights.model.RoleName;
import com.traininginsights.model.User;
import com.traininginsights.service.UserService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/users")
public class UserController {
    private final UserService userService;
    public UserController(UserService userService){ this.userService = userService; }

    @PreAuthorize("hasAnyRole('ADMIN','SUPERADMIN','TRAINER')")
    @GetMapping
    public List<UserDtos.UserDTO> all(){
        return userService.all().stream().map(this::toDTO).collect(Collectors.toList());
    }

    @PreAuthorize("hasAnyRole('ADMIN','SUPERADMIN')")
    @PostMapping
    public UserDtos.UserDTO create(@RequestBody UserDtos.CreateUserRequest req){
        Set<RoleName> roles = new HashSet<>();
        if (req.roleNames != null) {
            for (String r : req.roleNames) roles.add(RoleName.valueOf(r));
        } else {
            roles.add(RoleName.ROLE_ATHLETE);
        }
        User u = userService.createUser(
                req.firstName, req.lastName, req.email, req.password,
                req.birthDate != null ? LocalDate.parse(req.birthDate) : null,
                req.athleteCategory != null ? AthleteCategory.valueOf(req.athleteCategory) : null,
                req.groupId, roles
        );
        return toDTO(u);
    }

    @PreAuthorize("hasAnyRole('ADMIN','SUPERADMIN')")
    @PutMapping("/{id}")
    public UserDtos.UserDTO update(@PathVariable Long id, @RequestBody UserDtos.UpdateUserRequest req){
        Map<String,Object> patch = new HashMap<>();
        patch.put("firstName", req.firstName);
        patch.put("lastName", req.lastName);
        patch.put("email", req.email);
        patch.put("birthDate", req.birthDate);
        patch.put("athleteCategory", req.athleteCategory);
        patch.put("active", req.active);
        patch.put("groupId", req.groupId);
        patch.put("roleNames", req.roleNames);
        patch.put("password", req.password);
        User u = userService.updateUser(id, patch);
        return toDTO(u);
    }

    @PreAuthorize("hasAnyRole('ADMIN','SUPERADMIN')")
    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id){ userService.delete(id); }

    private UserDtos.UserDTO toDTO(User u){
        UserDtos.UserDTO dto = new UserDtos.UserDTO();
        dto.id = u.getId();
        dto.firstName = u.getFirstName();
        dto.lastName = u.getLastName();
        dto.email = u.getEmail();
        dto.athleteCategory = u.getAthleteCategory();
        dto.active = u.isActive();
        dto.groupId = u.getGroupEntity() != null ? u.getGroupEntity().getId() : null;
        dto.groupName = u.getGroupEntity() != null ? u.getGroupEntity().getName() : null;
        dto.roles = u.getRoles().stream().map(r -> r.getName().name()).toArray(String[]::new);
        return dto;
    }
}
