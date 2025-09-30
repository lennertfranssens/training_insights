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

    @PreAuthorize("hasAnyRole('TRAINER','ADMIN','SUPERADMIN')")
    @GetMapping("/aggregate")
    public java.util.Map<String,Object> aggregate(
            @RequestParam String metric, // e.g. 'soreness' or any numeric field in questionnaire responses
            @RequestParam String dimension, // athlete|group|club|age
            @RequestParam String granularity, // day|week|month|training
            @RequestParam(required=false) Long groupId,
            @RequestParam(required=false) Long clubId,
            @RequestParam(required=false) String start, // ISO date
            @RequestParam(required=false) String end // ISO date
    ){
        var data = service.aggregate(metric, dimension, granularity, groupId, clubId, start, end);
        return Map.of("metric", metric, "dimension", dimension, "granularity", granularity, "data", data);
    }
}
