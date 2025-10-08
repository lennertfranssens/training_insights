package com.traininginsights.service;

import com.traininginsights.model.Group;
import com.traininginsights.model.Questionnaire;
import com.traininginsights.model.Training;
import com.traininginsights.repository.GroupRepository;
import com.traininginsights.repository.TrainingSeriesRepository;
import com.traininginsights.model.TrainingSeries;
import com.traininginsights.repository.QuestionnaireRepository;
import com.traininginsights.repository.TrainingRepository;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
public class TrainingService {
    private final TrainingRepository repo;
    private final GroupRepository groupRepo;
    private final TrainingSeriesRepository seriesRepo;
    private final QuestionnaireRepository qRepo;
    private final com.traininginsights.repository.AttachmentRepository attachmentRepo;
    private final String uploadsDir;

    public TrainingService(TrainingRepository repo, GroupRepository groupRepo, QuestionnaireRepository qRepo, TrainingSeriesRepository seriesRepo, com.traininginsights.repository.AttachmentRepository attachmentRepo, @org.springframework.beans.factory.annotation.Value("${app.uploadsDir:uploads}") String uploadsDir) {
        this.repo = repo; this.groupRepo = groupRepo; this.qRepo = qRepo; this.seriesRepo = seriesRepo; this.attachmentRepo = attachmentRepo; this.uploadsDir = uploadsDir;
    }

    public List<Training> all(){ return repo.findAll(); }
    public Training get(Long id){ return repo.findById(id).orElseThrow(); }
    public List<Training> findByGroupId(Long groupId){ return repo.findByGroups_Id(groupId); }
    public boolean existsByIdAndGroupId(Long id, Long groupId){ return repo.existsByIdAndGroups_Id(id, groupId); }
    public Training save(Training t){
        // compute notificationTime if preNotificationMinutes and trainingTime provided
        if (t.getTrainingTime() != null && t.getPreNotificationMinutes() != null && t.getPreNotificationMinutes() > 0){
            t.setNotificationTime(t.getTrainingTime().minusSeconds(t.getPreNotificationMinutes() * 60L));
        } else {
            t.setNotificationTime(null);
        }
        Training saved = repo.save(t);
        return saved;
    }
    public void delete(Long id){
        var opt = repo.findById(id);
        if (opt.isEmpty()) return;
        Training t = opt.get();
        try {
            // Collect and remove attachment files from disk before deleting entity (cascade removes DB rows)
            java.util.List<com.traininginsights.model.Attachment> atts = attachmentRepo.findByTraining(t);
            for (var a : atts){
                try {
                    if (a.getPath()!=null && !a.getPath().isBlank()) {
                        java.nio.file.Path base = java.nio.file.Paths.get(uploadsDir).toAbsolutePath().normalize();
                        java.nio.file.Path p = base.resolve(a.getPath()).normalize();
                        if (p.startsWith(base)) java.nio.file.Files.deleteIfExists(p);
                    }
                } catch (Exception ignored) {}
            }
        } catch (Exception ignored) {}
        repo.delete(t); // cascades remove attachments
    }

    public List<Training> upcomingForGroup(Group group){
        return repo.findUpcomingForGroup(group, Instant.now());
    }

    public List<Training> allForGroup(Group group){
        return repo.findAllForGroup(group);
    }

    public Training assignGroups(Long trainingId, Set<Long> groupIds){
        Training t = get(trainingId);
        Set<Group> gs = new HashSet<>(groupRepo.findAllById(groupIds));
        if (t.getSeries()!=null){
            Long seriesId = t.getSeries().getId();
            for (Training occ : repo.findBySeries_Id(seriesId)){
                if (occ.isGroupDetached()) continue; // skip detached occurrences
                occ.setGroups(gs);
                repo.save(occ);
            }
            return get(trainingId);
        } else {
            t.setGroups(gs);
            return repo.save(t);
        }
    }

