package com.traininginsights.service;

import com.traininginsights.model.SentNotification;
import com.traininginsights.model.Training;
import com.traininginsights.repository.SentNotificationRepository;
import com.traininginsights.repository.TrainingRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

@Component
public class NotificationScheduler {
    private final TrainingRepository trainingRepo;
    private final com.traininginsights.repository.PushSubscriptionRepository pushRepo;
    private final PushService pushService;
    private final com.traininginsights.service.NotificationService notificationService;
    private final SentNotificationRepository sentRepo;
    private final QuestionnaireResponseService responseService;

    public NotificationScheduler(TrainingRepository trainingRepo,
                                 com.traininginsights.repository.PushSubscriptionRepository pushRepo,
                                 PushService pushService,
                                 SentNotificationRepository sentRepo,
                                 com.traininginsights.service.NotificationService notificationService,
                                 QuestionnaireResponseService responseService){
        this.trainingRepo = trainingRepo; this.pushRepo = pushRepo; this.pushService = pushService; this.sentRepo = sentRepo; this.notificationService = notificationService; this.responseService = responseService;
    }

    @Scheduled(cron = "0 * * * * *") // every minute at 0s
    @Transactional
    public void run() {
        Instant now = Instant.now();
        List<Training> due = trainingRepo.findAll().stream().filter(t -> t.getNotificationTime() != null && !t.getNotificationTime().isAfter(now)).toList();
        for (Training t : due) {
            // check if already sent
            var already = sentRepo.findByTrainingIdAndTypeAndSentAtAfter(t.getId(), "PRE_QUESTIONNAIRE", now.minusSeconds(3600));
            if (already != null && !already.isEmpty()) continue;
            // only if a pre-questionnaire is configured
            if (t.getPreQuestionnaire() == null) continue;
            // send to athletes in groups
            java.util.concurrent.atomic.AtomicBoolean anySent = new java.util.concurrent.atomic.AtomicBoolean(false);
            t.getGroups().forEach(g -> g.getAthletes().forEach(a -> {
                try {
                    // skip if athlete already filled PRE
                    boolean filled = false;
                    try {
                        filled = responseService.find(a, t, t.getPreQuestionnaire(), "PRE").isPresent();
                    } catch (Exception ignored) {}
                    if (filled) return;
            notificationService.createSystemNotificationForUser(a.getId(),
                "Reminder: pre-training questionnaire — " + t.getTitle(),
                "Please complete the pre-training questionnaire for: " + t.getTitle(),
                t.getId(),
                t.getPreQuestionnaire() != null ? t.getPreQuestionnaire().getId() : null);
                    anySent.set(true);
                } catch (Exception e){
                    // fallback: directly send push
                    try {
                        pushRepo.findByUser(a).forEach(s -> { try { pushService.sendNotification(s, "Reminder: pre-training questionnaire — " + t.getTitle()); anySent.set(true);} catch (Exception ignored){} });
                    } catch (Exception ignored) {}
                }
            }));
            if (anySent.get()){
                SentNotification sn = new SentNotification(); sn.setTrainingId(t.getId()); sn.setType("PRE_QUESTIONNAIRE"); sn.setSentAt(Instant.now()); sentRepo.save(sn);
                // clear notification_time so it won't be reprocessed (optional)
                t.setNotificationTime(null);
                trainingRepo.save(t);
            }
        }
    }
}
