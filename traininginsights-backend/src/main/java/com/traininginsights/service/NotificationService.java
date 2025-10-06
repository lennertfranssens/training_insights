package com.traininginsights.service;

import com.traininginsights.model.*;
import com.traininginsights.repository.NotificationRepository;
import com.traininginsights.repository.UserRepository;
import com.traininginsights.repository.GroupRepository;
import com.traininginsights.repository.ClubRepository;
import com.traininginsights.repository.PushSubscriptionRepository;
import java.time.Instant;
import org.springframework.stereotype.Service;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.List;
import java.util.ArrayList;

@Service
public class NotificationService {
    private static final Logger log = LoggerFactory.getLogger(NotificationService.class);
    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final GroupRepository groupRepository;
    private final ClubRepository clubRepository;
    private final EmailService emailService;
    private final PushSubscriptionRepository pushRepo;
    private final PushService pushService;
    private final com.traininginsights.repository.AttachmentRepository attachmentRepository;
    @org.springframework.beans.factory.annotation.Value("${app.attachments.maxMb:25}")
    private int maxAttachmentMb;
    private long maxBytes(){ return (long)maxAttachmentMb * 1024L * 1024L; }

    public NotificationService(NotificationRepository notificationRepository, UserRepository userRepository, GroupRepository groupRepository, ClubRepository clubRepository, EmailService emailService, PushSubscriptionRepository pushRepo, PushService pushService, com.traininginsights.repository.AttachmentRepository attachmentRepository){
        this.notificationRepository = notificationRepository;
        this.userRepository = userRepository;
        this.groupRepository = groupRepository;
        this.clubRepository = clubRepository;
        this.emailService = emailService;
        this.pushRepo = pushRepo;
        this.pushService = pushService;
        this.attachmentRepository = attachmentRepository;
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
        public boolean emailAttempted; // whether this recipient was part of an email batch attempt
        public boolean emailSent; // set true if batch email send succeeded

        public SendResult(Long recipientId, String email, Long notificationId, boolean dispatched, String error, Long targetId, String targetType){
            this.recipientId = recipientId; this.email = email; this.notificationId = notificationId; this.dispatched = dispatched; this.error = error;
            this.targetId = targetId; this.targetType = targetType;
        }
    }