    @org.springframework.transaction.annotation.Transactional
    public Training setQuestionnaires(Long trainingId, Long preId, Long postId){
        Training t = get(trainingId);
        if (preId != null && postId != null && preId.equals(postId)) {
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST, "Pre and post questionnaires cannot be the same");
        }
        Questionnaire pre = preId != null ? qRepo.findById(preId).orElse(null) : null;
        Questionnaire post = postId != null ? qRepo.findById(postId).orElse(null) : null;
        if (t.getSeries() != null) {
            Long seriesId = t.getSeries().getId();
            for (Training occ : repo.findBySeries_Id(seriesId)) {
                boolean detached = occ.isDetached();
                boolean hasAny = occ.getPreQuestionnaire() != null || occ.getPostQuestionnaire() != null;
                if (detached && hasAny) continue; // preserve custom questionnaires on already customized detached occurrence
                // For non-detached or detached without questionnaires yet, apply
                occ.setPreQuestionnaire(pre);
                occ.setPostQuestionnaire(post);
                repo.save(occ);
            }
            return get(trainingId);
        } else {
            t.setPreQuestionnaire(pre);
            t.setPostQuestionnaire(post);
            return repo.save(t);
        }
    }

    // --- Recurrence helpers (skeleton; detailed generation logic to be filled) ---
    public TrainingSeries createSeries(TrainingSeries s){ return seriesRepo.save(s); }

    public java.util.List<Training> generateOccurrences(TrainingSeries series, java.util.function.Supplier<Training> baseSupplier){
        java.util.List<Training> list = new java.util.ArrayList<>();
        java.time.Duration duration = java.time.Duration.between(series.getStartTime(), series.getEndTime());
        // Parse RRULE
        RecurrenceUtil.RRule rule = RecurrenceUtil.parse(series.getRrule(), series.getUntil(), series.getCount());
        java.time.ZonedDateTime seed = java.time.ZonedDateTime.ofInstant(series.getStartTime(), java.time.ZoneId.of(series.getTimezone()));
        java.util.List<java.time.ZonedDateTime> starts = RecurrenceUtil.expand(rule, seed);
        int seq = 1;
        for (java.time.ZonedDateTime zdt : starts){
            Training t = baseSupplier.get();
            t.setSeries(series);
            t.setSeriesSequence(seq++);
            java.time.Instant startI = zdt.toInstant();
            t.setTrainingTime(startI);
            if (!duration.isNegative() && !duration.isZero()){
                t.setTrainingEndTime(startI.plusSeconds(duration.getSeconds()));
            } else {
                t.setTrainingEndTime(startI);
            }
            list.add(t);
        }
        return list;
    }

    public void deleteFutureOccurrences(Training pivot){
        if (pivot.getSeries() == null || pivot.getSeriesSequence()==null){
            repo.deleteById(pivot.getId());
            return;
        }
        Long seriesId = pivot.getSeries().getId();
        Integer seq = pivot.getSeriesSequence();
        for (Training t : repo.findBySeries_IdAndSeriesSequenceGreaterThanEqual(seriesId, seq)){
            repo.delete(t);
        }
    }

    public List<Training> futureAndCurrentFrom(Training pivot){
        if (pivot.getSeries()==null || pivot.getSeriesSequence()==null){
            return java.util.List.of(pivot);
        }
        return repo.findBySeries_IdAndSeriesSequenceGreaterThanEqual(pivot.getSeries().getId(), pivot.getSeriesSequence());
    }

    public List<Training> allInSeries(Long seriesId){
        return repo.findBySeries_Id(seriesId);
    }

    public List<Group> fetchGroups(Set<Long> ids){
        return groupRepo.findAllById(ids);
    }

    public TrainingRepository getTrainingRepository(){ return repo; }

    public Training firstOccurrence(Long seriesId){
        return repo.findFirstBySeries_IdAndSeriesSequence(seriesId, 1);
    }

    // Recurrence summary helpers
    public com.traininginsights.dto.TrainingDtos.RecurrenceSummary buildSummary(Training t){
        if (t.getSeries()==null){
            return null;
        }
        var s = t.getSeries();
        com.traininginsights.dto.TrainingDtos.RecurrenceSummary rs = new com.traininginsights.dto.TrainingDtos.RecurrenceSummary();
        rs.rrule = s.getRrule();
        long totalL = repo.countBySeries_Id(s.getId());
        rs.totalOccurrences = (int)Math.min(Integer.MAX_VALUE, totalL);
        long remainingL = repo.countBySeries_IdAndSeriesSequenceGreaterThanEqual(s.getId(), t.getSeriesSequence()!=null? t.getSeriesSequence():1);
        rs.remainingOccurrences = (int)Math.min(Integer.MAX_VALUE, remainingL);
        rs.hasFuture = remainingL > 1; // more than current occurrence
        // Build a human-readable description
        try {
            RecurrenceUtil.RRule rule = RecurrenceUtil.parse(s.getRrule(), s.getUntil(), s.getCount());
            StringBuilder sb = new StringBuilder();
            String freq = rule.freq();
            int interval = rule.interval();
            java.time.format.TextStyle ts = java.time.format.TextStyle.SHORT;
            switch (freq) {
                case "DAILY" -> {
                    sb.append("Every");
                    if (interval==1) sb.append(" day"); else sb.append(" ").append(interval).append(" days");
                }
                case "WEEKLY" -> {
                    sb.append("Every");
                    if (interval==1) sb.append(" week"); else sb.append(" ").append(interval).append(" weeks");
                    if (!rule.byDay().isEmpty()) {
                        sb.append(" on ");
                        sb.append(rule.byDay().stream().map(d -> d.getDisplayName(ts, java.util.Locale.getDefault())).sorted().reduce((a,b)->a+", "+b).orElse(""));
                    }
                }
                case "MONTHLY" -> {
                    sb.append("Every");
                    if (interval==1) sb.append(" month"); else sb.append(" ").append(interval).append(" months");
                }
                case "YEARLY" -> {
                    sb.append("Every");
                    if (interval==1) sb.append(" year"); else sb.append(" ").append(interval).append(" years");
                }
                default -> sb.append(freq);
            }
            if (rule.count()!=null) {
                sb.append(" (" + rule.count() + " occurrences)");
            } else if (rule.until()!=null) {
                java.time.ZonedDateTime untilZ = java.time.ZonedDateTime.ofInstant(rule.until(), java.time.ZoneOffset.UTC);
                sb.append(" until ").append(untilZ.toLocalDate());
            }
            rs.description = sb.toString();
        } catch (Exception ignored) {}
        return rs;
    }
}
