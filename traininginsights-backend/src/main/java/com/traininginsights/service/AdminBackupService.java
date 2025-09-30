package com.traininginsights.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.traininginsights.dto.BackupDtos;
import com.traininginsights.model.*;
import com.traininginsights.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.util.*;

@Service
public class AdminBackupService {
    private final RoleRepository roleRepository;
    private final ClubRepository clubRepository;
    private final GroupRepository groupRepository;
    private final SeasonRepository seasonRepository;
    private final UserRepository userRepository;
    private final MembershipRepository membershipRepository;
    private final NotificationRepository notificationRepository;
    private final QuestionnaireRepository questionnaireRepository;
    private final TrainingRepository trainingRepository;
    private final QuestionnaireResponseRepository questionnaireResponseRepository;
    private final ObjectMapper mapper = new ObjectMapper();

    public AdminBackupService(RoleRepository roleRepository, ClubRepository clubRepository, GroupRepository groupRepository, SeasonRepository seasonRepository, UserRepository userRepository, MembershipRepository membershipRepository, NotificationRepository notificationRepository, QuestionnaireRepository questionnaireRepository, TrainingRepository trainingRepository, QuestionnaireResponseRepository questionnaireResponseRepository){
        this.roleRepository = roleRepository; this.clubRepository = clubRepository; this.groupRepository = groupRepository; this.seasonRepository = seasonRepository; this.userRepository = userRepository; this.membershipRepository = membershipRepository; this.notificationRepository = notificationRepository; this.questionnaireRepository = questionnaireRepository; this.trainingRepository = trainingRepository; this.questionnaireResponseRepository = questionnaireResponseRepository;
    }

