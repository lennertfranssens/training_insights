package com.traininginsights.service;

import com.traininginsights.model.*;
import com.traininginsights.repository.GroupRepository;
import com.traininginsights.repository.ClubRepository;
import com.traininginsights.repository.RoleRepository;
import com.traininginsights.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;
import java.util.Arrays;
import java.util.HashSet;

@Service
public class UserService {
    private final UserRepository userRepo;
    private final RoleRepository roleRepo;
    private final GroupRepository groupRepo;
    private final ClubRepository clubRepo;
    private final PasswordEncoder encoder;

    public UserService(UserRepository userRepo, RoleRepository roleRepo, GroupRepository groupRepo, ClubRepository clubRepo, PasswordEncoder encoder) {
        this.userRepo = userRepo; this.roleRepo = roleRepo; this.groupRepo = groupRepo; this.clubRepo = clubRepo; this.encoder = encoder;
    }

    public Optional<User> findByEmail(String email){ return userRepo.findByEmailIgnoreCase(email); }
    public Optional<User> get(Long id){ return userRepo.findById(id); }
    public List<User> all(){ return userRepo.findAll(); }

    @Transactional
    public User createUser(String firstName, String lastName, String email, String rawPassword,
                           LocalDate birthDate, AthleteCategory category, Long groupId, Set<RoleName> roles) {
        if (userRepo.existsByEmailIgnoreCase(email)) throw new IllegalArgumentException("Email already in use");
        User u = new User();
        u.setFirstName(firstName);
        u.setLastName(lastName);
        u.setEmail(email);
        u.setPasswordHash(encoder.encode(rawPassword));
        u.setBirthDate(birthDate);
        u.setAthleteCategory(category);
        if (groupId != null) {
            Group g = groupRepo.findById(groupId).orElseThrow();
            u.setGroupEntity(g);
        }
        // clubs will be set by controller via setClubs after validation if needed
        Set<Role> roleEntities = roles.stream()
                .map(rn -> roleRepo.findByName(rn).orElseThrow())
                .collect(Collectors.toSet());
        u.setRoles(roleEntities);
        // new users start inactive until activation mail completion
        u.setActive(false);
        return userRepo.save(u);
    }

    @Transactional
    public User updateUser(Long id, Map<String,Object> patch) {
        User u = userRepo.findById(id).orElseThrow();
        if (patch.containsKey("firstName")) u.setFirstName((String) patch.get("firstName"));
        if (patch.containsKey("lastName")) u.setLastName((String) patch.get("lastName"));
        if (patch.containsKey("email")) u.setEmail((String) patch.get("email"));
        if (patch.containsKey("birthDate")) {
            Object bdObj = patch.get("birthDate");
            if (bdObj == null) {
                // explicit null -> clear birth date
                u.setBirthDate(null);
            } else {
                String d = bdObj.toString();
                if (d.isBlank()) {
                    // empty string -> clear birth date
                    u.setBirthDate(null);
                } else {
                    try {
                        u.setBirthDate(LocalDate.parse(d));
                    } catch (java.time.format.DateTimeParseException ex) {
                        throw new IllegalArgumentException("Invalid birthDate format. Expected yyyy-MM-dd");
                    }
                }
            }
        }
        if (patch.containsKey("athleteCategory")) {
            String ac = (String) patch.get("athleteCategory");
            if (ac != null) u.setAthleteCategory(AthleteCategory.valueOf(ac));
        }
        if (patch.containsKey("active")) {
            Boolean active = (Boolean) patch.get("active");
            if (active != null) u.setActive(active);
        }
        if (patch.containsKey("groupId")) {
            Object gid = patch.get("groupId");
            if (gid != null) {
                Long groupId = Long.valueOf(gid.toString());
                Group g = groupRepo.findById(groupId).orElse(null);
                if (g != null) {
                    // ensure user's clubs intersect with group's clubs
                    Set<Long> userClubIds = u.getClubs().stream().map(c->c.getId()).collect(Collectors.toSet());
                    boolean ok = g.getClubs().stream().anyMatch(c->userClubIds.contains(c.getId()));
                    if (!ok) throw new IllegalArgumentException("User must belong to at least one club assigned to the group");
                }
                u.setGroupEntity(g);
            } else {
                u.setGroupEntity(null);
            }
        }
        if (patch.containsKey("clubIds")) {
            Object obj = patch.get("clubIds");
            if (obj == null) {
                u.setClubs(new HashSet<>());
            } else if (obj instanceof Long[]) {
                Long[] arr = (Long[]) obj;
                Set<com.traininginsights.model.Club> clubs = Arrays.stream(arr)
                        .map(i -> clubRepo.findById(i).orElseThrow())
                        .collect(Collectors.toSet());
                u.setClubs(clubs);
            } else if (obj instanceof java.util.List) {
                java.util.List<?> list = (java.util.List<?>) obj;
                Set<com.traininginsights.model.Club> clubs = list.stream()
                        .map(i -> clubRepo.findById(Long.valueOf(i.toString())).orElseThrow())
                        .collect(Collectors.toSet());
                u.setClubs(clubs);
            }
        }
        if (patch.containsKey("roleNames")) {
            String[] names = (String[]) patch.get("roleNames");
            if (names != null) {
                Set<Role> roleEntities = Arrays.stream(names)
                        .map(s -> roleRepo.findByName(RoleName.valueOf(s)).orElseThrow())
                        .collect(Collectors.toSet());
                u.setRoles(roleEntities);
            }
        }
        if (patch.containsKey("password")) {
            String newPass = (String) patch.get("password");
            if (newPass != null && !newPass.isBlank()) {
                u.setPasswordHash(encoder.encode(newPass));
            }
        }
        if (patch.containsKey("phone")) {
            u.setPhone((String) patch.get("phone"));
        }
        if (patch.containsKey("address")) {
            u.setAddress((String) patch.get("address"));
        }
        if (patch.containsKey("dailyReminderTime")) {
            u.setDailyReminderTime((String) patch.get("dailyReminderTime"));
        }
        return userRepo.save(u);
    }

    public void delete(Long id){ userRepo.deleteById(id); }

    public User activateUser(User u){
        u.setActive(true);
        return userRepo.save(u);
    }
}
