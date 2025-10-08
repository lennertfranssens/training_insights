package com.traininginsights.dto;

import java.time.Instant;
import java.util.Set;

public class TrainingDtos {
    public static class TrainingDTO {
        public Long id;
        public String title;
        public String description;
        public Instant trainingTime;
    public Instant trainingEndTime;
        public boolean visibleToAthletes;
        public Set<Long> groupIds;
        // Lightweight group objects (id + name) to support existing frontend expectations
        public Set<GroupLite> groups;
        public Long preQuestionnaireId;
        public Long postQuestionnaireId;
    public Integer preNotificationMinutes; // minutes before start to send pre notification
        // Recurrence summary
        public Long seriesId;
        public Integer seriesSequence;
        public boolean detached;
        public boolean groupDetached;
        public RecurrenceSummary recurrenceSummary;
        public Long createdById; // optional: trainer/admin who created the training
        // Recurrence base (only populated for first occurrence of a series to allow editing)
        public RecurrenceCreateRequest recurrence;
        // Athlete-specific presence (null if not recorded or not an athlete request)
        public Boolean myPresence;
    }

    // Minimal group projection
    public static class GroupLite {
        public Long id;
        public String name;
    }

    public static class AssignGroupsRequest {
        public Set<Long> groupIds;
    }

    // Recurrence create request
    public static class RecurrenceCreateRequest {
        public String rrule; // e.g. FREQ=WEEKLY;INTERVAL=2;BYDAY=MO,WE
        public String timezone; // optional
        public Instant until; // optional if count provided
        public Integer count; // optional if until provided
    }

    public static class TrainingCreateRequest {
        public String title;
        public String description;
        public Instant trainingTime;
        public Instant trainingEndTime;
        public boolean visibleToAthletes = true;
        public Set<Long> groupIds;
        public Long preQuestionnaireId;
        public Long postQuestionnaireId;
        public Integer preNotificationMinutes;
        public RecurrenceCreateRequest recurrence;
    }

    public static class TrainingUpdateRequest extends TrainingCreateRequest {
        public String scope; // THIS or FUTURE (optional)
    }

    public static class ResyncGroupsRequest {
        public Set<Long> groupIds; // groups to apply across series
    }

    public static class UpgradeToSeriesRequest {
        public RecurrenceCreateRequest recurrence; // required
    }

    public static class ReattachOccurrenceRequest {
        public boolean resetFieldsToSeries; // if true, reset title/description/times to match first occurrence template
    }

    public static class RecurrenceSummary {
        public String rrule;
        public Integer totalOccurrences;
        public Integer remainingOccurrences;
        public boolean hasFuture;
        public String description; // human-readable summary
    }
}
