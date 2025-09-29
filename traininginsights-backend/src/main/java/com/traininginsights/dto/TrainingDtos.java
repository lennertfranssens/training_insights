package com.traininginsights.dto;

import java.time.Instant;
import java.util.Set;

public class TrainingDtos {
    public static class TrainingDTO {
        public Long id;
        public String title;
        public String description;
        public Instant trainingTime;
        public boolean visibleToAthletes;
        public Set<Long> groupIds;
        public Long preQuestionnaireId;
        public Long postQuestionnaireId;
    }

    public static class AssignGroupsRequest {
        public Set<Long> groupIds;
    }
}
