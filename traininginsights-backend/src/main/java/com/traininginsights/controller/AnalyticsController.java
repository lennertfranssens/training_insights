package com.traininginsights.controller;

import com.traininginsights.service.AnalyticsService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.List;
import java.util.HashSet;
import java.util.Set;
import org.springframework.security.core.Authentication;
import com.traininginsights.repository.UserRepository;
import com.traininginsights.repository.GroupRepository;
import com.traininginsights.model.User;
import com.traininginsights.model.Group;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/analytics")
public class AnalyticsController {

    private final AnalyticsService service;
    private final UserRepository userRepository;
    private final GroupRepository groupRepository;
    public AnalyticsController(AnalyticsService service, UserRepository userRepository, GroupRepository groupRepository){ this.service = service; this.userRepository = userRepository; this.groupRepository = groupRepository; }

    private void assertTrainerAllowedGroup(Authentication auth, Long groupId){
        if (groupId == null) return;
        if (auth == null) return;
        User caller = userRepository.findByEmailIgnoreCase(auth.getName()).orElse(null);
        if (caller == null) return;
        boolean isTrainer = caller.getRoles().stream().anyMatch(r-> r.getName().name().equals("ROLE_TRAINER"));
        boolean isAdminLike = caller.getRoles().stream().anyMatch(r->{ String n=r.getName().name(); return n.equals("ROLE_ADMIN")||n.equals("ROLE_SUPERADMIN"); });
        if (!isTrainer || isAdminLike) return;
        Group g = groupRepository.findById(groupId).orElseThrow();
        boolean assigned = g.getTrainers().stream().anyMatch(u-> u.getId().equals(caller.getId()));
        if (!assigned) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not allowed to query analytics for this group");
    }

    // When groupId is omitted, restrict trainers to their assigned groups only by injecting a synthetic group filter when applicable
    private Long normalizeGroupIdForTrainer(Authentication auth, Long groupId){
        if (groupId != null) return groupId;
        if (auth == null) return null;
        User caller = userRepository.findByEmailIgnoreCase(auth.getName()).orElse(null);
        if (caller == null) return null;
        boolean isTrainer = caller.getRoles().stream().anyMatch(r-> r.getName().name().equals("ROLE_TRAINER"));
        boolean isAdminLike = caller.getRoles().stream().anyMatch(r->{ String n=r.getName().name(); return n.equals("ROLE_ADMIN")||n.equals("ROLE_SUPERADMIN"); });
        if (!isTrainer || isAdminLike) return groupId;
        // If trainer is assigned to multiple groups, we keep groupId null here and rely on service-side filtering (not yet implemented); alternatively, choose no synthetic groupId.
        // We'll enforce at least that when a groupId is provided, it must be one they train.
        return null;
    }

    // Determine the set of group IDs a trainer is allowed to access. Returns null for admin-like users or non-trainers (no restriction).
    private java.util.Set<Long> allowedTrainerGroupIds(Authentication auth){
        if (auth == null) return null;
        User caller = userRepository.findByEmailIgnoreCase(auth.getName()).orElse(null);
        if (caller == null) return null;
        boolean isTrainer = caller.getRoles().stream().anyMatch(r-> r.getName().name().equals("ROLE_TRAINER"));
        boolean isAdminLike = caller.getRoles().stream().anyMatch(r->{ String n=r.getName().name(); return n.equals("ROLE_ADMIN")||n.equals("ROLE_SUPERADMIN"); });
        if (!isTrainer || isAdminLike) return null;
        java.util.Set<Long> ids = new java.util.HashSet<>();
        for (Group g : groupRepository.findAll()){
            if (g.getTrainers() != null && g.getTrainers().stream().anyMatch(u-> u.getId().equals(caller.getId()))){
                ids.add(g.getId());
            }
        }
        return ids;
    }

    @PreAuthorize("hasAnyRole('TRAINER','ADMIN','SUPERADMIN')")
    @GetMapping("/group/{groupId}/soreness")
    public Map<String,Object> getGroupSorenessAverage(Authentication auth, @PathVariable Long groupId,
                                                      @RequestParam int year,
                                                      @RequestParam int isoWeek){
        assertTrainerAllowedGroup(auth, groupId);
        double avg = service.getGroupSorenessAverage(groupId, year, isoWeek);
        return Map.of("groupId", groupId, "year", year, "isoWeek", isoWeek, "sorenessAverage", avg);
    }

    @PreAuthorize("hasAnyRole('TRAINER','ADMIN','SUPERADMIN')")
    @GetMapping("/aggregate")
    public java.util.Map<String,Object> aggregate(Authentication auth,
            @RequestParam String metric, // e.g. 'soreness' or any numeric field in questionnaire responses
            @RequestParam String dimension, // athlete|group|club|age
            @RequestParam String granularity, // day|week|month|training
            @RequestParam(required=false) Long groupId,
            @RequestParam(required=false) Long clubId,
            @RequestParam(required=false) String start, // ISO date
            @RequestParam(required=false) String end, // ISO date
            @RequestParam(required=false) String phase // pre|post (optional)
    ){
        Long gid = normalizeGroupIdForTrainer(auth, groupId);
        assertTrainerAllowedGroup(auth, gid);
    var allowed = allowedTrainerGroupIds(auth);
    var data = service.aggregate(metric, dimension, granularity, gid, clubId, start, end, phase, allowed);
        // collect labels for keys present in data
        Set<String> keys = new HashSet<>();
        for (var row : data){ Object k = row.get("key"); if (k != null) keys.add(k.toString()); }
        var labels = service.resolveLabels(dimension, keys);
        return Map.of("metric", metric, "dimension", dimension, "granularity", granularity, "data", data, "labels", labels);
    }