    public byte[] exportAll(){
        try{
            BackupDtos.ExportPackage pkg = new BackupDtos.ExportPackage();
            pkg.roles = new ArrayList<>();
            for (Role r : roleRepository.findAll()){ BackupDtos.RoleExport re = new BackupDtos.RoleExport(); re.id = r.getId(); re.name = r.getName().name(); pkg.roles.add(re); }

            pkg.clubs = new ArrayList<>();
            for (Club c : clubRepository.findAll()){ BackupDtos.ClubExport ce = new BackupDtos.ClubExport(); ce.id = c.getId(); ce.name = c.getName(); ce.smtpHost = c.getSmtpHost(); ce.smtpPort = c.getSmtpPort(); ce.smtpUsername = c.getSmtpUsername(); ce.smtpPassword = c.getSmtpPassword(); ce.smtpFrom = c.getSmtpFrom(); ce.smtpUseTls = c.getSmtpUseTls(); pkg.clubs.add(ce); }

            pkg.groups = new ArrayList<>();
            for (Group g : groupRepository.findAll()){ BackupDtos.GroupExport ge = new BackupDtos.GroupExport(); ge.id = g.getId(); ge.name = g.getName(); ge.clubIds = g.getClubs().stream().mapToLong(Club::getId).boxed().toArray(Long[]::new); ge.trainerIds = g.getTrainers().stream().mapToLong(User::getId).boxed().toArray(Long[]::new); ge.athleteIds = g.getAthletes().stream().mapToLong(User::getId).boxed().toArray(Long[]::new); pkg.groups.add(ge); }

            pkg.seasons = new ArrayList<>();
            for (Season s : seasonRepository.findAll()){ BackupDtos.SeasonExport se = new BackupDtos.SeasonExport(); se.id = s.getId(); se.name = s.getName(); se.startDate = s.getStartDate() != null ? s.getStartDate().toString() : null; se.endDate = s.getEndDate() != null ? s.getEndDate().toString() : null; pkg.seasons.add(se); }

            pkg.users = new ArrayList<>();
            for (User u : userRepository.findAll()){ BackupDtos.UserExport ue = new BackupDtos.UserExport(); ue.id = u.getId(); ue.firstName = u.getFirstName(); ue.lastName = u.getLastName(); ue.email = u.getEmail(); ue.passwordHash = u.getPasswordHash(); ue.roles = u.getRoles().stream().map(r->r.getName().name()).toArray(String[]::new); ue.clubIds = u.getClubs().stream().mapToLong(Club::getId).boxed().toArray(Long[]::new); ue.groupId = u.getGroupEntity() != null ? u.getGroupEntity().getId() : null; ue.active = u.isActive(); ue.activeOverride = u.getActiveOverride(); pkg.users.add(ue); }

            pkg.memberships = new ArrayList<>();
            for (Membership m : membershipRepository.findAll()){ BackupDtos.MembershipExport me = new BackupDtos.MembershipExport(); me.id = m.getId(); me.userId = m.getUser().getId(); me.clubId = m.getClub().getId(); me.seasonId = m.getSeason() != null ? m.getSeason().getId() : null; me.startDate = m.getStartDate() != null ? m.getStartDate().toString() : null; me.endDate = m.getEndDate() != null ? m.getEndDate().toString() : null; me.status = m.getStatus(); me.notified7Days = m.isNotified7Days(); me.notified1Day = m.isNotified1Day(); pkg.memberships.add(me); }

            pkg.notifications = new ArrayList<>();
            for (Notification n : notificationRepository.findAll()){ BackupDtos.NotificationExport ne = new BackupDtos.NotificationExport(); ne.id = n.getId(); ne.senderId = n.getSender()!=null? n.getSender().getId() : null; ne.recipientId = n.getRecipient()!=null? n.getRecipient().getId() : null; ne.clubId = n.getClub()!=null? n.getClub().getId() : null; ne.groupId = n.getGroup()!=null? n.getGroup().getId() : null; ne.title = n.getTitle(); ne.body = n.getBody(); ne.createdAt = n.getCreatedAt(); ne.isRead = n.isRead(); ne.dispatched = n.isDispatched(); ne.sentAt = n.getSentAt(); pkg.notifications.add(ne); }

            // Questionnaires
            pkg.questionnaires = new ArrayList<>();
            for (Questionnaire q : questionnaireRepository.findAll()){ BackupDtos.QuestionnaireExport qe = new BackupDtos.QuestionnaireExport(); qe.id = q.getId(); qe.title = q.getTitle(); qe.structure = q.getStructure(); qe.daily = q.isDaily(); qe.creatorId = q.getCreator()!=null? q.getCreator().getId() : null; pkg.questionnaires.add(qe); }

            // Trainings
            pkg.trainings = new ArrayList<>();
            for (Training t : trainingRepository.findAll()){ BackupDtos.TrainingExport te = new BackupDtos.TrainingExport(); te.id = t.getId(); te.title = t.getTitle(); te.description = t.getDescription(); te.trainingTime = t.getTrainingTime(); te.trainingEndTime = t.getTrainingEndTime(); te.visibleToAthletes = t.isVisibleToAthletes(); te.groupIds = t.getGroups().stream().mapToLong(g->g.getId()).boxed().toArray(Long[]::new); te.preQuestionnaireId = t.getPreQuestionnaire()!=null? t.getPreQuestionnaire().getId() : null; te.postQuestionnaireId = t.getPostQuestionnaire()!=null? t.getPostQuestionnaire().getId() : null; te.preNotificationMinutes = t.getPreNotificationMinutes(); te.notificationTime = t.getNotificationTime(); pkg.trainings.add(te); }

            // Questionnaire responses
            pkg.questionnaireResponses = new ArrayList<>();
            for (QuestionnaireResponse qr : questionnaireResponseRepository.findAll()){ BackupDtos.QuestionnaireResponseExport qre = new BackupDtos.QuestionnaireResponseExport(); qre.id = qr.getId(); qre.userId = qr.getUser()!=null? qr.getUser().getId() : null; qre.trainingId = qr.getTraining()!=null? qr.getTraining().getId() : null; qre.questionnaireId = qr.getQuestionnaire()!=null? qr.getQuestionnaire().getId() : null; qre.submittedAt = qr.getSubmittedAt(); qre.responses = qr.getResponses(); pkg.questionnaireResponses.add(qre); }

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            mapper.writeValue(out, pkg);
            return out.toByteArray();
        }catch(Exception e){ throw new RuntimeException(e); }
    }

