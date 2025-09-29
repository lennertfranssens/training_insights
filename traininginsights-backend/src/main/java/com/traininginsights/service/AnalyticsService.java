package com.traininginsights.service;

import com.traininginsights.model.Group;
import com.traininginsights.model.Training;
import com.traininginsights.repository.GroupRepository;
import com.traininginsights.repository.TrainingRepository;
import org.springframework.stereotype.Service;

import java.time.*;
import java.util.List;

@Service
public class AnalyticsService {
    private final TrainingRepository trainingRepository;
    private final GroupRepository groupRepository;
    private final QuestionnaireResponseService responseService;

    public AnalyticsService(TrainingRepository trainingRepository, GroupRepository groupRepository, QuestionnaireResponseService responseService) {
        this.trainingRepository = trainingRepository;
        this.groupRepository = groupRepository;
        this.responseService = responseService;
    }

    /**
     * Placeholder: compute average of numeric field "soreness" across post-training questionnaire responses
     * for trainings in the given ISO week.
     */
    public double getGroupSorenessAverage(Long groupId, int year, int isoWeek) {
        Group g = groupRepository.findById(groupId).orElseThrow();
        // determine week range in Instant
        LocalDate firstDay = LocalDate.now().withYear(year).with(java.time.temporal.WeekFields.ISO.weekOfYear(), isoWeek)
                .with(java.time.temporal.WeekFields.ISO.dayOfWeek(), 1);
        LocalDate lastDay = firstDay.plusDays(6);
        Instant from = firstDay.atStartOfDay(ZoneOffset.UTC).toInstant();
        Instant to = lastDay.plusDays(1).atStartOfDay(ZoneOffset.UTC).toInstant();

        // naive: iterate trainings and collect responses
        double sum = 0; int cnt = 0;
        for (Training t : trainingRepository.findAll()) {
            if (!t.getGroups().contains(g)) continue;
            if (t.getTrainingTime() == null || t.getTrainingTime().isBefore(from) || t.getTrainingTime().isAfter(to)) continue;
            if (t.getPostQuestionnaire() == null) continue;
            var responses = responseService.byTraining(t);
            double avg = responseService.extractNumericFieldAverage(responses, "soreness");
            if (avg > 0) { sum += avg; cnt++; }
        }
        return cnt==0 ? 0.0 : sum/cnt;
    }
}
