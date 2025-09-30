package com.traininginsights.controller;

import com.traininginsights.dto.UserDtos;
import com.traininginsights.model.AthleteCategory;
import com.traininginsights.model.RoleName;
import com.traininginsights.model.User;
import com.traininginsights.service.UserService;
import com.traininginsights.repository.UserRepository;
import com.traininginsights.repository.ClubRepository;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/users")
public class UserController {
    private final UserService userService;
    private final UserRepository userRepository;
    private final ClubRepository clubRepository;
    public UserController(UserService userService, UserRepository userRepository, ClubRepository clubRepository){ this.userService = userService; this.userRepository = userRepository; this.clubRepository = clubRepository; }

    @PreAuthorize("hasAnyRole('ADMIN','SUPERADMIN','TRAINER')")
    @GetMapping
    public List<UserDtos.UserDTO> all(){
        return userService.all().stream().map(this::toDTO).collect(Collectors.toList());
    }

    @PreAuthorize("isAuthenticated()")
    @GetMapping("/me")
    public UserDtos.UserDTO me(){
        String callerEmail = SecurityContextHolder.getContext().getAuthentication().getName();
        User caller = userRepository.findByEmailIgnoreCase(callerEmail).orElseThrow();
        return toDTO(caller);
    }

    @PreAuthorize("isAuthenticated()")
    @PutMapping("/me")
    public UserDtos.UserDTO updateMe(@RequestBody UserDtos.UpdateUserRequest req){
        String callerEmail = SecurityContextHolder.getContext().getAuthentication().getName();
        User caller = userRepository.findByEmailIgnoreCase(callerEmail).orElseThrow();
        Map<String,Object> patch = new HashMap<>();
        patch.put("firstName", req.firstName);
        patch.put("lastName", req.lastName);
        patch.put("email", req.email);
        patch.put("birthDate", req.birthDate);
        patch.put("password", req.password);
        patch.put("phone", req.phone);
        patch.put("address", req.address);
        patch.put("dailyReminderTime", req.dailyReminderTime);
        User u = userService.updateUser(caller.getId(), patch);
        return toDTO(u);
    }

    @PreAuthorize("hasAnyRole('ADMIN','SUPERADMIN','TRAINER')")
    @PostMapping
    public UserDtos.UserDTO create(@RequestBody UserDtos.CreateUserRequest req){
        // determine requested roles
        Set<RoleName> roles = new HashSet<>();
        if (req.roleNames != null) {
            for (String r : req.roleNames) roles.add(RoleName.valueOf(r));
        } else {
            roles.add(RoleName.ROLE_ATHLETE);
        }

        // find caller
        String callerEmail = SecurityContextHolder.getContext().getAuthentication().getName();
        User caller = userRepository.findByEmailIgnoreCase(callerEmail).orElseThrow();
        Set<String> callerRoleNames = caller.getRoles().stream().map(r->r.getName().name()).collect(Collectors.toSet());
        Set<Long> callerClubIds = caller.getClubs().stream().map(c->c.getId()).collect(Collectors.toSet());

        // validate role creation and clubs
        Long[] clubIds = req.clubIds;
        if (roles.contains(RoleName.ROLE_ADMIN) || roles.contains(RoleName.ROLE_TRAINER)){
            // admin/trainer creation requires club assignment
            if (clubIds == null || clubIds.length == 0) throw new IllegalArgumentException("Admins and trainers must be assigned to at least one club");
            // if caller is ADMIN, ensure clubs are subset of caller's clubs
            if (callerRoleNames.contains(RoleName.ROLE_ADMIN.name()) && !callerRoleNames.contains(RoleName.ROLE_SUPERADMIN.name())){
                for (Long cid : clubIds) if (!callerClubIds.contains(cid)) throw new SecurityException("Cannot assign user to clubs you are not part of");
            }
        }

        // trainer creating athlete: ensure trainer has the club
        if (roles.contains(RoleName.ROLE_ATHLETE) && (callerRoleNames.contains(RoleName.ROLE_TRAINER.name()) || callerRoleNames.contains(RoleName.ROLE_ADMIN.name())) ){
            if (clubIds == null || clubIds.length != 1) throw new IllegalArgumentException("Athlete must be assigned to exactly one club");
            Long cid = clubIds[0];
            if (!callerClubIds.contains(cid)) throw new SecurityException("Cannot assign athlete to a club you are not part of");
        }

        // create user
        User u = userService.createUser(
                req.firstName, req.lastName, req.email, req.password,
                req.birthDate != null ? LocalDate.parse(req.birthDate) : null,
                req.athleteCategory != null ? AthleteCategory.valueOf(req.athleteCategory) : null,
                req.groupId, roles
        );

        // set clubs if provided
        if (req.clubIds != null && req.clubIds.length > 0){
            Set<com.traininginsights.model.Club> clubs = Arrays.stream(req.clubIds).map(i -> clubRepository.findById(i).orElseThrow()).collect(Collectors.toSet());
            u.setClubs(clubs);
            u = userService.updateUser(u.getId(), Map.of("clubIds", Arrays.asList(req.clubIds)));
        }
        return toDTO(u);
    }

