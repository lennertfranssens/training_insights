package com.traininginsights.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.traininginsights.dto.TrainingDtos;
import com.traininginsights.model.QuestionnaireResponse;
import com.traininginsights.model.Training;
import com.traininginsights.model.TrainingSeries;
import com.traininginsights.model.Questionnaire;
import com.traininginsights.model.Group;
import com.traininginsights.model.User;
import com.traininginsights.service.QuestionnaireResponseService;
import com.traininginsights.service.TrainingService;
import com.traininginsights.service.TrainingAttendanceService;
import com.traininginsights.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import com.traininginsights.model.Attachment;
import com.traininginsights.repository.AttachmentRepository;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.UUID;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import org.springframework.core.io.InputStreamResource;
import java.io.IOException;
import org.springframework.http.ResponseEntity;
import org.springframework.http.MediaType;
import org.springframework.beans.factory.annotation.Value;

import java.util.List;
import java.util.Set;
import java.util.HashSet;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/trainings")
public class TrainingController {
    private final TrainingService service;
    private final UserRepository userRepository;
    private final AttachmentRepository attachmentRepository;
    private final QuestionnaireResponseService responseService;
    private final String uploadsDir;
    private final TrainingAttendanceService attendanceService;

    public TrainingController(TrainingService service, UserRepository userRepository, AttachmentRepository attachmentRepository, QuestionnaireResponseService responseService, TrainingAttendanceService attendanceService, @Value("${app.uploadsDir:uploads}") String uploadsDir){ this.service = service; this.userRepository = userRepository; this.attachmentRepository = attachmentRepository; this.responseService = responseService; this.attendanceService = attendanceService; this.uploadsDir = uploadsDir; }

    @PreAuthorize("hasAnyRole('TRAINER','ADMIN','SUPERADMIN','ATHLETE')")
    @GetMapping public java.util.List<com.traininginsights.dto.TrainingDtos.TrainingDTO> all(Authentication auth){
        var caller = userRepository.findByEmailIgnoreCase(auth.getName()).orElseThrow();
        boolean isAthlete = caller.getRoles().stream().anyMatch(r -> r.getName().name().equals("ROLE_ATHLETE"));
        boolean isAdminLike = caller.getRoles().stream().anyMatch(r -> {
            String n = r.getName().name(); return n.equals("ROLE_ADMIN") || n.equals("ROLE_SUPERADMIN");
        });
        java.util.List<Training> raw;
        if (!isAthlete) {
            if (isAdminLike) raw = service.all();
            else raw = service.all().stream()
                    .filter(t ->
                            // trainings where trainer is assigned to at least one group
                            (t.getGroups() != null && t.getGroups().stream().anyMatch(g -> g.getTrainers().stream().anyMatch(u -> u.getId().equals(caller.getId()))))
                                    // OR trainings authored by the trainer (even if no groups yet)
                                    || (t.getCreatedBy() != null && t.getCreatedBy().getId().equals(caller.getId()))
                    )
                    .toList();
        } else {
            var group = caller.getGroupEntity();
            if (group == null) raw = java.util.Collections.emptyList();
            else raw = service.findByGroupId(group.getId());
        }
        if (isAthlete) {
            // Bulk presence map for athlete: trainingId -> Boolean
            java.util.Map<Long, Boolean> presenceMap = new java.util.HashMap<>();
            try {
                var attendanceList = attendanceService.byUser(caller);
                for (var att : attendanceList){
                    if (att.getTraining()!=null && att.getTraining().getId()!=null){
                        presenceMap.put(att.getTraining().getId(), att.isPresent());
                    }
                }
            } catch (Exception ignored) {}
            java.util.Map<Long, Boolean> finalPresenceMap = presenceMap;
            return raw.stream().map(t -> toDTO(t, caller, finalPresenceMap.get(t.getId()))).toList();
        }
        return raw.stream().map(this::toDTO).toList();
    }

    @PreAuthorize("hasAnyRole('TRAINER','ADMIN','SUPERADMIN','ATHLETE')")
    @GetMapping("/{id}") public com.traininginsights.dto.TrainingDtos.TrainingDTO get(@PathVariable Long id, Authentication auth){
        Training t = service.get(id);
        var caller = userRepository.findByEmailIgnoreCase(auth.getName()).orElseThrow();
        boolean isAthlete = caller.getRoles().stream().anyMatch(r -> r.getName().name().equals("ROLE_ATHLETE"));
        if (!isAthlete) {
            boolean isAdminLike = caller.getRoles().stream().anyMatch(r -> {
                String n = r.getName().name(); return n.equals("ROLE_ADMIN") || n.equals("ROLE_SUPERADMIN");
            });
            if (isAdminLike) return toDTO(t);
            // trainer must be assigned to at least one group of this training
            boolean trainerAssigned = t.getGroups() != null && t.getGroups().stream().anyMatch(g -> g.getTrainers().stream().anyMatch(u -> u.getId().equals(caller.getId())));
            boolean isOwner = t.getCreatedBy() != null && t.getCreatedBy().getId().equals(caller.getId());
            if (!trainerAssigned && !isOwner) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not allowed to view this training");
            return toDTO(t);
        }
        // Athlete: must belong to one of the training groups
    var group = caller.getGroupEntity();
    if (group == null) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not allowed to view this training");
    boolean inGroup = service.existsByIdAndGroupId(t.getId(), group.getId());
    if (!inGroup) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not allowed to view this training");
        // If the training is not marked visibleToAthletes, hide the description (attachments are already guarded by endpoints)
        if (!t.isVisibleToAthletes()){
            t.setDescription(null);
        }
        // Single get: fetch presence directly (cheap) for athlete
        Boolean presence = null;
        try {
            var list = attendanceService.byTraining(t);
            for (var a : list){ if (a.getUser()!=null && a.getUser().getId().equals(caller.getId())) { presence = a.isPresent(); break; } }
        } catch (Exception ignored) {}
        return toDTO(t, caller, presence);
    }

    @PreAuthorize("hasAnyRole('TRAINER','ADMIN','SUPERADMIN')")
    @Transactional(readOnly = true)
    @GetMapping("/by-group/{groupId}")
    public List<Training> byGroup(@PathVariable Long groupId){
        return service.all().stream()
                .filter(t -> t.getGroups() != null && t.getGroups().stream().anyMatch(g -> g.getId().equals(groupId)))
                .toList();
    }

