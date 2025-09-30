package com.traininginsights.service;

import com.traininginsights.model.*;
import com.traininginsights.repository.MembershipRepository;
import com.traininginsights.repository.SeasonRepository;
import com.traininginsights.repository.UserRepository;
import com.traininginsights.repository.ClubRepository;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.stream.Collectors;
import com.traininginsights.dto.MembershipDto;

@Service
public class MembershipService {
    private final MembershipRepository membershipRepository;
    private final SeasonRepository seasonRepository;
    private final UserRepository userRepository;
    private final ClubRepository clubRepository;
    private final EmailService emailService;

    public MembershipService(MembershipRepository membershipRepository, SeasonRepository seasonRepository, UserRepository userRepository, ClubRepository clubRepository, EmailService emailService){
        this.membershipRepository = membershipRepository;
        this.seasonRepository = seasonRepository;
        this.userRepository = userRepository;
        this.clubRepository = clubRepository;
        this.emailService = emailService;
    }

    public Season createSeason(Season s){ return seasonRepository.save(s); }
    public List<Season> listSeasons(){ return seasonRepository.findAll(); }

    public Membership createMembership(Long userId, Long clubId, Long seasonId, Instant start, Instant end){
        User u = userRepository.findById(userId).orElseThrow();
        Club c = clubRepository.findById(clubId).orElseThrow();
        Season s = seasonRepository.findById(seasonId).orElseThrow();
        Membership m = new Membership();
        m.setUser(u); m.setClub(c); m.setSeason(s); m.setStartDate(start); m.setEndDate(end); m.setStatus("ACTIVE");
        // If user hasn't been manually overridden, auto-activate them on membership create
        if (u != null && u.getActiveOverride() == null){ u.setActive(true); userRepository.save(u); }
        return membershipRepository.save(m);
    }

    public Membership endMembership(Long membershipId, Instant end){
        Membership m = membershipRepository.findById(membershipId).orElseThrow();
        m.setEndDate(end);
        m.setStatus("EXPIRED");
        return membershipRepository.save(m);
    }

    public Membership renewMembership(Long membershipId, Long newSeasonId, Instant newStart, Instant newEnd){
        Membership m = membershipRepository.findById(membershipId).orElseThrow();
        Season s = seasonRepository.findById(newSeasonId).orElseThrow();
        // Create new membership record for next season
        Membership nm = new Membership();
        nm.setUser(m.getUser()); nm.setClub(m.getClub()); nm.setSeason(s); nm.setStartDate(newStart); nm.setEndDate(newEnd); nm.setStatus("ACTIVE");
        // Auto-activate user unless manually overridden
        User u = m.getUser(); if (u != null && u.getActiveOverride() == null){ u.setActive(true); userRepository.save(u); }
        return membershipRepository.save(nm);
    }

    public List<Membership> listByClub(Long clubId){ Club c = clubRepository.findById(clubId).orElseThrow(); return membershipRepository.findByClub(c); }
    public List<Membership> listByUser(Long userId){ User u = userRepository.findById(userId).orElseThrow(); return membershipRepository.findByUser(u); }

    public List<MembershipDto> listByClubDto(Long clubId){
        return listByClub(clubId).stream().map(this::toDto).collect(Collectors.toList());
    }

    public List<MembershipDto> search(Long clubId, Long seasonId, String category, Long groupId, Integer minAge, Integer maxAge){
        // start from memberships by club if provided, otherwise all
        List<Membership> base = clubId != null ? listByClub(clubId) : membershipRepository.findAll();
        return base.stream().filter(m -> {
            if (seasonId != null && (m.getSeason() == null || !m.getSeason().getId().equals(seasonId))) return false;
            if (category != null && m.getUser() != null && (m.getUser().getAthleteCategory() == null || !m.getUser().getAthleteCategory().name().equalsIgnoreCase(category))) return false;
            if (groupId != null && m.getUser() != null){
                var g = m.getUser().getGroupEntity(); if (g == null || g.getId() == null || !g.getId().equals(groupId)) return false;
            }
            if ((minAge != null || maxAge != null) && m.getUser() != null && m.getUser().getBirthDate() != null){
                java.time.LocalDate b = m.getUser().getBirthDate();
                int age = java.time.Period.between(b, java.time.LocalDate.now()).getYears();
                if (minAge != null && age < minAge) return false;
                if (maxAge != null && age > maxAge) return false;
            }
            return true;
        }).map(this::toDto).collect(Collectors.toList());
    }