    @Transactional
    public Map<String,Object> importFromBytes(byte[] data){
        try{
            BackupDtos.ExportPackage pkg = mapper.readValue(new ByteArrayInputStream(data), BackupDtos.ExportPackage.class);
            Map<String,Object> result = new HashMap<>();
            // NOTE: This is a simple import strategy: we will insert or update entities by id where possible.

            // Roles: skip (assume roles exist)

            // Clubs
            Map<Long, Club> clubMap = new HashMap<>();
            for (BackupDtos.ClubExport ce : pkg.clubs){ Club c = ce.id!=null? clubRepository.findById(ce.id).orElse(new Club()) : new Club(); c.setName(ce.name); c.setSmtpHost(ce.smtpHost); c.setSmtpPort(ce.smtpPort); c.setSmtpUsername(ce.smtpUsername); c.setSmtpPassword(ce.smtpPassword); c.setSmtpFrom(ce.smtpFrom); c.setSmtpUseTls(ce.smtpUseTls!=null?ce.smtpUseTls:false); clubRepository.save(c); clubMap.put(c.getId(), c); }

            // Seasons
            Map<Long, Season> seasonMap = new HashMap<>();
            for (BackupDtos.SeasonExport se : pkg.seasons){ Season s = se.id!=null? seasonRepository.findById(se.id).orElse(new Season()) : new Season(); s.setName(se.name); // parse dates omitted for brevity
                seasonRepository.save(s); seasonMap.put(s.getId(), s); }

            // Users
            Map<Long, User> userMap = new HashMap<>();
            for (BackupDtos.UserExport ue : pkg.users){ User u = ue.id!=null? userRepository.findById(ue.id).orElse(new User()) : new User(); u.setFirstName(ue.firstName); u.setLastName(ue.lastName); u.setEmail(ue.email); u.setPasswordHash(ue.passwordHash); u.setActive(ue.active!=null?ue.active:true); u.setActiveOverride(ue.activeOverride); userRepository.save(u); userMap.put(u.getId(), u); }

            // Groups - create or update and wire clubs, trainers and athletes
            Map<Long, Group> groupMap = new HashMap<>();
            for (BackupDtos.GroupExport ge : pkg.groups){
                Group g = ge.id!=null? groupRepository.findById(ge.id).orElse(new Group()) : new Group();
                g.setName(ge.name);

                // wire clubs
                if (ge.clubIds!=null){
                    Set<Club> cset = new HashSet<>();
                    for (Long cid : ge.clubIds){
                        if (clubMap.containsKey(cid)) cset.add(clubMap.get(cid)); else clubRepository.findById(cid).ifPresent(cset::add);
                    }
                    g.setClubs(cset);
                }

                // wire trainers
                if (ge.trainerIds!=null){
                    Set<User> tset = new HashSet<>();
                    for (Long uid : ge.trainerIds){
                        User u = userMap.get(uid);
                        if (u == null) u = userRepository.findById(uid).orElse(null);
                        if (u != null) tset.add(u);
                    }
                    g.setTrainers(tset);
                }

                // wire athletes (set their groupEntity and attach to group)
                if (ge.athleteIds!=null){
                    Set<User> aset = new HashSet<>();
                    for (Long uid : ge.athleteIds){
                        User u = userMap.get(uid);
                        if (u == null) u = userRepository.findById(uid).orElse(null);
                        if (u != null){
                            aset.add(u);
                            try { u.setGroupEntity(g); userRepository.save(u); } catch(Exception ex){}
                        }
                    }
                    g.setAthletes(aset);
                }

                groupRepository.save(g);
                groupMap.put(g.getId(), g);
            }

            // Questionnaires
            Map<Long, Questionnaire> questionnaireMap = new HashMap<>();
            for (BackupDtos.QuestionnaireExport qe : pkg.questionnaires){ Questionnaire q = qe.id!=null? questionnaireRepository.findById(qe.id).orElse(new Questionnaire()) : new Questionnaire(); q.setTitle(qe.title); q.setStructure(qe.structure); q.setDaily(qe.daily); if (qe.creatorId!=null && userMap.containsKey(qe.creatorId)) q.setCreator(userMap.get(qe.creatorId)); questionnaireRepository.save(q); questionnaireMap.put(q.getId(), q); }

            // Trainings
            Map<Long, Training> trainingMap = new HashMap<>();
            for (BackupDtos.TrainingExport te : pkg.trainings){
                try{
                    Training t = te.id!=null? trainingRepository.findById(te.id).orElse(new Training()) : new Training();
                    t.setTitle(te.title);
                    t.setDescription(te.description);
                    t.setTrainingTime(te.trainingTime);
                    t.setTrainingEndTime(te.trainingEndTime);
                    t.setVisibleToAthletes(te.visibleToAthletes);
                    t.setPreNotificationMinutes(te.preNotificationMinutes!=null?te.preNotificationMinutes:0);
                    t.setNotificationTime(te.notificationTime);

                    // wire questionnaires
                    if (te.preQuestionnaireId!=null && questionnaireMap.containsKey(te.preQuestionnaireId)) {
                        t.setPreQuestionnaire(questionnaireMap.get(te.preQuestionnaireId));
                    }
                    if (te.postQuestionnaireId!=null && questionnaireMap.containsKey(te.postQuestionnaireId)) {
                        t.setPostQuestionnaire(questionnaireMap.get(te.postQuestionnaireId));
                    }

                    // wire groups
                    if (te.groupIds!=null){
                        Set<Group> groupsSet = new HashSet<>();
                        for (Long gid : te.groupIds){
                            if (groupMap.containsKey(gid)) groupsSet.add(groupMap.get(gid)); else groupRepository.findById(gid).ifPresent(groupsSet::add);
                        }
                        t.setGroups(groupsSet);
                    }

                    trainingRepository.save(t);
                    trainingMap.put(t.getId(), t);
                }catch(Exception ex){}
            }

            // Questionnaire responses
            for (BackupDtos.QuestionnaireResponseExport qre : pkg.questionnaireResponses){ try{ QuestionnaireResponse qr = qre.id!=null? questionnaireResponseRepository.findById(qre.id).orElse(new QuestionnaireResponse()) : new QuestionnaireResponse(); if (qre.userId!=null) qr.setUser(userMap.get(qre.userId)); if (qre.trainingId!=null) qr.setTraining(trainingMap.get(qre.trainingId)); if (qre.questionnaireId!=null) qr.setQuestionnaire(questionnaireMap.get(qre.questionnaireId)); qr.setSubmittedAt(qre.submittedAt); qr.setResponses(qre.responses); questionnaireResponseRepository.save(qr); }catch(Exception ex){} }

            // Memberships
            for (BackupDtos.MembershipExport me : pkg.memberships){ try{ Membership m = me.id!=null? membershipRepository.findById(me.id).orElse(new Membership()) : new Membership(); m.setUser(userMap.get(me.userId)); m.setClub(clubMap.get(me.clubId)); if (me.seasonId!=null) m.setSeason(seasonMap.get(me.seasonId)); membershipRepository.save(m);}catch(Exception ex){} }

            // Notifications
            for (BackupDtos.NotificationExport ne : pkg.notifications){ try{ Notification n = ne.id!=null? notificationRepository.findById(ne.id).orElse(new Notification()) : new Notification(); n.setSender(ne.senderId!=null? userMap.get(ne.senderId) : null); n.setRecipient(ne.recipientId!=null? userMap.get(ne.recipientId) : null); n.setClub(ne.clubId!=null? clubMap.get(ne.clubId) : null); n.setGroup(ne.groupId!=null? groupRepository.findById(ne.groupId).orElse(null) : null); n.setTitle(ne.title); n.setBody(ne.body); n.setRead(ne.isRead); n.setDispatched(ne.dispatched); n.setSentAt(ne.sentAt); notificationRepository.save(n);}catch(Exception ex){} }

            result.put("clubs", clubMap.size()); result.put("users", userMap.size()); result.put("memberships", pkg.memberships!=null?pkg.memberships.size():0); result.put("notifications", pkg.notifications!=null?pkg.notifications.size():0);
            return result;
        }catch(Exception e){ throw new RuntimeException(e); }
    }
}