    public List<SendResult> sendNotificationToClubMembers(Long senderId, Long clubId, String title, String body, String channel){
        String mode = (channel == null || channel.isBlank()) ? "notification" : channel.toLowerCase();
        Club c = clubRepository.findById(clubId).orElseThrow();
        User sender = userRepository.findById(senderId).orElseThrow();
        List<SendResult> results = new ArrayList<>();
    // Collect emails for potential BCC batch send if mode includes email
        List<String> bccEmails = new ArrayList<>();
        // For each user in the club, persist a notification and optionally send email
        for (User u : userRepository.findAll()){
            boolean member = u.getClubs().stream().anyMatch(cl->cl.getId().equals(clubId));
            if (!member) continue;
            Notification n = new Notification(); n.setSender(sender); n.setRecipient(u); n.setClub(c); n.setTitle(title); n.setBody(body);
            try{
                boolean anyDispatched = false;
                boolean wantsEmail = mode.equals("email") || mode.equals("both");
                boolean wantsNotification = mode.equals("notification") || mode.equals("both");
                boolean emailEligible = wantsEmail && c.getSmtpHost() != null && u.getEmail() != null;
                if (emailEligible) { bccEmails.add(u.getEmail()); }
                Notification saved = notificationRepository.save(n);
                if (wantsNotification){
                    // attempt web-push for notification mode
                    try {
                        var subs = pushRepo.findByUser(u);
                        for (var sub : subs){
                            try { pushService.sendNotification(sub, title, body, "/dashboard/notifications"); anyDispatched = true; } catch (Exception ignored) {}
                        }
                    } catch (Exception ignored) {}
                }
                if (anyDispatched){ saved.setDispatched(true); saved.setSentAt(java.time.Instant.now()); notificationRepository.save(saved); }
                SendResult sr = new SendResult(u.getId(), u.getEmail(), saved.getId(), saved.isDispatched(), null, clubId, "club");
                sr.emailAttempted = emailEligible; // mark intent, will set emailSent after batch
                results.add(sr);
            }catch(Exception ex){
                // save failure as notification with error (do not throw, continue)
                Notification saved = notificationRepository.save(n);
                SendResult sr = new SendResult(u.getId(), u.getEmail(), saved.getId(), saved.isDispatched(), ex.getMessage(), clubId, "club");
                results.add(sr);
                log.warn("Failed creating notification for club recipient {}: {}", u.getId(), ex.getMessage());
            }
        }
        // Perform single BCC send if emails collected
        if (!bccEmails.isEmpty()) {
            try {
                // Gather attachments (same for all notifications created in this batch: choose those attached to first notification)
                List<java.io.File> attachFiles = new ArrayList<>();
                var first = results.stream().findFirst();
                if (first.isPresent()) {
                    Notification firstNotif = notificationRepository.findById(first.get().notificationId).orElse(null);
                    if (firstNotif != null) {
                        var atts = attachmentRepository.findByNotification(firstNotif);
                        long total = 0L;
                        final long MAX_TOTAL = maxBytes(); // configurable total cap
                        final long MAX_SINGLE = maxBytes(); // configurable per-file cap
                        for (var a : atts){
                            if (a.getPath()==null) continue;
                            java.io.File f = new java.io.File(a.getPath());
                            if (!f.exists()) continue;
                            long len = f.length();
                            if (len > MAX_SINGLE) { log.warn("Skipping attachment {} (>{}MB)", a.getId(), maxAttachmentMb); continue; }
                            if (total + len > MAX_TOTAL) { log.warn("Skipping attachment {} due to total cap {}MB", a.getId(), maxAttachmentMb); continue; }
                            attachFiles.add(f); total += len;
                        }
                    }
                }
                boolean sent;
                if (attachFiles.isEmpty()) {
                    sent = emailService.sendBccMail(c, bccEmails, title, body);
                } else {
                    sent = emailService.sendBccMailWithAttachments(c, bccEmails, title, body, attachFiles);
                }
                if (sent){ for (SendResult r : results){ if (r.emailAttempted) r.emailSent = true; } }
            } catch (Exception ex){ log.warn("Club batch email send failed: {}", ex.getMessage()); }
            // Sender summary email (only if sender has an email and club SMTP configured)
            if (sender.getEmail() != null && c.getSmtpHost() != null){
                try {
                    String summary = buildSummaryBody(title, body, results, bccEmails, "Club: " + c.getName(), mode);
                    emailService.sendSimpleMail(c, sender.getEmail(), "Summary: notification email to club " + c.getName(), summary);
                } catch (Exception ex) { log.warn("Failed sending summary email to sender {}: {}", sender.getId(), ex.getMessage()); }
            }
        } else if (mode.contains("email")) {
            log.info("Notification send requested with email channel for club {} but no eligible email recipients (SMTP host present? {} )", clubId, c.getSmtpHost()!=null);
        }
        return results;
    }

