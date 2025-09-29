package com.traininginsights.controller;

import com.traininginsights.service.AnalyticsService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/analytics")
public class AnalyticsController {

    private final AnalyticsService service;
    public AnalyticsController(AnalyticsService service){ this.service = service; }

    @PreAuthorize("hasAnyRole('TRAINER','ADMIN','SUPERADMIN')")
    @GetMapping("/group/{groupId}/soreness")
    public Map<String,Object> getGroupSorenessAverage(@PathVariable Long groupId,
                                                      @RequestParam int year,
                                                      @RequestParam int isoWeek){
        double avg = service.getGroupSorenessAverage(groupId, year, isoWeek);
        return Map.of("groupId", groupId, "year", year, "isoWeek", isoWeek, "sorenessAverage", avg);
    }
}