    @PreAuthorize("hasAnyRole('ADMIN','SUPERADMIN','TRAINER')")
    @PutMapping("/{id}")
    public UserDtos.UserDTO update(@PathVariable Long id, @RequestBody UserDtos.UpdateUserRequest req){
        // find caller and target
        String callerEmail = SecurityContextHolder.getContext().getAuthentication().getName();
        User caller = userRepository.findByEmailIgnoreCase(callerEmail).orElseThrow();
        User target = userRepository.findById(id).orElseThrow();
        Set<String> callerRoleNames = caller.getRoles().stream().map(r->r.getName().name()).collect(Collectors.toSet());
        Set<Long> callerClubIds = caller.getClubs().stream().map(c->c.getId()).collect(Collectors.toSet());

        // If caller is trainer, restrict updates: only athletes and only within caller's clubs
        boolean callerIsTrainer = callerRoleNames.contains(RoleName.ROLE_TRAINER.name());
        boolean callerIsAdmin = callerRoleNames.contains(RoleName.ROLE_ADMIN.name());
        boolean callerIsSuper = callerRoleNames.contains(RoleName.ROLE_SUPERADMIN.name());

        // Determine requested role changes
        String[] requestedRoles = req.roleNames;
        Long[] requestedClubIds = req.clubIds;

        if (callerIsTrainer && !callerIsAdmin && !callerIsSuper) {
            // trainers may only update athletes
            boolean targetIsAthlete = Arrays.stream(target.getRoles().stream().map(r->r.getName().name()).toArray(String[]::new)).anyMatch(r->r.equals(RoleName.ROLE_ATHLETE.name()));
            if (!targetIsAthlete) throw new SecurityException("Trainers can only modify athletes");
            // if clubs being changed, ensure they are subset of caller's clubs
            if (requestedClubIds != null) {
                for (Long cid : requestedClubIds) if (!callerClubIds.contains(cid)) throw new SecurityException("Cannot assign user to clubs you are not part of");
            }
            // trainers cannot change roles
            if (requestedRoles != null) {
                for (String rr : requestedRoles) if (!rr.equals(RoleName.ROLE_ATHLETE.name())) throw new SecurityException("Trainers cannot change roles");
            }
        }

        if (callerIsAdmin && !callerIsSuper) {
            // admins cannot assign users to clubs they don't belong to
            if (requestedClubIds != null) {
                for (Long cid : requestedClubIds) if (!callerClubIds.contains(cid)) throw new SecurityException("Cannot assign user to clubs you are not part of");
            }
            // when promoting someone to admin/trainer ensure clubIds provided
            if (requestedRoles != null) {
                for (String rr : requestedRoles) {
                    if (rr.equals(RoleName.ROLE_ADMIN.name()) || rr.equals(RoleName.ROLE_TRAINER.name())) {
                        if (requestedClubIds == null || requestedClubIds.length == 0) throw new IllegalArgumentException("Admins and trainers must be assigned to at least one club");
                    }
                }
            }
        }

        // Superadmins can do anything; callers with admin/superadmin privileges fall through

        Map<String,Object> patch = new HashMap<>();
        patch.put("firstName", req.firstName);
        patch.put("lastName", req.lastName);
        patch.put("email", req.email);
        patch.put("birthDate", req.birthDate);
        patch.put("athleteCategory", req.athleteCategory);
        patch.put("active", req.active);
        patch.put("groupId", req.groupId);
        patch.put("roleNames", req.roleNames);
        patch.put("clubIds", req.clubIds);
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
    dto.activeOverride = u.getActiveOverride();
        dto.groupId = u.getGroupEntity() != null ? u.getGroupEntity().getId() : null;
        dto.groupName = u.getGroupEntity() != null ? u.getGroupEntity().getName() : null;
        dto.roles = u.getRoles().stream().map(r -> r.getName().name()).toArray(String[]::new);
        dto.clubIds = u.getClubs().stream().map(c -> c.getId()).toArray(Long[]::new);
        dto.phone = u.getPhone();
        dto.address = u.getAddress();
        dto.dailyReminderTime = u.getDailyReminderTime();
        return dto;
    }
}