    public MembershipDto toDto(Membership m){
        MembershipDto d = new MembershipDto();
        d.id = m.getId();
        d.userId = m.getUser() != null ? m.getUser().getId() : null;
        if (m.getUser() != null){ d.userFirstName = m.getUser().getFirstName(); d.userLastName = m.getUser().getLastName(); d.userEmail = m.getUser().getEmail(); }
        d.clubId = m.getClub() != null ? m.getClub().getId() : null;
        d.clubName = m.getClub() != null ? m.getClub().getName() : null;
        d.seasonId = m.getSeason() != null ? m.getSeason().getId() : null;
        d.seasonName = m.getSeason() != null ? m.getSeason().getName() : null;
        d.startDate = m.getStartDate(); d.endDate = m.getEndDate(); d.status = m.getStatus();
        return d;
    }

    public void expireMembershipsPastDue(){
        List<Membership> all = membershipRepository.findAll();
        Instant now = Instant.now();
        for (Membership m : all){
            boolean shouldExpire = false;
            if (m.getEndDate() != null && m.getEndDate().isBefore(now)) shouldExpire = true;
            if (m.getSeason() != null && m.getSeason().getEndDate() != null && m.getSeason().getEndDate().isBefore(now)) shouldExpire = true;
            if (shouldExpire && !"EXPIRED".equalsIgnoreCase(m.getStatus())){
                m.setStatus("EXPIRED");
                membershipRepository.save(m);
                // If user has no other active memberships and no manual override, set user inactive
                User u = m.getUser();
                if (u != null && (u.getActiveOverride() == null)){
                    boolean hasActive = membershipRepository.findByUser(u).stream().anyMatch(x -> "ACTIVE".equalsIgnoreCase(x.getStatus()));
                    if (!hasActive){ u.setActive(false); userRepository.save(u); }
                }
            }
        }
    }

    // Check memberships and create/send notifications (move notification logic here so scheduler can be split)
    public void checkAndQueueMembershipNotifications(){
        List<Membership> all = membershipRepository.findAll();
        Instant now = Instant.now();
        for (Membership m : all){
            Instant target = m.getEndDate();
            if (target == null && m.getSeason() != null) target = m.getSeason().getEndDate();
            if (target == null) continue;
            long daysUntil = java.time.Duration.between(now, target).toDays();
            Club c = m.getClub();
            User u = m.getUser();
            if (u == null || c == null || u.getEmail() == null) continue;
            if (daysUntil <= 7 && daysUntil > 1 && !m.isNotified7Days()){
                String subj = "Membership expiring soon";
                String body = String.format("Hi %s,\n\nYour membership for %s is expiring on %s. Please renew if you want to continue.", u.getFirstName(), c.getName(), target.toString());
                // persist flag and create Notification (which will attempt email/push)
                try {
                    var ns = org.springframework.web.context.ContextLoader.getCurrentWebApplicationContext().getBean(com.traininginsights.service.NotificationService.class);
                    ns.createSystemNotificationForUser(u.getId(), subj, body);
                } catch (Exception e){
                    boolean sent = emailService.sendSimpleMail(c, u.getEmail(), subj, body);
                    if (sent){ m.setNotified7Days(true); membershipRepository.save(m); }
                }
                m.setNotified7Days(true); membershipRepository.save(m);
            }
            if (daysUntil <= 1 && daysUntil >= 0 && !m.isNotified1Day()){
                String subj = "Membership expires tomorrow";
                String body = String.format("Hi %s,\n\nYour membership for %s expires on %s. Please renew today to stay active.", u.getFirstName(), c.getName(), target.toString());
                try {
                    var ns = org.springframework.web.context.ContextLoader.getCurrentWebApplicationContext().getBean(com.traininginsights.service.NotificationService.class);
                    ns.createSystemNotificationForUser(u.getId(), subj, body);
                } catch (Exception e){
                    boolean sent = emailService.sendSimpleMail(c, u.getEmail(), subj, body);
                    if (sent){ m.setNotified1Day(true); membershipRepository.save(m); }
                }
                m.setNotified1Day(true); membershipRepository.save(m);
            }
        }
    }
}
