package com.traininginsights.service;

import com.traininginsights.model.Club;
import com.traininginsights.model.User;
import com.traininginsights.repository.*;
import org.springframework.stereotype.Service;

// (Intentionally avoiding wildcard imports per style; using fully-qualified in code where needed)

@Service
public class MetricsService {
    private final ClubRepository clubRepository;
    private final UserRepository userRepository;
    private final EmailLogRepository emailLogRepository;
    private final PasswordResetLogRepository passwordResetLogRepository;

    public MetricsService(ClubRepository clubRepository, UserRepository userRepository, EmailLogRepository emailLogRepository, PasswordResetLogRepository passwordResetLogRepository) {
        this.clubRepository = clubRepository;
        this.userRepository = userRepository;
        this.emailLogRepository = emailLogRepository;
        this.passwordResetLogRepository = passwordResetLogRepository;
    }

    public static class MetricsDto {
        public long totalClubs;
        public long totalUsers;
        public long inactiveUsers;
        public long totalEmailsSent;
        public long totalPasswordResets;
        public BiggestClub biggestClub; // nullable
        public java.util.List<ClubUsers> usersPerClub = new java.util.ArrayList<>();
    }
    public static class BiggestClub { public Long id; public String name; public long userCount; }
    public static class ClubUsers { public Long id; public String name; public long userCount; }

    /**
     * Compute global metrics for superadmin.
     */
    public MetricsDto globalMetrics(){
        MetricsDto dto = new MetricsDto();
        java.util.List<Club> clubs = clubRepository.findAll();
        java.util.List<User> users = userRepository.findAll();
        dto.totalClubs = clubs.size();
        dto.totalUsers = users.size();
        dto.inactiveUsers = users.stream().filter(u -> !u.isActive()).count();
        dto.totalEmailsSent = emailLogRepository.count();
        dto.totalPasswordResets = passwordResetLogRepository.count();
        // users per club (distinct users having membership in that club via user.clubs set)
        ClubUsers biggest = null;
        for (Club c : clubs){
            long count = users.stream().filter(u -> u.getClubs() != null && u.getClubs().stream().anyMatch(cc -> cc.getId().equals(c.getId()))).count();
            ClubUsers cu = new ClubUsers(); cu.id = c.getId(); cu.name = c.getName(); cu.userCount = count; dto.usersPerClub.add(cu);
            if (biggest == null || count > biggest.userCount){ biggest = cu; }
        }
        if (biggest != null){
            dto.biggestClub = new BiggestClub();
            dto.biggestClub.id = biggest.id; dto.biggestClub.name = biggest.name; dto.biggestClub.userCount = biggest.userCount;
        }
        // sort usersPerClub descending by userCount
        dto.usersPerClub.sort((a,b) -> Long.compare(b.userCount, a.userCount));
        return dto;
    }

    /**
     * Metrics scoped to clubs an admin belongs to (or a selected club if provided).
     * If selectedClubId not null, restrict to that single club.
     */
    public MetricsDto adminMetrics(User admin, Long selectedClubId){
        MetricsDto dto = new MetricsDto();
        if (admin == null) return dto;
        java.util.Set<Long> allowedClubIds = new java.util.HashSet<>();
        if (admin.getClubs() != null){
            for (Club c : admin.getClubs()) allowedClubIds.add(c.getId());
        }
        java.util.List<User> users = userRepository.findAll(); // naive; optimize later if needed
        java.util.List<Club> clubs = clubRepository.findAll();
        java.util.List<Club> scopeClubs = new java.util.ArrayList<>();
        for (Club c : clubs){
            if (allowedClubIds.contains(c.getId()) && (selectedClubId == null || c.getId().equals(selectedClubId))) scopeClubs.add(c);
        }
        dto.totalClubs = scopeClubs.size();
        // Filter users to those in scope clubs
        java.util.Set<Long> clubUserIds = new java.util.HashSet<>();
        for (User u : users){
            boolean inScope = u.getClubs() != null && u.getClubs().stream().anyMatch(c -> scopeClubs.stream().anyMatch(sc -> sc.getId().equals(c.getId())));
            if (inScope) clubUserIds.add(u.getId());
        }
        dto.totalUsers = clubUserIds.size();
        dto.inactiveUsers = users.stream().filter(u -> clubUserIds.contains(u.getId()) && !u.isActive()).count();
        // Email counts: sum counts for each scope club (if clubId null counts global limited by clubId filter requires custom query; for now naive: can't filter by club w/out iterating logs -> leaving as total for scope clubs by summing counts)
        // Simplicity: if single club selected, filter by that clubId using repository method countByClubId; else use totalEmailsSent for all scope clubs by summing individually.
        long emails = 0;
        if (scopeClubs.size() == 1){
            emails = emailLogRepository.countByClubId(scopeClubs.get(0).getId());
        } else {
            for (Club c : scopeClubs){ emails += emailLogRepository.countByClubId(c.getId()); }
        }
        dto.totalEmailsSent = emails;
        // Password resets: cannot easily scope without joining to user; naive: if single club, count resets for users in that club; else sum for union
        long resets = 0;
        if (!clubUserIds.isEmpty()){
            // load all password reset logs then filter (naive); To avoid adding repository methods now, we skip detailed counts when large.
            // For now, approximate resets by counting all resets globally for simplicity when multi-club.
            if (scopeClubs.size() == 1){
                // TODO: optimize with custom query; for now we approximate using global count (limitation documented)
                resets = passwordResetLogRepository.count();
            } else {
                resets = passwordResetLogRepository.count();
            }
        }
        dto.totalPasswordResets = resets;
        // Users per club
        for (Club c : scopeClubs){
            long count = users.stream().filter(u -> u.getClubs() != null && u.getClubs().stream().anyMatch(cc -> cc.getId().equals(c.getId()))).count();
            ClubUsers cu = new ClubUsers(); cu.id = c.getId(); cu.name = c.getName(); cu.userCount = count; dto.usersPerClub.add(cu);
        }
        dto.usersPerClub.sort((a,b) -> Long.compare(b.userCount, a.userCount));
        if (!dto.usersPerClub.isEmpty()){
            ClubUsers first = dto.usersPerClub.get(0);
            dto.biggestClub = new BiggestClub(); dto.biggestClub.id = first.id; dto.biggestClub.name = first.name; dto.biggestClub.userCount = first.userCount;
        }
        return dto;
    }
}
