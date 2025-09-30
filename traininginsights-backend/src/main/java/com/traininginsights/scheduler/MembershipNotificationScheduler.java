package com.traininginsights.scheduler;

import com.traininginsights.service.MembershipService;
import com.traininginsights.service.NotificationService;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class MembershipNotificationScheduler {
    private final MembershipService membershipService;
    private final NotificationService notificationService;

    public MembershipNotificationScheduler(MembershipService membershipService, NotificationService notificationService){
        this.membershipService = membershipService; this.notificationService = notificationService;
    }

    // Run once per day at 03:00 to check upcoming expiries and dispatch queued notifications
    @Scheduled(cron = "0 0 3 * * ?")
    public void runNotifications(){
        membershipService.checkAndQueueMembershipNotifications();
        notificationService.dispatchStoredNotifications();
    }
}
