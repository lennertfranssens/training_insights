package com.traininginsights.controller;

import com.traininginsights.model.Membership;
import com.traininginsights.model.Season;
import com.traininginsights.dto.MembershipDto;
import com.traininginsights.service.MembershipService;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
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

    @PreAuthorize("hasAnyRole('ADMIN','SUPERADMIN')")
    @DeleteMapping("/memberships/{id}")
    public void deleteMembership(@PathVariable Long id){
        service.deleteMembership(id);
    }

    @PreAuthorize("hasAnyRole('ADMIN','SUPERADMIN')")
    @PostMapping("/memberships/batch")
    public java.util.List<Membership> batchCreate(@RequestBody java.util.Map<String, Object> payload){
        // expect payload: { userIds: [1,2,3], clubId: 1, seasonId: 2 }
        try {
            java.util.List<Long> userIds = toLongList(payload.get("userIds"));
            Long clubId = toLong(payload.get("clubId"));
            Long seasonId = toLong(payload.get("seasonId"));
            if (clubId == null || seasonId == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "clubId and seasonId are required and must be numbers");
            return service.batchCreateMemberships(userIds, clubId, seasonId, null, null);
        } catch (ResponseStatusException rse){
            throw rse;
        } catch (Exception ex){
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid batch payload", ex);
        }
    }

    private Long toLong(Object o){
        if (o == null) return null;
        if (o instanceof Number) return ((Number)o).longValue();
        if (o instanceof String){ try { return Long.parseLong((String)o); } catch (NumberFormatException e) { return null; } }
        return null;
    }

    private java.util.List<Long> toLongList(Object o){
        java.util.List<Long> out = new java.util.ArrayList<>();
        if (o == null) return out;
        if (o instanceof java.util.List){
            for (Object x : (java.util.List<?>) o){
                Long v = toLong(x);
                if (v != null) out.add(v);
            }
        } else {
            // single value maybe
            Long v = toLong(o);
            if (v != null) out.add(v);
        }
        return out;
    }

}