    @PreAuthorize("hasAnyRole('TRAINER','ADMIN','SUPERADMIN')")
    @GetMapping("/aggregate-multi")
    public java.util.Map<String,Object> aggregateMulti(Authentication auth,
            @RequestParam(name = "metrics") List<String> metrics,
            @RequestParam String dimension,
            @RequestParam String granularity,
            @RequestParam(required=false) Long groupId,
            @RequestParam(required=false) Long clubId,
            @RequestParam(required=false) String start,
        @RequestParam(required=false) String end,
        @RequestParam(required=false) String phase
    ){
        Long gid = normalizeGroupIdForTrainer(auth, groupId);
        assertTrainerAllowedGroup(auth, gid);
        // Support comma-separated single param as well as repeated params
        if (metrics.size() == 1 && metrics.get(0) != null && metrics.get(0).contains(",")){
            metrics = java.util.Arrays.stream(metrics.get(0).split(","))
                    .map(String::trim).filter(s->!s.isEmpty()).toList();
        }
        var allowed = allowedTrainerGroupIds(auth);
    var result = service.aggregateMulti(metrics, dimension, granularity, gid, clubId, start, end, phase, allowed);
        // union of keys for labels
        Set<String> keys = new HashSet<>();
        for (var entry : result.values()){
            for (var row : entry){ Object k = row.get("key"); if (k != null) keys.add(k.toString()); }
        }
        var labels = service.resolveLabels(dimension, keys);
        return Map.of("metrics", metrics, "dimension", dimension, "granularity", granularity, "data", result, "labels", labels);
    }

    @PreAuthorize("hasAnyRole('TRAINER','ADMIN','SUPERADMIN')")
    @GetMapping("/drilldown")
    public java.util.Map<String,Object> drilldown(Authentication auth,
            @RequestParam(name = "metrics", required = false) List<String> metrics,
            @RequestParam String dimension,
            @RequestParam String granularity,
            @RequestParam(required=false) Long groupId,
            @RequestParam(required=false) Long clubId,
            @RequestParam(required=false) String start,
            @RequestParam(required=false) String end,
        @RequestParam(required=false) String phase,
            @RequestParam(required=false, name = "key") String filterKey,
            @RequestParam(required=false) String period,
            @RequestParam(required=false, defaultValue = "0") int page,
            @RequestParam(required=false, defaultValue = "25") int size,
            @RequestParam(required=false, defaultValue = "submittedAt,desc") String sort
    ){
        Long gid = normalizeGroupIdForTrainer(auth, groupId);
        assertTrainerAllowedGroup(auth, gid);
        if (metrics != null && metrics.size() == 1 && metrics.get(0) != null && metrics.get(0).contains(",")){
            metrics = java.util.Arrays.stream(metrics.get(0).split(","))
                    .map(String::trim).filter(s->!s.isEmpty()).toList();
        }
        var allowed = allowedTrainerGroupIds(auth);
    var result = service.drilldown(metrics, dimension, granularity, gid, clubId, start, end, phase, filterKey, period, page, size, sort, allowed);
        // labels for possible dimension keys present
        Set<String> keys = new HashSet<>();
        for (var row : result.rows){ Object k = row.get("key"); if (k != null) keys.add(k.toString()); }
        var labels = service.resolveLabels(dimension, keys);
        return Map.of(
                "dimension", dimension,
                "granularity", granularity,
                "rows", result.rows,
                "total", result.total,
                "page", result.page,
                "size", result.size,
                "sort", result.sort,
                "labels", labels
        );
    }

    @PreAuthorize("hasAnyRole('TRAINER','ADMIN','SUPERADMIN')")
    @GetMapping("/metrics")
    public java.util.Map<String,Object> availableMetrics(Authentication auth,
            @RequestParam(required=false) Long groupId,
            @RequestParam(required=false) Long clubId,
            @RequestParam(required=false) String start,
            @RequestParam(required=false) String end,
            @RequestParam(required=false) String phase
    ){
        Long gid = normalizeGroupIdForTrainer(auth, groupId);
        assertTrainerAllowedGroup(auth, gid);
    var allowed = allowedTrainerGroupIds(auth);
    var metrics = service.availableMetrics(gid, clubId, start, end, phase, allowed);
        return Map.of("metrics", metrics);
    }

    // Presence analytics
    @PreAuthorize("hasAnyRole('TRAINER','ADMIN','SUPERADMIN')")
    @GetMapping("/presence/aggregate")
    public java.util.Map<String,Object> presenceAggregate(Authentication auth,
            @RequestParam String dimension, // athlete|group|club|all
            @RequestParam String granularity, // day|week|month|training
            @RequestParam(required=false) Long groupId,
            @RequestParam(required=false) Long clubId,
            @RequestParam(required=false) String start,
            @RequestParam(required=false) String end
    ){
        Long gid = normalizeGroupIdForTrainer(auth, groupId);
        assertTrainerAllowedGroup(auth, gid);
    var allowed = allowedTrainerGroupIds(auth);
    var data = service.presenceAggregate(dimension, granularity, gid, clubId, start, end, allowed);
        // labels for keys
        java.util.Set<String> keys = new java.util.HashSet<>();
        for (var row : data){ Object k = row.get("key"); if (k != null) keys.add(k.toString()); }
        var labels = service.resolveLabels(dimension, keys);
        return Map.of("dimension", dimension, "granularity", granularity, "data", data, "labels", labels);
    }
}
