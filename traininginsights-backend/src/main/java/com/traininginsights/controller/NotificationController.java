package com.traininginsights.controller;

import com.traininginsights.model.User;
import com.traininginsights.service.NotificationService;
import com.traininginsights.repository.UserRepository;
import com.traininginsights.repository.GroupRepository;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {
    private final NotificationService notificationService;
    private final UserRepository userRepository;
    private final GroupRepository groupRepository;

    public NotificationController(NotificationService notificationService, UserRepository userRepository, GroupRepository groupRepository){
        this.notificationService = notificationService; this.userRepository = userRepository; this.groupRepository = groupRepository;
    }

    @GetMapping
    public List<com.traininginsights.model.Notification> myNotifications(){
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        User u = userRepository.findByEmailIgnoreCase(email).orElseThrow();
        return notificationService.getForRecipient(u);
    }

    @PostMapping("/{id}/read")
    public void markRead(@PathVariable Long id){
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        User u = userRepository.findByEmailIgnoreCase(email).orElseThrow();
        // validate recipient
    notificationService.getForRecipient(u).stream().filter(x->x.getId().equals(id)).findFirst().orElseThrow();
    notificationService.markRead(id, true);
    }

    @PostMapping("/{id}/unread")
    public void markUnread(@PathVariable Long id){
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        User u = userRepository.findByEmailIgnoreCase(email).orElseThrow();
    notificationService.getForRecipient(u).stream().filter(x->x.getId().equals(id)).findFirst().orElseThrow();
    notificationService.markRead(id, false);
    }

    @GetMapping("/unread-count")
    public long unreadCount(){
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        User u = userRepository.findByEmailIgnoreCase(email).orElseThrow();
        return notificationService.unreadCount(u);
    }

    // Admins can send to all members of a club
    @PreAuthorize("hasAnyRole('ADMIN','SUPERADMIN')")
    @PostMapping("/club/{clubId}/send")
    public List<com.traininginsights.service.NotificationService.SendResult> sendToClub(@PathVariable Long clubId, @RequestBody SendRequest req){
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        User caller = userRepository.findByEmailIgnoreCase(email).orElseThrow();
        // if not superadmin, ensure caller belongs to the club
        boolean isSuper = caller.getRoles().stream().anyMatch(r->r.getName().name().equals("ROLE_SUPERADMIN"));
        boolean belongs = caller.getClubs().stream().anyMatch(c->c.getId().equals(clubId));
        if (!isSuper && !belongs) throw new SecurityException("Cannot send to clubs you do not belong to");
        return notificationService.sendNotificationToClubMembers(caller.getId(), clubId, req.title, req.body);
    }

    // Athletes/trainer can send to group
    @PreAuthorize("hasAnyRole('ATHLETE','TRAINER')")
    @PostMapping("/group/{groupId}/send")
    public List<com.traininginsights.service.NotificationService.SendResult> sendToGroup(@PathVariable Long groupId, @RequestBody SendRequest req){
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        User caller = userRepository.findByEmailIgnoreCase(email).orElseThrow();
        // trainers may only send to groups they are trainers for; athletes can send to their own groups
        boolean isTrainer = caller.getRoles().stream().anyMatch(r->r.getName().name().equals("ROLE_TRAINER"));
        boolean isAthlete = caller.getRoles().stream().anyMatch(r->r.getName().name().equals("ROLE_ATHLETE"));
    com.traininginsights.model.Group g = groupRepository.findById(groupId).orElseThrow();
        boolean allowed = false;
        if (isTrainer) {
            allowed = g.getTrainers().stream().anyMatch(u->u.getId().equals(caller.getId()));
        }
        if (isAthlete) {
            allowed = allowed || g.getAthletes().stream().anyMatch(u->u.getId().equals(caller.getId()));
        }
        if (!allowed) throw new SecurityException("Cannot send to groups you are not a member/trainer of");
        return notificationService.sendNotificationToGroup(caller.getId(), groupId, req.title, req.body);
    }

    public static class SendRequest { public String title; public String body; }

    public static class BatchSendRequest { public Long[] ids; public String title; public String body; }

    // Admins: batch send to multiple clubs
    @PreAuthorize("hasAnyRole('ADMIN','SUPERADMIN')")
    @PostMapping("/batch/club/send")
    public List<com.traininginsights.service.NotificationService.SendResult> batchSendToClubs(@RequestBody BatchSendRequest req){
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        User caller = userRepository.findByEmailIgnoreCase(email).orElseThrow();
        boolean isSuper = caller.getRoles().stream().anyMatch(r->r.getName().name().equals("ROLE_SUPERADMIN"));
        List<com.traininginsights.service.NotificationService.SendResult> aggregated = new java.util.ArrayList<>();
        for (Long cid : req.ids){
            boolean belongs = caller.getClubs().stream().anyMatch(c->c.getId().equals(cid));
            if (!isSuper && !belongs) throw new SecurityException("Cannot send to clubs you do not belong to");
            aggregated.addAll(notificationService.sendNotificationToClubMembers(caller.getId(), cid, req.title, req.body));
        }
        return aggregated;
    }

    // Trainers/Athletes: batch send to multiple groups
    @PreAuthorize("hasAnyRole('ATHLETE','TRAINER')")
    @PostMapping("/batch/group/send")
    public List<com.traininginsights.service.NotificationService.SendResult> batchSendToGroups(@RequestBody BatchSendRequest req){
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        User caller = userRepository.findByEmailIgnoreCase(email).orElseThrow();
        List<com.traininginsights.service.NotificationService.SendResult> aggregated = new java.util.ArrayList<>();
        boolean isTrainer = caller.getRoles().stream().anyMatch(r->r.getName().name().equals("ROLE_TRAINER"));
        boolean isAthlete = caller.getRoles().stream().anyMatch(r->r.getName().name().equals("ROLE_ATHLETE"));
        for (Long gid : req.ids){
            com.traininginsights.model.Group g = groupRepository.findById(gid).orElseThrow();
            boolean allowed = false;
            if (isTrainer) allowed = g.getTrainers().stream().anyMatch(u->u.getId().equals(caller.getId()));
            if (isAthlete) allowed = allowed || g.getAthletes().stream().anyMatch(u->u.getId().equals(caller.getId()));
            if (!allowed) throw new SecurityException("Cannot send to groups you are not a member/trainer of");
            aggregated.addAll(notificationService.sendNotificationToGroup(caller.getId(), gid, req.title, req.body));
        }
        return aggregated;
    }
}