    @PreAuthorize("hasAnyRole('TRAINER','ADMIN','SUPERADMIN')")
    @PostMapping
    public com.traininginsights.dto.TrainingDtos.TrainingDTO create(Authentication auth, @RequestBody TrainingDtos.TrainingCreateRequest req){
        if (req.trainingEndTime != null && !req.trainingEndTime.isAfter(req.trainingTime)){
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Training end time must be after start time");
        }
        // Base training template
        Training base = new Training();
        base.setTitle(req.title);
        base.setDescription(req.description);
        base.setTrainingTime(req.trainingTime);
        base.setTrainingEndTime(req.trainingEndTime);
        base.setVisibleToAthletes(req.visibleToAthletes);
        base.setPreNotificationMinutes(req.preNotificationMinutes);
        // set creator
        var creator = userRepository.findByEmailIgnoreCase(auth.getName()).orElse(null);
        if (creator != null) base.setCreatedBy(creator);
        if (req.preQuestionnaireId != null) { try { base.setPreQuestionnaire(new com.traininginsights.model.Questionnaire(){ { setId(req.preQuestionnaireId);} }); } catch (Exception ignored){} }
        if (req.postQuestionnaireId != null) { try { base.setPostQuestionnaire(new com.traininginsights.model.Questionnaire(){ { setId(req.postQuestionnaireId);} }); } catch (Exception ignored){} }
        if (req.groupIds != null && !req.groupIds.isEmpty()) {
            // Deferred proper group fetch: will rely on assign endpoint or enhancement later
        }
        if (req.recurrence == null){
            Training saved = service.save(base);
            return toDTO(saved);
        }
        // Validation: require at least UNTIL or COUNT for now (no fully open-ended)
        if ((req.recurrence.until == null) && (req.recurrence.count == null)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Recurrence must specify UNTIL date or COUNT");
        }
        // Recurrence path (skeleton: only first occurrence for now)
        TrainingSeries series = new TrainingSeries();
        series.setRrule(req.recurrence.rrule);
        if (req.recurrence.timezone != null && !req.recurrence.timezone.isBlank()) series.setTimezone(req.recurrence.timezone);
        series.setStartTime(req.trainingTime);
        series.setEndTime(req.trainingEndTime != null ? req.trainingEndTime : req.trainingTime);
        series.setUntil(req.recurrence.until);
        series.setCount(req.recurrence.count);
        series = service.createSeries(series);
        java.util.List<Training> occList = service.generateOccurrences(series, () -> {
            Training t = new Training();
            t.setTitle(base.getTitle());
            t.setDescription(base.getDescription());
            t.setTrainingTime(base.getTrainingTime());
            t.setTrainingEndTime(base.getTrainingEndTime());
            t.setVisibleToAthletes(base.isVisibleToAthletes());
            t.setPreNotificationMinutes(base.getPreNotificationMinutes());
            t.setPreQuestionnaire(base.getPreQuestionnaire());
            t.setPostQuestionnaire(base.getPostQuestionnaire());
            t.setCreatedBy(base.getCreatedBy());
            if (base.getGroups()!=null && !base.getGroups().isEmpty()){
                // copy group references; they may be empty at this stage, assignment endpoint may override later
                t.setGroups(new java.util.HashSet<>(base.getGroups()));
            }
            return t;
        });
        // Persist occurrences
        Training first = null;
        for (Training occurrence : occList){
            Training saved = service.save(occurrence);
            if (first == null) first = saved; // keep reference to first occurrence (sequence 1)
        }
        return toDTO(first);
    }

