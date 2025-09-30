package com.traininginsights.dto;

import java.time.Instant;
import java.util.List;

public class BackupDtos {
    public static class ExportPackage {
        public List<RoleExport> roles;
        public List<ClubExport> clubs;
        public List<GroupExport> groups;
        public List<SeasonExport> seasons;
        public List<UserExport> users;
        public List<MembershipExport> memberships;
        public List<NotificationExport> notifications;
        public List<QuestionnaireExport> questionnaires;
        public List<TrainingExport> trainings;
        public List<QuestionnaireResponseExport> questionnaireResponses;
    }

    public static class RoleExport { public Long id; public String name; }

    public static class ClubExport { public Long id; public String name; public String smtpHost; public Integer smtpPort; public String smtpUsername; public String smtpPassword; public String smtpFrom; public Boolean smtpUseTls; }

    public static class GroupExport { public Long id; public String name; public Long[] clubIds; public Long[] trainerIds; public Long[] athleteIds; }

    public static class SeasonExport { public Long id; public String name; public String startDate; public String endDate; public boolean active; }

    public static class UserExport { public Long id; public String firstName; public String lastName; public String email; public String passwordHash; public String[] roles; public Long[] clubIds; public Long groupId; public Boolean active; public Boolean activeOverride; }

    public static class MembershipExport { public Long id; public Long userId; public Long clubId; public Long seasonId; public String startDate; public String endDate; public String status; public boolean notified7Days; public boolean notified1Day; }

    public static class NotificationExport { public Long id; public Long senderId; public Long recipientId; public Long clubId; public Long groupId; public String title; public String body; public Instant createdAt; public boolean isRead; public boolean dispatched; public Instant sentAt; }

    public static class QuestionnaireExport { public Long id; public String title; public String structure; public boolean daily; public Long creatorId; }

    public static class TrainingExport { public Long id; public String title; public String description; public Instant trainingTime; public Instant trainingEndTime; public boolean visibleToAthletes; public Long[] groupIds; public Long preQuestionnaireId; public Long postQuestionnaireId; public Integer preNotificationMinutes; public Instant notificationTime; }

    public static class QuestionnaireResponseExport { public Long id; public Long userId; public Long trainingId; public Long questionnaireId; public Instant submittedAt; public String responses; }
}
