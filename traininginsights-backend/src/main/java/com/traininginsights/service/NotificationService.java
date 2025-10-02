package com.traininginsights.service;

import com.traininginsights.model.*;
import com.traininginsights.repository.NotificationRepository;
import com.traininginsights.repository.UserRepository;
import com.traininginsights.repository.GroupRepository;
import com.traininginsights.repository.ClubRepository;
import com.traininginsights.repository.PushSubscriptionRepository;
import java.time.Instant;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.ArrayList;

@Service
public class NotificationService {
    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final GroupRepository groupRepository;
    private final ClubRepository clubRepository;
    private final EmailService emailService;
    private final PushSubscriptionRepository pushRepo;
    private final PushService pushService;

    public NotificationService(NotificationRepository notificationRepository, UserRepository userRepository, GroupRepository groupRepository, ClubRepository clubRepository, EmailService emailService, PushSubscriptionRepository pushRepo, PushService pushService){
        this.notificationRepository = notificationRepository;
        this.userRepository = userRepository;
        this.groupRepository = groupRepository;
        this.clubRepository = clubRepository;
        this.emailService = emailService;
        this.pushRepo = pushRepo;
        this.pushService = pushService;
    }

    public Notification createNotificationToUser(Long senderId, Long recipientId, String title, String body){
        User s = userRepository.findById(senderId).orElseThrow();
        User r = userRepository.findById(recipientId).orElseThrow();
        Notification n = new Notification(); n.setSender(s); n.setRecipient(r); n.setTitle(title); n.setBody(body);
        Notification saved = notificationRepository.save(n);
        // attempt to send web-push to user's subscriptions
        try {
            var subs = pushRepo.findByUser(r);
            for (var sub : subs){
                try {
                    pushService.sendNotification(sub, title, body, "/dashboard/notifications");
                    saved.setDispatched(true);
                    saved.setSentAt(Instant.now());
                    notificationRepository.save(saved);
                } catch (Exception ignored) { }
            }
        } catch (Exception ignored) {}
        return saved;
    }

    // create a system notification (no sender) and attempt push
    public Notification createSystemNotificationForUser(Long recipientId, String title, String body){
        User r = userRepository.findById(recipientId).orElseThrow();
        Notification n = new Notification(); n.setRecipient(r); n.setTitle(title); n.setBody(body);
        Notification saved = notificationRepository.save(n);
        try {
            var subs = pushRepo.findByUser(r);
            for (var sub : subs){
                try {
                    pushService.sendNotification(sub, title, body, "/dashboard/notifications");
                    saved.setDispatched(true);
                    saved.setSentAt(Instant.now());
                    notificationRepository.save(saved);
                } catch (Exception ignored) { }
            }
        } catch (Exception ignored) {}
        return saved;
    }

    // convenience for training/questionnaire-context notifications
    public Notification createSystemNotificationForUser(Long recipientId, String title, String body, Long trainingId, Long questionnaireId){
        User r = userRepository.findById(recipientId).orElseThrow();
        Notification n = new Notification(); n.setRecipient(r); n.setTitle(title); n.setBody(body); n.setTrainingId(trainingId); n.setQuestionnaireId(questionnaireId);
        Notification saved = notificationRepository.save(n);
        try {
            var subs = pushRepo.findByUser(r);
            for (var sub : subs){
                try {
                    pushService.sendNotification(sub, title, body, "/dashboard/notifications");
                    saved.setDispatched(true);
                    saved.setSentAt(Instant.now());
                    notificationRepository.save(saved);
                } catch (Exception ignored) { }
            }
        } catch (Exception ignored) {}
        return saved;
    }

    public static class SendResult {
        public Long recipientId;
        public String email;
        public Long notificationId;
        public boolean dispatched;
        public String error;
        // additional context
        public Long targetId;
        public String targetType; // "club" or "group"

        public SendResult(Long recipientId, String email, Long notificationId, boolean dispatched, String error, Long targetId, String targetType){
            this.recipientId = recipientId; this.email = email; this.notificationId = notificationId; this.dispatched = dispatched; this.error = error;
            this.targetId = targetId; this.targetType = targetType;
        }
    }