    @PreAuthorize("hasAnyRole('TRAINER','ADMIN','SUPERADMIN')")
    @PutMapping("/{id}") public com.traininginsights.dto.TrainingDtos.TrainingDTO update(@PathVariable Long id, @RequestBody TrainingDtos.TrainingUpdateRequest req){
        // Simplified: treat as single update unless recurrence scope logic implemented later
        Training existing = service.get(id);
        if (req.trainingEndTime != null && !req.trainingEndTime.isAfter(req.trainingTime)){
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Training end time must be after start time");
        }
        // NEW: Allow adding recurrence to a formerly single (non-series) training directly via update (UI sends recurrence when enabling)
        if (existing.getSeries()==null && req.recurrence != null && req.recurrence.rrule != null && !req.recurrence.rrule.isBlank()) {
            if (req.recurrence.until == null && req.recurrence.count == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Recurrence must specify UNTIL date or COUNT");
            }
            // Apply field updates to existing as base template first
            applyUpdate(existing, req);
            // Build series from (possibly updated) existing values
            TrainingSeries series = new TrainingSeries();
            series.setRrule(req.recurrence.rrule);
            if (req.recurrence.timezone != null && !req.recurrence.timezone.isBlank()) series.setTimezone(req.recurrence.timezone);
            series.setStartTime(existing.getTrainingTime());
            series.setEndTime(existing.getTrainingEndTime()!=null ? existing.getTrainingEndTime() : existing.getTrainingTime());
            series.setUntil(req.recurrence.until);
            series.setCount(req.recurrence.count);
            series = service.createSeries(series);
            // Reuse existing entity as first occurrence to preserve ID
            existing.setSeries(series);
            existing.setSeriesSequence(1);
            existing.setDetached(false);
            Training savedFirst = service.save(existing);
            // Generate future occurrences starting from rule expansion; skip sequence 1 which we already have
            java.util.List<Training> occ = service.generateOccurrences(series, () -> {
                Training t = new Training();
                t.setTitle(savedFirst.getTitle());
                t.setDescription(savedFirst.getDescription());
                t.setVisibleToAthletes(savedFirst.isVisibleToAthletes());
                t.setPreNotificationMinutes(savedFirst.getPreNotificationMinutes());
                t.setPreQuestionnaire(savedFirst.getPreQuestionnaire());
                t.setPostQuestionnaire(savedFirst.getPostQuestionnaire());
                t.setCreatedBy(savedFirst.getCreatedBy());
                t.setGroups(savedFirst.getGroups()!=null ? new java.util.HashSet<>(savedFirst.getGroups()) : null);
                // trainingTime/trainingEndTime filled in generateOccurrences
                return t;
            });
            for (Training occT : occ){
                if (occT.getSeriesSequence()!=null && occT.getSeriesSequence()==1) continue; // skip first
                service.save(occT);
            }
            return toDTO(savedFirst);
        }
        String scope = req.scope != null ? req.scope.trim().toUpperCase() : "THIS";
        if (existing.getSeries()==null || existing.isDetached() || "THIS".equals(scope)){
            applyUpdate(existing, req);
            if (existing.getSeries()!=null && !existing.isDetached()){
                existing.setDetached(true); // detaching single occurrence edit
            }
            Training saved = service.save(existing);
            return toDTO(saved);
        }
        if ("FUTURE".equals(scope)){
            // compute deltas for time shift
            java.time.Instant oldStart = existing.getTrainingTime();
            java.time.Instant oldEnd = existing.getTrainingEndTime();
            java.time.Duration startDelta = java.time.Duration.between(oldStart, req.trainingTime);
            java.time.Duration durDelta = null;
            if (oldEnd != null && req.trainingEndTime != null){
                java.time.Duration oldDur = java.time.Duration.between(oldStart, oldEnd);
                java.time.Duration newDur = java.time.Duration.between(req.trainingTime, req.trainingEndTime);
                if (!oldDur.equals(newDur)) durDelta = newDur; // new absolute duration
            }
            // If RRULE modification requested and this is first occurrence, update series and regenerate future
            if (req.recurrence != null && req.recurrence.rrule != null && existing.getSeriesSequence()!=null) {
                String currentRule = existing.getSeries().getRrule();
                if (!currentRule.equals(req.recurrence.rrule)){
                    // Validation for new rule: require UNTIL or COUNT if provided recurrence object
                    if (req.recurrence.until == null && req.recurrence.count == null) {
                        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Recurrence must specify UNTIL date or COUNT");
                    }
                    if (existing.getSeriesSequence()==1){
                        // Original behavior: modify series in place
                        java.util.List<Training> all = service.futureAndCurrentFrom(existing);
                        for (Training t : all){ if (!t.getId().equals(existing.getId())) service.delete(t.getId()); }
                        applyUpdate(existing, req);
                        TrainingSeries series = existing.getSeries();
                        series.setRrule(req.recurrence.rrule);
                        if (req.recurrence.until != null) series.setUntil(req.recurrence.until);
                        if (req.recurrence.count != null) series.setCount(req.recurrence.count);
                        series.setStartTime(existing.getTrainingTime());
                        series.setEndTime(existing.getTrainingEndTime()!=null? existing.getTrainingEndTime(): existing.getTrainingTime());
                        TrainingSeries updatedSeries = service.createSeries(series);
                        java.util.List<Training> newOcc = service.generateOccurrences(updatedSeries, () -> {
                            Training clone = new Training();
                            clone.setTitle(existing.getTitle());
                            clone.setDescription(existing.getDescription());
                            clone.setVisibleToAthletes(existing.isVisibleToAthletes());
                            clone.setPreNotificationMinutes(existing.getPreNotificationMinutes());
                            clone.setPreQuestionnaire(existing.getPreQuestionnaire());
                            clone.setPostQuestionnaire(existing.getPostQuestionnaire());
                            clone.setTrainingTime(existing.getTrainingTime());
                            clone.setTrainingEndTime(existing.getTrainingEndTime());
                            return clone;
                        });
                        for (Training occ : newOcc){
                            if (occ.getSeriesSequence()!=null && occ.getSeriesSequence()==1) continue;
                            service.save(occ);
                        }
                        return toDTO(service.save(existing));
                    } else {
                        // Split series: delete future occurrences beyond current in old series
                        java.util.List<Training> all = service.futureAndCurrentFrom(existing);
                        for (Training t : all){ if (!t.getId().equals(existing.getId())) service.delete(t.getId()); }
                        // Create new series starting from this occurrence
                        TrainingSeries newSeries = new TrainingSeries();
                        newSeries.setRrule(req.recurrence.rrule);
                        newSeries.setStartTime(req.trainingTime);
                        newSeries.setEndTime(req.trainingEndTime != null ? req.trainingEndTime : req.trainingTime);
                        newSeries.setUntil(req.recurrence.until);
                        newSeries.setCount(req.recurrence.count);
                        if (req.recurrence.timezone != null && !req.recurrence.timezone.isBlank()) newSeries.setTimezone(req.recurrence.timezone);
                        newSeries = service.createSeries(newSeries);
                        applyUpdate(existing, req);
                        existing.setSeries(newSeries);
                        existing.setSeriesSequence(1);
                        existing.setDetached(false); // now part of new series
                        Training savedCurrent = service.save(existing);
                        // Generate future from new rule (skip first)
                        TrainingSeries finalSeries = newSeries;
                        java.util.List<Training> newOcc = service.generateOccurrences(finalSeries, () -> {
                            Training clone = new Training();
                            clone.setTitle(savedCurrent.getTitle());
                            clone.setDescription(savedCurrent.getDescription());
                            clone.setVisibleToAthletes(savedCurrent.isVisibleToAthletes());
                            clone.setPreNotificationMinutes(savedCurrent.getPreNotificationMinutes());
                            clone.setPreQuestionnaire(savedCurrent.getPreQuestionnaire());
                            clone.setPostQuestionnaire(savedCurrent.getPostQuestionnaire());
                            clone.setTrainingTime(savedCurrent.getTrainingTime());
                            clone.setTrainingEndTime(savedCurrent.getTrainingEndTime());
                            return clone;
                        });
                        for (Training occ : newOcc){
                            if (occ.getSeriesSequence()!=null && occ.getSeriesSequence()==1) continue;
                            service.save(occ);
                        }
                        return toDTO(savedCurrent);
                    }
                }
            }
            java.util.List<Training> futures = service.futureAndCurrentFrom(existing);
            for (Training t : futures){
                if (t.getId().equals(existing.getId())){
                    applyUpdate(t, req);
                } else {
                    // propagate selective fields
                    t.setTitle(req.title);
                    t.setDescription(req.description);
                    t.setVisibleToAthletes(req.visibleToAthletes);
                    t.setPreNotificationMinutes(req.preNotificationMinutes);
                    // shift start
                    if (!startDelta.isZero()){
                        t.setTrainingTime(t.getTrainingTime().plusSeconds(startDelta.getSeconds()));
                    }
                    // adjust duration if changed
                    if (durDelta != null){
                        java.time.Instant newStart = t.getTrainingTime();
                        t.setTrainingEndTime(newStart.plusSeconds(durDelta.getSeconds()));
                    } else if (req.trainingEndTime != null && oldEnd == null){
                        // previously no end; now define
                        java.time.Duration nd = java.time.Duration.between(req.trainingTime, req.trainingEndTime);
                        t.setTrainingEndTime(t.getTrainingTime().plusSeconds(nd.getSeconds()));
                    }
                }
                service.save(t);
            }
            return toDTO(service.get(id));
        }
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid scope value");
    }