    public List<SendResult> sendNotificationToGroup(Long senderId, Long groupId, String title, String body, String channel){
        String mode = (channel == null || channel.isBlank()) ? "notification" : channel.toLowerCase();
        Group g = groupRepository.findById(groupId).orElseThrow();
        User sender = userRepository.findById(senderId).orElseThrow();
        List<SendResult> results = new ArrayList<>();
    List<String> bccEmails = new ArrayList<>();
        for (User u : g.getAthletes()){
            Notification n = new Notification(); n.setSender(sender); n.setRecipient(u); n.setGroup(g); n.setTitle(title); n.setBody(body);
            Club smtpClub = g.getClubs().stream().filter(cl->cl.getSmtpHost()!=null).findFirst().orElse(null);
            try{
                boolean anyDispatched = false;
                boolean wantsEmail = mode.equals("email") || mode.equals("both");
                boolean wantsNotification = mode.equals("notification") || mode.equals("both");
                boolean emailEligible = wantsEmail && smtpClub != null && u.getEmail() != null;
                if (emailEligible){ bccEmails.add(u.getEmail()); }
                Notification saved = notificationRepository.save(n);
                if (wantsNotification){
                    try {
                        var subs = pushRepo.findByUser(u);
                        for (var sub : subs){ try { pushService.sendNotification(sub, title, body, "/dashboard/notifications"); anyDispatched = true; } catch (Exception ignored){} }
                    } catch (Exception ignored) {}
                }
                if (anyDispatched){ saved.setDispatched(true); saved.setSentAt(java.time.Instant.now()); notificationRepository.save(saved); }
                SendResult sr = new SendResult(u.getId(), u.getEmail(), saved.getId(), saved.isDispatched(), null, groupId, "group");
                sr.emailAttempted = emailEligible;
                results.add(sr);
            }catch(Exception ex){
                Notification saved = notificationRepository.save(n);
                SendResult sr = new SendResult(u.getId(), u.getEmail(), saved.getId(), saved.isDispatched(), ex.getMessage(), groupId, "group");
                results.add(sr);
                log.warn("Failed creating notification for group recipient {}: {}", u.getId(), ex.getMessage());
            }
        }
        if (!bccEmails.isEmpty()) {
            try {
                Club smtpClub = g.getClubs().stream().filter(cl->cl.getSmtpHost()!=null).findFirst().orElse(null);
                List<java.io.File> attachFiles = new ArrayList<>();
                var first = results.stream().findFirst();
                if (first.isPresent()) {
                    Notification firstNotif = notificationRepository.findById(first.get().notificationId).orElse(null);
                    if (firstNotif != null) {
                        var atts = attachmentRepository.findByNotification(firstNotif);
                        long total = 0L;
                        final long MAX_TOTAL = maxBytes();
                        final long MAX_SINGLE = maxBytes();
                        for (var a : atts){
                            if (a.getPath()==null) continue;
                            java.io.File f = new java.io.File(a.getPath());
                            if (!f.exists()) continue;
                            long len = f.length();
                            if (len > MAX_SINGLE) { log.warn("Skipping attachment {} (>{}MB)", a.getId(), maxAttachmentMb); continue; }
                            if (total + len > MAX_TOTAL) { log.warn("Skipping attachment {} due to total cap {}MB", a.getId(), maxAttachmentMb); continue; }
                            attachFiles.add(f); total += len;
                        }
                    }
                }
                boolean sent;
                if (attachFiles.isEmpty()) {
                    sent = emailService.sendBccMail(smtpClub, bccEmails, title, body);
                } else {
                    sent = emailService.sendBccMailWithAttachments(smtpClub, bccEmails, title, body, attachFiles);
                }
                if (sent){ for (SendResult r : results){ if (r.emailAttempted) r.emailSent = true; } }
            } catch(Exception ex){ log.warn("Group batch email send failed: {}", ex.getMessage()); }
            Club smtpClub = g.getClubs().stream().filter(cl->cl.getSmtpHost()!=null).findFirst().orElse(null);
            if (smtpClub != null && sender.getEmail() != null){
                try {
                    String summary = buildSummaryBody(title, body, results, bccEmails, "Group: " + g.getName(), mode);
                    emailService.sendSimpleMail(smtpClub, sender.getEmail(), "Summary: notification email to group " + g.getName(), summary);
                } catch (Exception ex){ log.warn("Failed sending summary email to sender {}: {}", sender.getId(), ex.getMessage()); }
            }
        } else if (mode.contains("email")) {
            log.info("Notification send requested with email channel for group {} but no eligible email recipients (group SMTP club present?).", groupId);
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

    // Build a textual summary for sender
    private String buildSummaryBody(String title, String body, List<SendResult> results, List<String> bccEmails, String scopeLabel, String mode){
        StringBuilder sb = new StringBuilder();
        sb.append(scopeLabel).append("\n");
        sb.append("Channel: ").append(mode).append("\n");
        sb.append("Title: ").append(title).append("\n");
        String bodySnippet = body == null ? "" : (body.length() > 300 ? body.substring(0,300) + "..." : body);
        sb.append("Body (truncated 300 chars): \n").append(bodySnippet).append("\n\n");
        long pushCount = results.stream().filter(r->r.dispatched).count();
        sb.append("Total recipients: ").append(results.size()).append("\n");
        sb.append("Email recipients: ").append(bccEmails.size()).append("\n");
        sb.append("Push dispatched (at least one subscription succeeded): ").append(pushCount).append("\n\n");
        sb.append("Email recipient list:\n");
        java.util.LinkedHashSet<String> uniq = new java.util.LinkedHashSet<>(bccEmails);
        int limit = 500; // safety
        int i = 0;
        for (String e : uniq){
            if (i >= limit){ sb.append("... (truncated)\n"); break; }
            sb.append(" - ").append(e).append("\n");
            i++;
        }
        return sb.toString();
    }
}
