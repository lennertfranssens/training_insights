package com.traininginsights.controller;

import com.traininginsights.model.User;
import com.traininginsights.service.NotificationService;
import com.traininginsights.repository.UserRepository;
import com.traininginsights.repository.GroupRepository;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.MediaType;
import org.springframework.web.multipart.MultipartFile;
import com.traininginsights.repository.AttachmentRepository;
import com.traininginsights.model.Attachment;
import java.nio.file.*;
import java.util.UUID;
import com.traininginsights.repository.NotificationRepository;

import java.util.List;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {
    private final NotificationService notificationService;
    private final UserRepository userRepository;
    private final GroupRepository groupRepository;
    private final AttachmentRepository attachmentRepository;
    private final NotificationRepository notificationRepository;
    @org.springframework.beans.factory.annotation.Value("${app.uploadsDir:uploads}")
    private String uploadsDir;

    public NotificationController(NotificationService notificationService, UserRepository userRepository, GroupRepository groupRepository, AttachmentRepository attachmentRepository, NotificationRepository notificationRepository){
        this.notificationService = notificationService; this.userRepository = userRepository; this.groupRepository = groupRepository; this.attachmentRepository = attachmentRepository; this.notificationRepository = notificationRepository;
    }

    @GetMapping
    public List<NotificationDTO> myNotifications(){
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        User u = userRepository.findByEmailIgnoreCase(email).orElseThrow();
        List<com.traininginsights.model.Notification> list = notificationService.getForRecipient(u);
        List<NotificationDTO> out = new java.util.ArrayList<>();
        for (com.traininginsights.model.Notification n : list){
            NotificationDTO d = new NotificationDTO();
            d.id = n.getId();
            d.senderId = n.getSender() != null ? n.getSender().getId() : null;
            d.title = n.getTitle();
            d.body = n.getBody();
            d.createdAt = n.getCreatedAt();
            d.isRead = n.isRead();
            d.trainingId = n.getTrainingId();
            d.questionnaireId = n.getQuestionnaireId();
            if (n.getClub() != null){ d.targetType = "club"; d.targetId = n.getClub().getId(); d.targetLabel = "Club: " + n.getClub().getName(); }
            else if (n.getGroup() != null){ d.targetType = "group"; d.targetId = n.getGroup().getId(); d.targetLabel = "Group: " + n.getGroup().getName(); }
            else if (n.getRecipient() != null){ d.targetType = "user"; d.targetId = n.getRecipient().getId(); d.targetLabel = "User: " + n.getRecipient().getFirstName() + " " + n.getRecipient().getLastName(); }
            // populate attachments metadata
            List<Attachment> atts = attachmentRepository.findByNotification(n);
            if (atts != null && !atts.isEmpty()) {
                d.attachments = new java.util.ArrayList<>();
                for (Attachment a : atts){
                    AttachmentMeta m = new AttachmentMeta();
                    m.id = a.getId();
                    m.filename = a.getFilename();
                    d.attachments.add(m);
                }
            }
            out.add(d);
        }
        return out;
    }

    public static class NotificationDTO {
        public Long id;
        public Long senderId;
        public String title;
        public String body;
        public java.time.Instant createdAt;
        public boolean isRead;
        public String targetType; // club | group | user
        public Long targetId;
        public String targetLabel; // human readable label for recipient
        public Long trainingId;
        public Long questionnaireId;
        public java.util.List<AttachmentMeta> attachments; // attachment metadata list
    }

    public static class AttachmentMeta { public Long id; public String filename; }

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

    // Admins and trainers can send to members of a club (trainers limited to clubs they belong to)
    @PreAuthorize("hasAnyRole('ADMIN','SUPERADMIN','TRAINER')")
    @PostMapping("/club/{clubId}/send")
    public List<com.traininginsights.service.NotificationService.SendResult> sendToClub(@PathVariable Long clubId, @RequestBody SendRequest req){
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        User caller = userRepository.findByEmailIgnoreCase(email).orElseThrow();
        // if not superadmin, ensure caller belongs to the club
        boolean isSuper = caller.getRoles().stream().anyMatch(r->r.getName().name().equals("ROLE_SUPERADMIN"));
        boolean belongs = caller.getClubs().stream().anyMatch(c->c.getId().equals(clubId));
    if (!isSuper && !belongs) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Cannot send to clubs you do not belong to");
    return notificationService.sendNotificationToClubMembers(caller.getId(), clubId, req.title, req.body, req.channel);
    }

    // Athletes/trainer can send to group
    @PreAuthorize("hasAnyRole('ATHLETE','TRAINER')")
    @PostMapping("/group/{groupId}/send")
    public List<com.traininginsights.service.NotificationService.SendResult> sendToGroup(@PathVariable Long groupId, @RequestBody SendRequest req){
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        User caller = userRepository.findByEmailIgnoreCase(email).orElseThrow();
        boolean isTrainer = caller.getRoles().stream().anyMatch(r->r.getName().name().equals("ROLE_TRAINER"));
        boolean isAthlete = caller.getRoles().stream().anyMatch(r->r.getName().name().equals("ROLE_ATHLETE"));
        com.traininginsights.model.Group g = groupRepository.findById(groupId).orElseThrow();
        boolean allowed = false;
        if (isTrainer) { allowed = g.getTrainers().stream().anyMatch(u->u.getId().equals(caller.getId())); }
        if (isAthlete) { allowed = allowed || g.getAthletes().stream().anyMatch(u->u.getId().equals(caller.getId())); }
        if (!allowed) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Cannot send to groups you are not a member/trainer of");
        return notificationService.sendNotificationToGroup(caller.getId(), groupId, req.title, req.body, req.channel);
    }

    public static class SendRequest { public String title; public String body; public String channel; /* notification | email | both */ }

    @org.springframework.beans.factory.annotation.Value("${app.attachments.maxMb:25}")
    private int maxAttachmentMb;
    private long maxFileBytes(){ return (long)maxAttachmentMb * 1024L * 1024L; }

    private Attachment storeNotificationFile(Long notificationId, MultipartFile file) throws Exception {
        String original = file.getOriginalFilename() != null ? Paths.get(file.getOriginalFilename()).getFileName().toString() : "file";
    if (file.getSize() > maxFileBytes()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "File too large (max " + maxAttachmentMb + "MB): " + original);
        String ext = ""; int idx = original.lastIndexOf('.'); if (idx >= 0) ext = original.substring(idx);
        String storedName = UUID.randomUUID().toString() + ext;
        Path base = Paths.get(uploadsDir).toAbsolutePath().normalize();
        Path dir = base.resolve("notifications").resolve(String.valueOf(notificationId)).normalize();
        Files.createDirectories(dir);
        Path dst = dir.resolve(storedName).normalize();
        if (!dst.startsWith(base)) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid file path");
        file.transferTo(dst.toFile());
        Attachment a = new Attachment();
        a.setFilename(original); a.setContentType(file.getContentType()); a.setPath(dst.toString());
        com.traininginsights.model.Notification notif = notificationRepository.findById(notificationId).orElseThrow();
        a.setNotification(notif);
        return attachmentRepository.save(a);
    }

    // Multipart variants for sending with attachments. For clubs/groups we replicate logic: first create notifications, then assign attachments to each, then proceed.
    @PreAuthorize("hasAnyRole('ADMIN','SUPERADMIN','TRAINER')")
    @PostMapping(path="/club/{clubId}/send", consumes = { MediaType.MULTIPART_FORM_DATA_VALUE })
    public List<com.traininginsights.service.NotificationService.SendResult> sendToClubMultipart(@PathVariable Long clubId, @RequestPart("title") String title, @RequestPart("body") String body, @RequestPart(value="channel", required=false) String channel, @RequestPart(value="files", required=false) MultipartFile[] files){
        // Reuse existing logic without attachments, then attach to each notification ID returned
    SendRequest req = new SendRequest(); req.title = title; req.body = body; req.channel = channel;
    var results = sendToClub(clubId, req);
        if (files != null && files.length > 0){
            long total = 0L; final long MAX_TOTAL = maxFileBytes(); // combined cap equals per-file cap config
            for (MultipartFile f : files){ if (f!=null) total += f.getSize(); }
            if (total > MAX_TOTAL) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Total attachment size exceeds " + maxAttachmentMb + "MB cap");
            for (var r : results){
                for (MultipartFile f : files){ if (f == null || f.isEmpty()) continue; try { storeNotificationFile(r.notificationId, f); } catch (Exception ex){ /* ignore per recipient */ } }
            }
            // After storing attachments, trigger optional email resend with attachments? For simplicity, attachments included only in initial email; since we already sent, future enhancement could handle.
        }
        return results;
    }

    @PreAuthorize("hasAnyRole('ATHLETE','TRAINER')")
    @PostMapping(path="/group/{groupId}/send", consumes = { MediaType.MULTIPART_FORM_DATA_VALUE })
    public List<com.traininginsights.service.NotificationService.SendResult> sendToGroupMultipart(@PathVariable Long groupId, @RequestPart("title") String title, @RequestPart("body") String body, @RequestPart(value="channel", required=false) String channel, @RequestPart(value="files", required=false) MultipartFile[] files){
    SendRequest req = new SendRequest(); req.title = title; req.body = body; req.channel = channel;
    var results = sendToGroup(groupId, req);
        if (files != null && files.length > 0){
            long total = 0L; final long MAX_TOTAL = maxFileBytes();
            for (MultipartFile f : files){ if (f!=null) total += f.getSize(); }
            if (total > MAX_TOTAL) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Total attachment size exceeds " + maxAttachmentMb + "MB cap");
            for (var r : results){
                for (MultipartFile f : files){ if (f == null || f.isEmpty()) continue; try { storeNotificationFile(r.notificationId, f); } catch (Exception ex){ } }
            }
        }
        return results;
    }

    // List and download attachments
    @GetMapping("/{id}/attachments")
    public List<java.util.Map<String,Object>> listNotificationAttachments(@PathVariable Long id){
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        User caller = userRepository.findByEmailIgnoreCase(email).orElseThrow();
        com.traininginsights.model.Notification notif = notificationRepository.findById(id).orElseThrow();
        boolean isAdmin = caller.getRoles().stream().anyMatch(r-> r.getName().name().equals("ROLE_ADMIN") || r.getName().name().equals("ROLE_SUPERADMIN"));
        boolean allowed = isAdmin || (notif.getRecipient()!=null && notif.getRecipient().getId().equals(caller.getId())) || (notif.getSender()!=null && notif.getSender().getId().equals(caller.getId()));
        if (!allowed) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not authorized to view attachments for this notification");
        List<Attachment> list = attachmentRepository.findByNotification(notif);
        List<java.util.Map<String,Object>> out = new java.util.ArrayList<>();
        for (Attachment a : list){ out.add(java.util.Map.of("id", a.getId(), "filename", a.getFilename())); }
        return out;
    }

    @GetMapping("/attachments/{attachmentId}")
    public org.springframework.http.ResponseEntity<org.springframework.core.io.InputStreamResource> downloadNotificationAttachment(@PathVariable Long attachmentId, org.springframework.security.core.Authentication auth) throws java.io.IOException {
        Attachment a = attachmentRepository.findById(attachmentId).orElseThrow();
        var notif = a.getNotification();
        if (notif == null) return org.springframework.http.ResponseEntity.notFound().build();
        String email = auth.getName();
        User caller = userRepository.findByEmailIgnoreCase(email).orElseThrow();
        boolean isAdmin = caller.getRoles().stream().anyMatch(r-> r.getName().name().equals("ROLE_ADMIN") || r.getName().name().equals("ROLE_SUPERADMIN"));
        boolean allowed = isAdmin || (notif.getRecipient()!=null && notif.getRecipient().getId().equals(caller.getId())) || (notif.getSender()!=null && notif.getSender().getId().equals(caller.getId()));
        if (!allowed) return org.springframework.http.ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        Path base = Paths.get(uploadsDir).toAbsolutePath().normalize();
        Path filePath = Paths.get(a.getPath()).toAbsolutePath().normalize();
        if (!filePath.startsWith(base) || !Files.exists(filePath)) return org.springframework.http.ResponseEntity.notFound().build();
        var in = Files.newInputStream(filePath);
        return org.springframework.http.ResponseEntity.ok()
                .header("Content-Disposition", "attachment; filename=\"" + a.getFilename().replace("\"", "") + "\"")
                .contentType(org.springframework.http.MediaType.APPLICATION_OCTET_STREAM)
                .body(new org.springframework.core.io.InputStreamResource(in));
    }

    public static class BatchSendRequest { public Long[] ids; public String title; public String body; public String channel; }

    // Admins and trainers: batch send to multiple clubs (trainers limited to clubs they belong to)
    @PreAuthorize("hasAnyRole('ADMIN','SUPERADMIN','TRAINER')")
    @PostMapping("/batch/club/send")
    public List<com.traininginsights.service.NotificationService.SendResult> batchSendToClubs(@RequestBody BatchSendRequest req){
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        User caller = userRepository.findByEmailIgnoreCase(email).orElseThrow();
        boolean isSuper = caller.getRoles().stream().anyMatch(r->r.getName().name().equals("ROLE_SUPERADMIN"));
        List<com.traininginsights.service.NotificationService.SendResult> aggregated = new java.util.ArrayList<>();
        for (Long cid : req.ids){
            boolean belongs = caller.getClubs().stream().anyMatch(c->c.getId().equals(cid));
            if (!isSuper && !belongs) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Cannot send to clubs you do not belong to");
            aggregated.addAll(notificationService.sendNotificationToClubMembers(caller.getId(), cid, req.title, req.body, req.channel));
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
            if (!allowed) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Cannot send to groups you are not a member/trainer of");
            aggregated.addAll(notificationService.sendNotificationToGroup(caller.getId(), gid, req.title, req.body, req.channel));
        }
        return aggregated;
    }
}