    private void applyUpdate(Training existing, TrainingDtos.TrainingUpdateRequest req){
        existing.setTitle(req.title);
        existing.setDescription(req.description);
        existing.setTrainingTime(req.trainingTime);
        existing.setTrainingEndTime(req.trainingEndTime);
        existing.setVisibleToAthletes(req.visibleToAthletes);
        existing.setPreNotificationMinutes(req.preNotificationMinutes);
        // Persist questionnaire changes (previously omitted)
        if (req.preQuestionnaireId != null){
            Questionnaire q = new Questionnaire(); q.setId(req.preQuestionnaireId); existing.setPreQuestionnaire(q);
        } else { existing.setPreQuestionnaire(null); }
        if (req.postQuestionnaireId != null){
            Questionnaire q2 = new Questionnaire(); q2.setId(req.postQuestionnaireId); existing.setPostQuestionnaire(q2);
        } else { existing.setPostQuestionnaire(null); }
    }

    private TrainingDtos.TrainingDTO toDTO(Training t){ return toDTO(t, null, null); }
    private TrainingDtos.TrainingDTO toDTO(Training t, com.traininginsights.model.User athleteContext, Boolean presence){
        TrainingDtos.TrainingDTO dto = new TrainingDtos.TrainingDTO();
        dto.id = t.getId();
        dto.title = t.getTitle();
        dto.description = t.getDescription();
        dto.trainingTime = t.getTrainingTime();
    dto.trainingEndTime = t.getTrainingEndTime();
        dto.visibleToAthletes = t.isVisibleToAthletes();
        dto.seriesId = t.getSeriesId();
        dto.seriesSequence = t.getSeriesSequence();
        dto.detached = t.isDetached();
    dto.groupDetached = t.isGroupDetached();
        if (t.getGroups()!=null){
            dto.groupIds = t.getGroups().stream().map(g -> g.getId()).collect(java.util.stream.Collectors.toSet());
            java.util.Set<TrainingDtos.GroupLite> lite = new java.util.HashSet<>();
            for (var g : t.getGroups()) {
                TrainingDtos.GroupLite gl = new TrainingDtos.GroupLite();
                gl.id = g.getId();
                gl.name = g.getName();
                lite.add(gl);
            }
            dto.groups = lite;
        }
        if (t.getPreQuestionnaire()!=null) dto.preQuestionnaireId = t.getPreQuestionnaire().getId();
        if (t.getPostQuestionnaire()!=null) dto.postQuestionnaireId = t.getPostQuestionnaire().getId();
        dto.recurrenceSummary = service.buildSummary(t);
        if (t.getCreatedBy() != null) {
            dto.createdById = t.getCreatedBy().getId();
        }
        // Provide recurrence base for any occurrence in a series so UI can offer scope edits
        if (t.getSeries() != null) {
            var series = t.getSeries();
            TrainingDtos.RecurrenceCreateRequest r = new TrainingDtos.RecurrenceCreateRequest();
            r.rrule = series.getRrule();
            r.timezone = series.getTimezone();
            r.until = series.getUntil();
            r.count = series.getCount();
            dto.recurrence = r;
        }
        // Athlete presence indicator
        if (athleteContext != null){ dto.myPresence = presence; }
        return dto;
    }