    public List<SendResult> sendNotificationToClubMembers(Long senderId, Long clubId, String title, String body){
        Club c = clubRepository.findById(clubId).orElseThrow();
        List<SendResult> results = new ArrayList<>();
        // For each user in the club, persist a notification and optionally send email
        for (User u : userRepository.findAll()){
            boolean member = u.getClubs().stream().anyMatch(cl->cl.getId().equals(clubId));
            if (!member) continue;
            Notification n = new Notification(); n.setSender(userRepository.findById(senderId).orElseThrow()); n.setRecipient(u); n.setClub(c); n.setTitle(title); n.setBody(body);
            try{
                boolean anyDispatched = false;
                if (c.getSmtpHost() != null && u.getEmail() != null) {
                    boolean sent = emailService.sendSimpleMail(c, u.getEmail(), title, body);
                    if (sent){ anyDispatched = true; }
                }
                Notification saved = notificationRepository.save(n);
                // attempt web-push
                try {
                    var subs = pushRepo.findByUser(u);
                    for (var sub : subs){
                        try { pushService.sendNotification(sub, title, body, "/dashboard/notifications"); anyDispatched = true; } catch (Exception ignored) {}
                    }
                } catch (Exception ignored) {}
                if (anyDispatched){ saved.setDispatched(true); saved.setSentAt(java.time.Instant.now()); notificationRepository.save(saved); }
                results.add(new SendResult(u.getId(), u.getEmail(), saved.getId(), saved.isDispatched(), null, clubId, "club"));
            }catch(Exception ex){
                // save failure as notification with error (do not throw, continue)
                Notification saved = notificationRepository.save(n);
                results.add(new SendResult(u.getId(), u.getEmail(), saved.getId(), saved.isDispatched(), ex.getMessage(), clubId, "club"));
            }
        }
        return results;
    }

    public List<SendResult> sendNotificationToGroup(Long senderId, Long groupId, String title, String body){
        Group g = groupRepository.findById(groupId).orElseThrow();
        List<SendResult> results = new ArrayList<>();
        for (User u : g.getAthletes()){
            Notification n = new Notification(); n.setSender(userRepository.findById(senderId).orElseThrow()); n.setRecipient(u); n.setGroup(g); n.setTitle(title); n.setBody(body);
            Club smtpClub = g.getClubs().stream().filter(cl->cl.getSmtpHost()!=null).findFirst().orElse(null);
            try{
                boolean anyDispatched = false;
                if (smtpClub != null && u.getEmail() != null){
                    boolean sent = emailService.sendSimpleMail(smtpClub, u.getEmail(), title, body);
                    if (sent){ anyDispatched = true; }
                }
                Notification saved = notificationRepository.save(n);
                try {
                    var subs = pushRepo.findByUser(u);
                    for (var sub : subs){ try { pushService.sendNotification(sub, title, body, "/dashboard/notifications"); anyDispatched = true; } catch (Exception ignored){} }
                } catch (Exception ignored) {}
                if (anyDispatched){ saved.setDispatched(true); saved.setSentAt(java.time.Instant.now()); notificationRepository.save(saved); }
                results.add(new SendResult(u.getId(), u.getEmail(), saved.getId(), saved.isDispatched(), null, groupId, "group"));
            }catch(Exception ex){
                Notification saved = notificationRepository.save(n);
                results.add(new SendResult(u.getId(), u.getEmail(), saved.getId(), saved.isDispatched(), ex.getMessage(), groupId, "group"));
            }
        }
        return results;
    }

    // Dispatch stored notifications (optional): send emails for notifications linked to a club if SMTP is configured
    public void dispatchStoredNotifications(){
        List<Notification> all = notificationRepository.findAll();
        for (Notification n : all){
            if (n.isDispatched()) continue; // already sent
            if (n.getClub() != null && n.getRecipient() != null && n.getRecipient().getEmail() != null){
                boolean sent = emailService.sendSimpleMail(n.getClub(), n.getRecipient().getEmail(), n.getTitle(), n.getBody());
                if (sent){ n.setDispatched(true); n.setSentAt(java.time.Instant.now()); notificationRepository.save(n); }
            }
        }
    }

    public List<Notification> getForRecipient(User u){
        return notificationRepository.findByRecipient(u);
    }

    public void markRead(Long notificationId, boolean read){
        Notification n = notificationRepository.findById(notificationId).orElseThrow();
        n.setRead(read);
        notificationRepository.save(n);
    }

    public long unreadCount(User u){
        return notificationRepository.countByRecipientAndIsReadFalse(u);
    }
}
