package com.traininginsights.controller;

import com.traininginsights.model.Membership;
import com.traininginsights.model.Season;
import com.traininginsights.dto.MembershipDto;
import com.traininginsights.service.MembershipService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;

@RestController
@RequestMapping("/api/admin")
public class MembershipController {
    private final MembershipService service;
    public MembershipController(MembershipService service){ this.service = service; }

    @PreAuthorize("hasAnyRole('ADMIN','SUPERADMIN')")
    @GetMapping("/seasons")
    public List<Season> listSeasons(){ return service.listSeasons(); }

    @PreAuthorize("hasAnyRole('ADMIN','SUPERADMIN')")
    @PostMapping("/seasons")
    public Season createSeason(@RequestBody Season s){ return service.createSeason(s); }

    @PreAuthorize("hasAnyRole('ADMIN','SUPERADMIN')")
    @PostMapping("/memberships")
    public Membership createMembership(@RequestParam Long userId, @RequestParam Long clubId, @RequestParam Long seasonId, @RequestParam(required=false) Long startEpochMillis, @RequestParam(required=false) Long endEpochMillis){
        Instant start = startEpochMillis != null ? Instant.ofEpochMilli(startEpochMillis) : Instant.now();
        Instant end = endEpochMillis != null ? Instant.ofEpochMilli(endEpochMillis) : null;
        return service.createMembership(userId, clubId, seasonId, start, end);
    }

    @PreAuthorize("hasAnyRole('ADMIN','SUPERADMIN')")
    @GetMapping("/memberships/by-club/{clubId}")
    public java.util.List<Membership> byClub(@PathVariable Long clubId){ return service.listByClub(clubId); }

    @PreAuthorize("hasAnyRole('ADMIN','SUPERADMIN')")
    @GetMapping("/memberships/by-club/{clubId}/dto")
    public java.util.List<MembershipDto> byClubDto(@PathVariable Long clubId){ return service.listByClubDto(clubId); }

    @PreAuthorize("hasAnyRole('ADMIN','SUPERADMIN')")
    @GetMapping("/memberships/search")
    public java.util.List<MembershipDto> search(@RequestParam(required=false) Long clubId,
                                                @RequestParam(required=false) Long seasonId,
                                                @RequestParam(required=false) String category,
                                                @RequestParam(required=false) Long groupId,
                                                @RequestParam(required=false) Integer minAge,
                                                @RequestParam(required=false) Integer maxAge){
        return service.search(clubId, seasonId, category, groupId, minAge, maxAge);
    }

    @PreAuthorize("hasAnyRole('ADMIN','SUPERADMIN')")
    @PostMapping("/memberships/{id}/end")
    public Membership endMembership(@PathVariable Long id, @RequestParam(required=false) Long endEpochMillis){
        Instant end = endEpochMillis != null ? Instant.ofEpochMilli(endEpochMillis) : Instant.now();
        return service.endMembership(id, end);
    }

    @PreAuthorize("hasAnyRole('ADMIN','SUPERADMIN')")
    @PostMapping("/memberships/{id}/renew")
    public Membership renewMembership(@PathVariable Long id, @RequestParam Long seasonId, @RequestParam(required=false) Long startEpochMillis, @RequestParam(required=false) Long endEpochMillis){
        Instant start = startEpochMillis != null ? Instant.ofEpochMilli(startEpochMillis) : Instant.now();
        Instant end = endEpochMillis != null ? Instant.ofEpochMilli(endEpochMillis) : null;
        return service.renewMembership(id, seasonId, start, end);
    }

}