    // Lightweight reschedule: only change start/end times; preserve other fields
    @PreAuthorize("hasAnyRole('TRAINER','ADMIN','SUPERADMIN')")
    @PatchMapping("/{id}/reschedule")
    public Training reschedule(@PathVariable Long id, @RequestBody java.util.Map<String,Object> body){
        Training existing = service.get(id);
        Object startObj = body.get("trainingTime");
        Object endObj = body.get("trainingEndTime");
        if (startObj == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "trainingTime required");
        java.time.Instant newStart;
        try { newStart = java.time.Instant.parse(startObj.toString()); } catch (Exception e){ throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid trainingTime"); }
        java.time.Instant newEnd = null;
        if (endObj != null && !endObj.toString().isBlank()) {
            try { newEnd = java.time.Instant.parse(endObj.toString()); } catch (Exception e){ throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid trainingEndTime"); }
        }
        if (newEnd != null && !newEnd.isAfter(newStart)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Training end time must be after start time");
        }
        existing.setTrainingTime(newStart);
        existing.setTrainingEndTime(newEnd);
        // Recompute notification time based on existing preNotificationMinutes
        if (existing.getPreNotificationMinutes() != null && existing.getPreNotificationMinutes() > 0) {
            existing.setNotificationTime(existing.getTrainingTime().minusSeconds(existing.getPreNotificationMinutes() * 60L));
        } else {
            existing.setNotificationTime(null);
        }
        return service.save(existing);
    }

    @PreAuthorize("hasAnyRole('TRAINER','ADMIN','SUPERADMIN')")
    @DeleteMapping("/{id}") public void delete(@PathVariable Long id, Authentication auth, @RequestParam(value="scope", required=false) String scope){
        User caller = userRepository.findByEmailIgnoreCase(auth.getName()).orElseThrow();
        boolean isAdmin = caller.getRoles().stream().anyMatch(r -> r.getName().name().equals("ROLE_ADMIN") || r.getName().name().equals("ROLE_SUPERADMIN"));
        var t = service.get(id);
        if (isAdmin){
            handleSeriesDeleteScope(t, scope);
            return;
        }
        boolean trainerAssigned = t.getGroups() != null && t.getGroups().stream().anyMatch(g -> g.getTrainers().stream().anyMatch(u -> u.getId().equals(caller.getId())));
        boolean isOwner = t.getCreatedBy() != null && t.getCreatedBy().getId().equals(caller.getId());
        if (!trainerAssigned && !isOwner) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not allowed to delete this training");
        handleSeriesDeleteScope(t, scope);
    }

    // Detach groups for a single occurrence: subsequent series resyncs won't overwrite
    @PreAuthorize("hasAnyRole('TRAINER','ADMIN','SUPERADMIN')")
    @PostMapping("/{id}/detach-groups")
    public TrainingDtos.TrainingDTO detachGroups(@PathVariable Long id, Authentication auth){
        Training t = service.get(id);
        var caller = userRepository.findByEmailIgnoreCase(auth.getName()).orElseThrow();
        boolean isAdminLike = caller.getRoles().stream().anyMatch(r -> {
            String n = r.getName().name(); return n.equals("ROLE_ADMIN") || n.equals("ROLE_SUPERADMIN");
        });
        if (!isAdminLike) {
            boolean trainerAssigned = t.getGroups()!=null && t.getGroups().stream().anyMatch(g -> g.getTrainers().stream().anyMatch(u -> u.getId().equals(caller.getId())));
            if (!trainerAssigned) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not allowed to detach groups for this training");
        }
        t.setGroupDetached(true);
        return toDTO(service.save(t));
    }

    // Resync groups across series (apply given group IDs to all non-detached occurrences)
    @PreAuthorize("hasAnyRole('TRAINER','ADMIN','SUPERADMIN')")
    @PostMapping("/{id}/series/resync-groups")
    public java.util.List<TrainingDtos.TrainingDTO> resyncGroups(@PathVariable Long id, @RequestBody TrainingDtos.ResyncGroupsRequest req, Authentication auth){
        Training pivot = service.get(id);
        if (pivot.getSeries()==null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Training not part of a series");
        var caller = userRepository.findByEmailIgnoreCase(auth.getName()).orElseThrow();
        boolean isAdminLike = caller.getRoles().stream().anyMatch(r -> {
            String n = r.getName().name(); return n.equals("ROLE_ADMIN") || n.equals("ROLE_SUPERADMIN");
        });
        if (!isAdminLike) {
            boolean trainerAssigned = pivot.getGroups()!=null && pivot.getGroups().stream().anyMatch(g -> g.getTrainers().stream().anyMatch(u -> u.getId().equals(caller.getId())));
            if (!trainerAssigned) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not allowed to resync groups for this series");
        }
        java.util.Set<Long> groupIds = req.groupIds!=null ? req.groupIds : java.util.Set.of();
    java.util.Set<com.traininginsights.model.Group> groups = new java.util.HashSet<>(service.fetchGroups(groupIds));
    java.util.List<Training> all = service.allInSeries(pivot.getSeries().getId());
        for (Training occ : all){
            if (occ.isGroupDetached()) continue;
            occ.setGroups(groups);
            service.save(occ);
        }
        return all.stream().map(this::toDTO).toList();
    }

    // Upgrade a single (non-series) training to a series using provided recurrence
    @PreAuthorize("hasAnyRole('TRAINER','ADMIN','SUPERADMIN')")
    @PostMapping("/{id}/upgrade-to-series")
    public TrainingDtos.TrainingDTO upgradeToSeries(@PathVariable Long id, @RequestBody TrainingDtos.UpgradeToSeriesRequest req, Authentication auth){
        if (req.recurrence == null || req.recurrence.rrule == null || req.recurrence.rrule.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Recurrence RRULE required");
        }
        // Validate termination
        if (req.recurrence.until == null && req.recurrence.count == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Recurrence must specify UNTIL or COUNT");
        }
        Training base = service.get(id);
        if (base.getSeries()!=null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Training already part of a series");
        // Create series from base
        TrainingSeries series = new TrainingSeries();
        series.setRrule(req.recurrence.rrule);
        if (req.recurrence.timezone != null && !req.recurrence.timezone.isBlank()) series.setTimezone(req.recurrence.timezone);
        series.setStartTime(base.getTrainingTime());
        series.setEndTime(base.getTrainingEndTime()!=null? base.getTrainingEndTime(): base.getTrainingTime());
        series.setUntil(req.recurrence.until);
        series.setCount(req.recurrence.count);
        series = service.createSeries(series);
        // Generate occurrences
        java.util.List<Training> occ = service.generateOccurrences(series, () -> {
            Training t = new Training();
            t.setTitle(base.getTitle());
            t.setDescription(base.getDescription());
            t.setTrainingTime(base.getTrainingTime());
            t.setTrainingEndTime(base.getTrainingEndTime());
            t.setVisibleToAthletes(base.isVisibleToAthletes());
            t.setPreNotificationMinutes(base.getPreNotificationMinutes());
            t.setPreQuestionnaire(base.getPreQuestionnaire());
            t.setPostQuestionnaire(base.getPostQuestionnaire());
            t.setCreatedBy(base.getCreatedBy());
            t.setGroups(new java.util.HashSet<>(base.getGroups()));
            return t;
        });
        // Persist: delete original base training (will be recreated as first occurrence)
        service.delete(base.getId());
        Training first = null;
        for (Training o : occ){
            Training saved = service.save(o);
            if (first == null) first = saved;
        }
        return toDTO(first);
    }

    // Reattach a detached (edited) occurrence back to its series so future series-level changes include it again.
    @PreAuthorize("hasAnyRole('TRAINER','ADMIN','SUPERADMIN')")
    @PostMapping("/{id}/reattach")
    public TrainingDtos.TrainingDTO reattach(@PathVariable Long id, @RequestBody(required=false) TrainingDtos.ReattachOccurrenceRequest body, Authentication auth){
        Training occ = service.get(id);
        if (occ.getSeries()==null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Training not part of a series");
        if (!occ.isDetached()) return toDTO(occ); // nothing to do
        // permission: must be admin-like or trainer assigned to at least one group
        var caller = userRepository.findByEmailIgnoreCase(auth.getName()).orElseThrow();
        boolean isAdminLike = caller.getRoles().stream().anyMatch(r -> {
            String n = r.getName().name(); return n.equals("ROLE_ADMIN") || n.equals("ROLE_SUPERADMIN");
        });
        if (!isAdminLike) {
            boolean trainerAssigned = occ.getGroups()!=null && occ.getGroups().stream().anyMatch(g -> g.getTrainers().stream().anyMatch(u -> u.getId().equals(caller.getId())));
            if (!trainerAssigned) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not allowed to reattach this occurrence");
        }
        boolean reset = body != null && body.resetFieldsToSeries;
        if (reset){
            Training first = service.firstOccurrence(occ.getSeries().getId());
            if (first != null){
                occ.setTitle(first.getTitle());
                occ.setDescription(first.getDescription());
                // Adjust time difference: keep original offset from first occurrence start if desired? Simpler: align times to current occ's existing times unchanged.
                // We only reset content fields; times remain as-is to avoid shifting schedule unexpectedly.
                occ.setVisibleToAthletes(first.isVisibleToAthletes());
                occ.setPreNotificationMinutes(first.getPreNotificationMinutes());
                occ.setPreQuestionnaire(first.getPreQuestionnaire());
                occ.setPostQuestionnaire(first.getPostQuestionnaire());
            }
        }
        occ.setDetached(false);
        return toDTO(service.save(occ));
    }

    private void handleSeriesDeleteScope(Training t, String scope){
        if (t.getSeries() == null || t.isDetached() || scope == null || scope.isBlank() || scope.equalsIgnoreCase("THIS")){
            service.delete(t.getId());
            return;
        }
        if (scope.equalsIgnoreCase("FUTURE")){
            service.deleteFutureOccurrences(t);
            return;
        }
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid scope");
    }

    // Attachments
    @PreAuthorize("hasAnyRole('TRAINER','ADMIN','SUPERADMIN')")
    @PostMapping(path="/{id}/attachments", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public Attachment uploadAttachment(Authentication auth, @PathVariable Long id, @RequestPart MultipartFile file) throws IOException{
        var t = service.get(id);
        // Only allow admins or trainers assigned to the training to upload
        var caller = userRepository.findByEmailIgnoreCase(auth.getName()).orElseThrow();
    boolean isAdmin = caller.getRoles().stream().anyMatch(r -> r.getName().name().equals("ROLE_ADMIN") || r.getName().name().equals("ROLE_SUPERADMIN"));
    boolean trainerAssigned = t.getGroups() != null && t.getGroups().stream().anyMatch(g -> g.getTrainers().stream().anyMatch(u -> u.getId().equals(caller.getId())));
    boolean isOwner = t.getCreatedBy() != null && t.getCreatedBy().getId().equals(caller.getId());
    if (!isAdmin && !trainerAssigned && !isOwner){ throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not allowed to upload attachment for this training"); }

        // sanitize original filename and store using a safe generated name (UUID + original extension)
        String original = file.getOriginalFilename() != null ? Paths.get(file.getOriginalFilename()).getFileName().toString() : "file";
        String ext = "";
        int idx = original.lastIndexOf('.');
        if (idx >= 0) ext = original.substring(idx);
        String storedName = UUID.randomUUID().toString() + ext;

        Path base = Paths.get(uploadsDir).toAbsolutePath().normalize();
        Path dir = base.resolve(String.valueOf(id)).normalize();
        Files.createDirectories(dir);
        Path dst = dir.resolve(storedName).normalize();
        // ensure path stays within uploads directory
        if (!dst.startsWith(base)) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid file path");

        file.transferTo(dst.toFile());
        Attachment a = new Attachment();
        a.setFilename(original);
        a.setContentType(file.getContentType());
        a.setPath(dst.toString());
        a.setTraining(t);
        return attachmentRepository.save(a);
    }

    @GetMapping("/{id}/attachments")
    public java.util.List<Attachment> listAttachments(Authentication auth, @PathVariable Long id){
        var t = service.get(id);
        var caller = userRepository.findByEmailIgnoreCase(auth.getName()).orElseThrow();
    boolean isAdmin = caller.getRoles().stream().anyMatch(r -> r.getName().name().equals("ROLE_ADMIN") || r.getName().name().equals("ROLE_SUPERADMIN"));
    boolean trainerAssigned = t.getGroups() != null && t.getGroups().stream().anyMatch(g -> g.getTrainers().stream().anyMatch(u -> u.getId().equals(caller.getId())));
    boolean isOwner = t.getCreatedBy() != null && t.getCreatedBy().getId().equals(caller.getId());
        boolean athleteInGroup = caller.getGroupEntity() != null && t.getGroups() != null && t.getGroups().stream().anyMatch(g -> g.getId().equals(caller.getGroupEntity().getId()));
        // Admins and assigned trainers can always view attachments. Athletes can view attachments only if they belong to a training group and the training is visible to athletes.
    if (isAdmin || trainerAssigned || isOwner) return attachmentRepository.findByTraining(t);
        if (athleteInGroup) {
            if (!t.isVisibleToAthletes()) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Attachments are not visible for athletes for this training");
            return attachmentRepository.findByTraining(t);
        }
        throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not allowed to view attachments for this training");
    }

    @GetMapping("/attachments/{attachmentId}")
    public ResponseEntity<InputStreamResource> download(Authentication auth, @PathVariable Long attachmentId){
        Attachment a = attachmentRepository.findById(attachmentId).orElseThrow();
        Training t = a.getTraining();
        var caller = userRepository.findByEmailIgnoreCase(auth.getName()).orElseThrow();
        boolean isAdmin = caller.getRoles().stream().anyMatch(r -> r.getName().name().equals("ROLE_ADMIN") || r.getName().name().equals("ROLE_SUPERADMIN"));
        boolean trainerAssigned = t.getGroups() != null && t.getGroups().stream().anyMatch(g -> g.getTrainers().stream().anyMatch(u -> u.getId().equals(caller.getId())));
        boolean athleteInGroup = caller.getGroupEntity() != null && t.getGroups() != null && t.getGroups().stream().anyMatch(g -> g.getId().equals(caller.getGroupEntity().getId()));
        boolean isOwner = t.getCreatedBy() != null && t.getCreatedBy().getId().equals(caller.getId());
        if (!(isAdmin || trainerAssigned || isOwner || (athleteInGroup && t.isVisibleToAthletes()))) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not allowed to download this attachment");
        }

        Path base = Paths.get(uploadsDir).toAbsolutePath().normalize();
        Path filePath = Paths.get(a.getPath()).toAbsolutePath().normalize();
        if (!filePath.startsWith(base) || !Files.exists(filePath)) return ResponseEntity.notFound().build();
        try {
            InputStreamResource resource = new InputStreamResource(Files.newInputStream(filePath));
            String filename = a.getFilename() != null ? a.getFilename() : "attachment";
            String disp = "attachment; filename=\"" + URLEncoder.encode(filename, StandardCharsets.UTF_8.toString()).replaceAll("\\+", "%20") + "\"";
            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(a.getContentType()!=null ? a.getContentType(): "application/octet-stream"))
                    .header("Content-Disposition", disp)
                    .body(resource);
        } catch (IOException e){
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(null);
        }
    }

    @PreAuthorize("hasAnyRole('TRAINER','ADMIN','SUPERADMIN')")
    @DeleteMapping("/attachments/{attachmentId}")
    public void deleteAttachment(Authentication auth, @PathVariable Long attachmentId){
        Attachment a = attachmentRepository.findById(attachmentId).orElseThrow();
        Training t = a.getTraining();
        var caller = userRepository.findByEmailIgnoreCase(auth.getName()).orElseThrow();
        boolean isAdmin = caller.getRoles().stream().anyMatch(r -> r.getName().name().equals("ROLE_ADMIN") || r.getName().name().equals("ROLE_SUPERADMIN"));
        boolean trainerAssigned = t.getGroups() != null && t.getGroups().stream().anyMatch(g -> g.getTrainers().stream().anyMatch(u -> u.getId().equals(caller.getId())));
        boolean isOwner = t.getCreatedBy() != null && t.getCreatedBy().getId().equals(caller.getId());
        if (!(isAdmin || trainerAssigned || isOwner)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not allowed to delete this attachment");
        }
        try { Files.deleteIfExists(Paths.get(a.getPath())); } catch (Exception ignored){}
        attachmentRepository.deleteById(attachmentId);
    }

    @PreAuthorize("hasRole('TRAINER')")
    @GetMapping("/mine")
    public List<Training> myTrainings(Authentication auth){
        // find trainings where authenticated trainer is assigned to one of the training groups
        return service.all().stream()
                .filter(t -> t.getGroups() != null && t.getGroups().stream().anyMatch(g -> g.getTrainers().stream().anyMatch(u -> u.getEmail().equalsIgnoreCase(auth.getName()))))
                .toList();
    }

    @PreAuthorize("hasAnyRole('TRAINER','ADMIN','SUPERADMIN')")
    @PostMapping("/{id}/assign-groups")
    public Training assign(@PathVariable Long id, @RequestBody TrainingDtos.AssignGroupsRequest req){
        return service.assignGroups(id, req.groupIds);
    }

    @PreAuthorize("hasAnyRole('TRAINER','ADMIN','SUPERADMIN')")
    @PostMapping("/{id}/set-questionnaires")
    public Training setQuestionnaires(@PathVariable Long id, @RequestParam(required=false) Long preId, @RequestParam(required=false) Long postId){
        return service.setQuestionnaires(id, preId, postId);
    }

    @PreAuthorize("hasAnyRole('TRAINER','ADMIN','SUPERADMIN')")
    @Transactional(readOnly = true)
    @GetMapping("/{id}/questionnaire-responses")
    public java.util.Map<String, java.util.List<java.util.Map<String,Object>>> getQuestionnaireResponses(@PathVariable Long id){
        Training t = service.get(id);
        java.util.List<QuestionnaireResponse> list = responseService.byTraining(t);
        java.util.List<java.util.Map<String,Object>> pre = new java.util.ArrayList<>();
        java.util.List<java.util.Map<String,Object>> post = new java.util.ArrayList<>();
        ObjectMapper om = responseService.getObjectMapper();
        Long preId = t.getPreQuestionnaire() != null ? t.getPreQuestionnaire().getId() : null;
        Long postId = t.getPostQuestionnaire() != null ? t.getPostQuestionnaire().getId() : null;
        for (QuestionnaireResponse r : list){
            java.util.Map<String,Object> m = new java.util.HashMap<>();
            m.put("id", r.getId());
            User u = r.getUser();
            java.util.Map<String,Object> uMap = new java.util.HashMap<>();
            uMap.put("id", u.getId()); uMap.put("firstName", u.getFirstName()); uMap.put("lastName", u.getLastName()); uMap.put("email", u.getEmail());
            m.put("user", uMap);
            m.put("submittedAt", r.getSubmittedAt());
            try {
                JsonNode node = om.readTree(r.getResponses());
                m.put("responses", node);
            } catch (Exception e){
                m.put("responses", r.getResponses());
            }
            m.put("questionnaireId", r.getQuestionnaire() != null ? r.getQuestionnaire().getId() : null);
            if (preId != null && r.getQuestionnaire() != null && preId.equals(r.getQuestionnaire().getId())) pre.add(m);
            else if (postId != null && r.getQuestionnaire() != null && postId.equals(r.getQuestionnaire().getId())) post.add(m);
        }
        java.util.Map<String, java.util.List<java.util.Map<String,Object>>> res = new java.util.HashMap<>();
        res.put("pre", pre); res.put("post", post);
        return res;
    }

    // Aggregations endpoint removed (replaced by dedicated analytics section)

    // Attendance endpoints
    @PreAuthorize("hasAnyRole('TRAINER','ADMIN','SUPERADMIN')")
    @PostMapping("/{id}/attendance")
    public java.util.Map<String,Object> setAttendance(Authentication auth, @PathVariable Long id, @RequestBody java.util.Map<String,Object> body){
        Training t = service.get(id);
        User caller = userRepository.findByEmailIgnoreCase(auth.getName()).orElseThrow();
        boolean isAdmin = caller.getRoles().stream().anyMatch(r -> r.getName().name().equals("ROLE_ADMIN") || r.getName().name().equals("ROLE_SUPERADMIN"));
        // trainers must be assigned to at least one training group
        boolean trainerAssigned = t.getGroups() != null && t.getGroups().stream().anyMatch(g -> g.getTrainers().stream().anyMatch(u -> u.getId().equals(caller.getId())));
        if (!(isAdmin || trainerAssigned)) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not allowed to set attendance for this training");
        Object uid = body.get("userId"); Object pres = body.get("present");
        if (uid == null || pres == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "userId and present required");
        Long userId = Long.valueOf(uid.toString()); boolean present = Boolean.parseBoolean(pres.toString());
        User athlete = userRepository.findById(userId).orElseThrow();
        // ensure athlete is part of one of the training groups
        Group ag = athlete.getGroupEntity();
        if (ag == null || t.getGroups().stream().noneMatch(g -> g.getId().equals(ag.getId()))) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Athlete not part of a training group");
        var ta = attendanceService.setPresence(t, athlete, present);
        return java.util.Map.of("id", ta.getId(), "trainingId", t.getId(), "userId", athlete.getId(), "present", ta.isPresent());
    }

    // Roster for a training: eligible athletes (union of groups) with current presence
    @PreAuthorize("hasAnyRole('TRAINER','ADMIN','SUPERADMIN')")
    @org.springframework.transaction.annotation.Transactional
    @GetMapping("/{id}/attendance")
    public java.util.List<java.util.Map<String,Object>> getAttendanceRoster(Authentication auth, @PathVariable Long id){
        Training t = service.get(id);
        User caller = userRepository.findByEmailIgnoreCase(auth.getName()).orElseThrow();
        boolean isAdmin = caller.getRoles().stream().anyMatch(r -> r.getName().name().equals("ROLE_ADMIN") || r.getName().name().equals("ROLE_SUPERADMIN"));
        boolean trainerAssigned = t.getGroups() != null && t.getGroups().stream().anyMatch(g -> g.getTrainers().stream().anyMatch(u -> u.getId().equals(caller.getId())));
        if (!(isAdmin || trainerAssigned)) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not allowed to view attendance for this training");

        // Map existing attendance for quick lookup
        var existing = attendanceService.byTraining(t).stream().collect(java.util.stream.Collectors.toMap(a -> a.getUser().getId(), a -> a.isPresent(), (a,b)->a));

        java.util.Map<Long, java.util.Map<String,Object>> byUser = new java.util.HashMap<>();
        for (var g : t.getGroups()){
            for (var a : g.getAthletes()){
                if (a == null) continue;
                Long uid = a.getId();
                if (!byUser.containsKey(uid)){
                    String gName = a.getGroupEntity()!=null ? a.getGroupEntity().getName() : (g!=null? g.getName() : null);
                    Long gid = a.getGroupEntity()!=null ? a.getGroupEntity().getId() : (g!=null? g.getId() : null);
                    java.util.Map<String,Object> row = new java.util.HashMap<>();
                    row.put("userId", uid);
                    row.put("firstName", a.getFirstName());
                    row.put("lastName", a.getLastName());
                    row.put("email", a.getEmail());
                    row.put("groupId", gid);
                    row.put("groupName", gName);
                    row.put("present", existing.getOrDefault(uid, false));
                    byUser.put(uid, row);
                } else {
                    // already added from another group; leave as-is (union)
                }
            }
        }
        var list = new java.util.ArrayList<>(byUser.values());
        list.sort((a,b) -> (a.getOrDefault("lastName","\u007f").toString()+" "+a.getOrDefault("firstName","\u007f")).compareToIgnoreCase(b.getOrDefault("lastName","\u007f").toString()+" "+b.getOrDefault("firstName","\u007f")));
        return list;
    }

    @PreAuthorize("hasAnyRole('TRAINER','ADMIN','SUPERADMIN')")
    @GetMapping("/{id}/attendance/rate")
    public java.util.Map<String,Object> trainingPresenceRate(@PathVariable Long id){
        Training t = service.get(id);
        double rate = attendanceService.trainingPresenceRate(t);
        return java.util.Map.of("trainingId", t.getId(), "presenceRate", rate);
    }

    // athlete presence rate across group trainings
    @PreAuthorize("hasAnyRole('TRAINER','ADMIN','SUPERADMIN')")
    @GetMapping("/attendance/athlete/{userId}/rate")
    public java.util.Map<String,Object> athletePresenceRate(@PathVariable Long userId){
        User athlete = userRepository.findById(userId).orElseThrow();
        double rate = attendanceService.athletePresenceRate(athlete);
        return java.util.Map.of("userId", athlete.getId(), "presenceRate", rate);
    }

    // Bulk attendance actions for a training: presentAll, absentAll, invert; optional groupId filter
    @PreAuthorize("hasAnyRole('TRAINER','ADMIN','SUPERADMIN')")
    @Transactional
    @PostMapping("/{id}/attendance/bulk")
    public java.util.Map<String,Object> bulkAttendance(Authentication auth, @PathVariable Long id, @RequestBody java.util.Map<String,Object> body){
        Training t = service.get(id);
        User caller = userRepository.findByEmailIgnoreCase(auth.getName()).orElseThrow();
        boolean isAdmin = caller.getRoles().stream().anyMatch(r -> r.getName().name().equals("ROLE_ADMIN") || r.getName().name().equals("ROLE_SUPERADMIN"));
        boolean trainerAssigned = t.getGroups() != null && t.getGroups().stream().anyMatch(g -> g.getTrainers().stream().anyMatch(u -> u.getId().equals(caller.getId())));
        if (!(isAdmin || trainerAssigned)) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not allowed to set attendance for this training");

        String action = String.valueOf(body.getOrDefault("action", "")).trim();
        Long groupId = null; if (body.get("groupId") != null) { try { groupId = Long.valueOf(String.valueOf(body.get("groupId"))); } catch (Exception ignored) {} }
        if (!("presentAll".equals(action) || "absentAll".equals(action) || "invert".equals(action)))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid action");

        // Determine target athletes: union of training groups, optionally filter by one group id
        Set<User> targets = new HashSet<>();
        for (var g : t.getGroups()){ if (groupId == null || g.getId().equals(groupId)) targets.addAll(g.getAthletes()); }
        if (targets.isEmpty()) return java.util.Map.of("updated", 0);

        // Build quick lookup for existing attendance for invert
        var existing = attendanceService.byTraining(t).stream().collect(Collectors.toMap(ta -> ta.getUser().getId(), ta -> ta.isPresent(), (a,b)->a));
        int updated = 0;
        for (User a : targets){
            boolean desired;
            if ("presentAll".equals(action)) desired = true;
            else if ("absentAll".equals(action)) desired = false;
            else { // invert: missing counts as absent -> becomes present
                boolean cur = existing.getOrDefault(a.getId(), false);
                desired = !cur;
            }
            attendanceService.setPresence(t, a, desired); updated++;
        }
        return java.util.Map.of("updated", updated);
    }
}
