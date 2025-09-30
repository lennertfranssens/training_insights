package com.traininginsights.service;

import com.traininginsights.model.SentNotification;
import com.traininginsights.model.Training;
import com.traininginsights.repository.SentNotificationRepository;
import com.traininginsights.repository.TrainingRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.List;

@Component
public class NotificationScheduler {
    private final TrainingRepository trainingRepo;
    private final com.traininginsights.repository.PushSubscriptionRepository pushRepo;
    private final PushService pushService;
    private final com.traininginsights.service.NotificationService notificationService;
    private final SentNotificationRepository sentRepo;

    public NotificationScheduler(TrainingRepository trainingRepo, com.traininginsights.repository.PushSubscriptionRepository pushRepo, PushService pushService, SentNotificationRepository sentRepo, com.traininginsights.service.NotificationService notificationService){
        this.trainingRepo = trainingRepo; this.pushRepo = pushRepo; this.pushService = pushService; this.sentRepo = sentRepo; this.notificationService = notificationService;
    }

    @Scheduled(cron = "0 * * * * *") // every minute at 0s
    public void run() {
        Instant now = Instant.now();
        List<Training> due = trainingRepo.findAll().stream().filter(t -> t.getNotificationTime() != null && !t.getNotificationTime().isAfter(now)).toList();
        for (Training t : due) {
            // check if already sent
            var already = sentRepo.findByTrainingIdAndTypeAndSentAtAfter(t.getId(), "PRE_QUESTIONNAIRE", now.minusSeconds(3600));
            if (already != null && !already.isEmpty()) continue;
            // send to athletes in groups
            t.getGroups().forEach(g -> g.getAthletes().forEach(a -> {
                try {
                    notificationService.createSystemNotificationForUser(a.getId(), "Reminder: please fill the pre-training questionnaire for " + t.getTitle(), "Please complete the pre-training questionnaire for training: " + t.getTitle());
                } catch (Exception e){
                    // fallback: directly send push
                    pushRepo.findByUser(a).forEach(s -> { try { pushService.sendNotification(s, "Reminder: please fill the pre-training questionnaire for " + t.getTitle()); } catch (Exception ignored){} });
                }
            }));
            SentNotification sn = new SentNotification(); sn.setTrainingId(t.getId()); sn.setType("PRE_QUESTIONNAIRE"); sn.setSentAt(Instant.now()); sentRepo.save(sn);
            // clear notification_time so it won't be reprocessed (optional)
            t.setNotificationTime(null);
            trainingRepo.save(t);
        }
    }
}
