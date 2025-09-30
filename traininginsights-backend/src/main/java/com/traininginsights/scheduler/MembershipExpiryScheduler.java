package com.traininginsights.scheduler;

import com.traininginsights.service.MembershipService;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class MembershipExpiryScheduler {
    private final MembershipService membershipService;
    public MembershipExpiryScheduler(MembershipService membershipService){ this.membershipService = membershipService; }

    // Run once per day at 02:00
    @Scheduled(cron = "0 0 2 * * ?")
    public void expireMemberships(){
        membershipService.expireMembershipsPastDue();
    }
}
