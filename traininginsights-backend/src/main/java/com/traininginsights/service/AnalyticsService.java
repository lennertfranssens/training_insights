package com.traininginsights.service;

import com.traininginsights.model.Group;
import com.traininginsights.model.Training;
import com.traininginsights.repository.GroupRepository;
import com.traininginsights.repository.TrainingRepository;
import com.traininginsights.repository.UserRepository;
import com.traininginsights.repository.ClubRepository;
import com.traininginsights.repository.TrainingAttendanceRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;

import java.time.*;
import java.util.List;
import java.util.Map;

@Service
public class AnalyticsService {
    private final TrainingRepository trainingRepository;
    private final GroupRepository groupRepository;
    private final QuestionnaireResponseService responseService;
    private final UserRepository userRepository;
    private final ClubRepository clubRepository;
    private final EntityManager em;
    private final TrainingAttendanceRepository attendanceRepo;

    public AnalyticsService(TrainingRepository trainingRepository, GroupRepository groupRepository, QuestionnaireResponseService responseService, UserRepository userRepository, ClubRepository clubRepository, EntityManager em, TrainingAttendanceRepository attendanceRepo) {
        this.trainingRepository = trainingRepository;
        this.groupRepository = groupRepository;
        this.responseService = responseService;
        this.userRepository = userRepository;
        this.clubRepository = clubRepository;
        this.em = em;
        this.attendanceRepo = attendanceRepo;
    }

    /**
     * Placeholder: compute average of numeric field "soreness" across post-training questionnaire responses
     * for trainings in the given ISO week.
     */
    @Transactional(readOnly = true)
    public double getGroupSorenessAverage(Long groupId, int year, int isoWeek) {
        Group g = groupRepository.findById(groupId).orElseThrow();
        // determine week range in Instant
        LocalDate firstDay = LocalDate.now().withYear(year).with(java.time.temporal.WeekFields.ISO.weekOfYear(), isoWeek)
                .with(java.time.temporal.WeekFields.ISO.dayOfWeek(), 1);
        LocalDate lastDay = firstDay.plusDays(6);
        Instant from = firstDay.atStartOfDay(ZoneOffset.UTC).toInstant();
        Instant to = lastDay.plusDays(1).atStartOfDay(ZoneOffset.UTC).toInstant();

        // naive: iterate trainings and collect responses
        double sum = 0; int cnt = 0;
        for (Training t : trainingRepository.findAll()) {
            if (!t.getGroups().contains(g)) continue;
            if (t.getTrainingTime() == null || t.getTrainingTime().isBefore(from) || t.getTrainingTime().isAfter(to)) continue;
            if (t.getPostQuestionnaire() == null) continue;
            var responses = responseService.byTraining(t);
            double avg = responseService.extractNumericFieldAverage(responses, "soreness");
            if (avg > 0) { sum += avg; cnt++; }
        }
        return cnt==0 ? 0.0 : sum/cnt;
    }

    /**
     * Presence aggregation: compute presence rates (0..1) aggregated by dimension (athlete|group|club|all)
     * and by period (day|week|month|training) based on trainings and attendance records.
     * Returns rows: { key, period, value, numerator, denominator }
     */
    @Transactional(readOnly = true)
    public java.util.List<java.util.Map<String,Object>> presenceAggregate(String dimension, String granularity, Long groupId, Long clubId, String startIso, String endIso, java.util.Set<Long> allowedGroupIds) {
        String safeDimension = switch (String.valueOf(dimension)) {
            case "athlete", "group", "club", "all" -> dimension; default -> "all"; };
        String safeGranularity = switch (String.valueOf(granularity)) {
            case "day", "week", "month", "training" -> granularity; default -> "day"; };

        java.time.Instant start = null, end = null;
        try { if (startIso != null && !startIso.isBlank()) start = java.time.Instant.parse(startIso); } catch (Exception ignored) {}
        try { if (endIso != null && !endIso.isBlank()) end = java.time.Instant.parse(endIso); } catch (Exception ignored) {}

        // If trainer and allowed groups are explicitly empty, short-circuit
        if (groupId == null && allowedGroupIds != null && allowedGroupIds.isEmpty()) return java.util.List.of();

        // bucket: (key|period) -> { num, den }
        java.util.Map<String, long[]> buckets = new java.util.HashMap<>();

        for (com.traininginsights.model.Training t : trainingRepository.findAll()) {
            if (t.getTrainingTime() == null) continue;
            if (start != null && t.getTrainingTime().isBefore(start)) continue;
            if (end != null && t.getTrainingTime().isAfter(end)) continue;
            // group filter
            if (groupId != null) {
                boolean inGroup = t.getGroups() != null && t.getGroups().stream().anyMatch(g -> g.getId().equals(groupId));
                if (!inGroup) continue;
            }
            // allowed groups filter (for trainers without an explicit groupId)
            if (groupId == null && allowedGroupIds != null) {
                boolean intersects = t.getGroups() != null && t.getGroups().stream().anyMatch(g -> allowedGroupIds.contains(g.getId()));
                if (!intersects) continue;
            }
            // club filter
            if (clubId != null) {
                boolean inClub = t.getGroups() != null && t.getGroups().stream().anyMatch(g -> g.getClubs() != null && g.getClubs().stream().anyMatch(c -> c.getId().equals(clubId)));
                if (!inClub) continue;
            }

            // derive eligible athletes for the training (union of training groups' athletes)
            java.util.Set<Long> eligible = new java.util.HashSet<>();
            if (t.getGroups() != null) {
                for (var g : t.getGroups()) {
                    if (g.getAthletes() != null) for (var a : g.getAthletes()) eligible.add(a.getId());
                }
            }
            if (eligible.isEmpty()) continue; // no denominator -> skip

            // map attendance for quick lookup
            java.util.List<com.traininginsights.model.TrainingAttendance> atts = attendanceRepo.findByTraining(t);
            java.util.Set<Long> present = new java.util.HashSet<>();
            for (var ta : atts) if (ta.isPresent()) present.add(ta.getUser().getId());

            // build period string
            java.time.ZonedDateTime z = java.time.ZonedDateTime.ofInstant(t.getTrainingTime(), java.time.ZoneId.systemDefault());
            String period;
            switch (safeGranularity) {
                case "day": period = z.toLocalDate().toString(); break;
                case "week": {
                    int week = z.get(java.time.temporal.IsoFields.WEEK_OF_WEEK_BASED_YEAR);
                    int year = z.get(java.time.temporal.IsoFields.WEEK_BASED_YEAR);
                    period = year + "-" + String.format("%02d", week); break; }
                case "month": period = z.getYear() + "-" + String.format("%02d", z.getMonthValue()); break;
                case "training": period = String.valueOf(t.getId()); break;
                default: period = z.toLocalDate().toString();
            }

            switch (safeDimension) {
                case "athlete":
                    for (Long uid : eligible) {
                        String key = String.valueOf(uid);
                        String composite = key + "|" + period;
                        long[] agg = buckets.computeIfAbsent(composite, k -> new long[]{0L,0L});
                        agg[1] += 1; // denominator: one expected opportunity for this athlete
                        if (present.contains(uid)) agg[0] += 1; // numerator
                    }
                    break;
                case "group": {
                    String key = (t.getGroups()!=null && !t.getGroups().isEmpty()) ? String.valueOf(t.getGroups().iterator().next().getId()) : "nogroup";
                    String composite = key + "|" + period;
                    long[] agg = buckets.computeIfAbsent(composite, k -> new long[]{0L,0L});
                    agg[1] += eligible.size();
                    long num = present.stream().filter(eligible::contains).count();
                    agg[0] += num;
                    break;
                }
                case "club": {
                    String key = (t.getGroups()!=null && !t.getGroups().isEmpty() && t.getGroups().iterator().next().getClubs()!=null && !t.getGroups().iterator().next().getClubs().isEmpty())
                            ? String.valueOf(t.getGroups().iterator().next().getClubs().iterator().next().getId())
                            : "noclub";
                    String composite = key + "|" + period;
                    long[] agg = buckets.computeIfAbsent(composite, k -> new long[]{0L,0L});
                    agg[1] += eligible.size();
                    long num = present.stream().filter(eligible::contains).count();
                    agg[0] += num;
                    break;
                }
                default: { // all
                    String composite = "all|" + period;
                    long[] agg = buckets.computeIfAbsent(composite, k -> new long[]{0L,0L});
                    agg[1] += eligible.size();
                    long num = present.stream().filter(eligible::contains).count();
                    agg[0] += num;
                }
            }
        }

        java.util.List<java.util.Map<String,Object>> out = new java.util.ArrayList<>();
        for (var e : buckets.entrySet()) {
            String[] parts = e.getKey().split("\\|", 2);
            String key = parts[0]; String period = parts.length>1?parts[1]:"";
            long[] agg = e.getValue();
            long num = agg[0]; long den = agg[1];
            double val = den>0 ? ((double) num)/((double) den) : 0.0;
            java.util.Map<String,Object> m = new java.util.HashMap<>();
            m.put("key", key);
            m.put("period", period);
            m.put("value", val);
            m.put("numerator", num);
            m.put("denominator", den);
            out.add(m);
        }
        // sort by period then key
        out.sort(java.util.Comparator.comparing((java.util.Map<String,Object> m) -> String.valueOf(m.getOrDefault("period","")))
                .thenComparing(m -> String.valueOf(m.getOrDefault("key",""))));
        return out;
    }

    /**
     * Generic aggregator: compute average of numeric field `metric` across responses, grouped by the requested
     * dimension and granularity.
     * Returns a list of maps with keys: key (dimension key), period (string), value (average)
     */
    @Transactional(readOnly = true)
    public java.util.List<java.util.Map<String,Object>> aggregate(String metric, String dimension, String granularity, Long groupId, Long clubId, String startIso, String endIso, String phase, java.util.Set<Long> allowedGroupIds){
        // sanitize inputs: allow only whitelisted values to avoid SQL errors/injection in optimized path
        String safeMetric = metric != null && metric.matches("[A-Za-z0-9_]+") ? metric : null;
        String safeDimension = switch(String.valueOf(dimension)){
            case "athlete", "group", "club", "age", "all" -> dimension; default -> "all"; };
        String safeGranularity = switch(String.valueOf(granularity)){
            case "day", "week", "month", "training" -> granularity; default -> "day"; };

        // try optimized DB-side aggregation using Postgres JSON functions; if failure, fall back to in-memory aggregation
        try {
            if (safeMetric != null){
                java.util.List<java.util.Map<String,Object>> opt = aggregateOptimized(safeMetric, safeDimension, safeGranularity, groupId, clubId, startIso, endIso, phase, allowedGroupIds);
                if (opt != null && !opt.isEmpty()) return opt;
            }
            // if optimized returned no rows or metric invalid, fall back to in-memory (covers nested JSON or unexpected formats)
        } catch (Exception ex) {
            // swallow and fallback
        }
        // fallback to original implementation
        if (groupId == null && allowedGroupIds != null && allowedGroupIds.isEmpty()) return java.util.List.of();
        java.util.List<com.traininginsights.model.QuestionnaireResponse> all = new java.util.ArrayList<>();
        // naive: load all responses and filter in-memory
        for (com.traininginsights.model.Training t : trainingRepository.findAll()){
            all.addAll(responseService.byTraining(t));
        }
        java.time.Instant start = null, end = null;
        try { if (startIso != null) start = java.time.Instant.parse(startIso); } catch (Exception ignored){}
        try { if (endIso != null) end = java.time.Instant.parse(endIso); } catch (Exception ignored){}

        // map: compositeKey -> list of numeric values
        java.util.Map<String, java.util.List<Double>> buckets = new java.util.HashMap<>();
        for (com.traininginsights.model.QuestionnaireResponse r : all){
            if (r.getSubmittedAt() == null) continue;
            if (start != null && r.getSubmittedAt().isBefore(start)) continue;
            if (end != null && r.getSubmittedAt().isAfter(end)) continue;
            // filter by group or club if specified
            if (groupId != null){
                boolean inGroup = r.getTraining() != null && r.getTraining().getGroups() != null && r.getTraining().getGroups().stream().anyMatch(g -> g.getId().equals(groupId));
                if (!inGroup) continue;
            }
            if (groupId == null && allowedGroupIds != null){
                boolean allowed = r.getTraining() != null && r.getTraining().getGroups() != null && r.getTraining().getGroups().stream().anyMatch(g -> allowedGroupIds.contains(g.getId()));
                if (!allowed) continue;
            }
            if (clubId != null){
                boolean inClub = r.getTraining() != null && r.getTraining().getGroups() != null && r.getTraining().getGroups().stream().anyMatch(g -> g.getClubs() != null && g.getClubs().stream().anyMatch(c -> c.getId().equals(clubId)));
                if (!inClub) continue;
            }
            if (phase != null && !phase.isBlank()){
                if (r.getPhase() == null || !r.getPhase().equalsIgnoreCase(phase)) continue;
            }
            // extract numeric metric
            Double val = null;
            try {
                var node = responseService.getObjectMapper().readTree(r.getResponses());
                if (node.has(metric) && node.get(metric).isNumber()) val = node.get(metric).asDouble();
            } catch (Exception ignored){}
            if (val == null) continue;

            // determine bucket key based on dimension and granularity
            String key = "unknown";
            String period = "";
            // dimension key
            switch(dimension){
                case "athlete": key = r.getUser() != null ? String.valueOf(r.getUser().getId()) : "unknown"; break;
                case "group": key = r.getTraining() != null && r.getTraining().getGroups()!=null && !r.getTraining().getGroups().isEmpty() ? String.valueOf(r.getTraining().getGroups().iterator().next().getId()) : "nogroup"; break;
                case "club": key = r.getTraining() != null && r.getTraining().getGroups()!=null && !r.getTraining().getGroups().isEmpty() && r.getTraining().getGroups().iterator().next().getClubs()!=null && !r.getTraining().getGroups().iterator().next().getClubs().isEmpty() ? String.valueOf(r.getTraining().getGroups().iterator().next().getClubs().iterator().next().getId()) : "noclub"; break;
                case "age": key = r.getUser()!=null && r.getUser().getBirthDate()!=null ? String.valueOf(java.time.Period.between(r.getUser().getBirthDate(), java.time.LocalDate.now()).getYears()) : "unknown"; break;
                default: key = "all";
            }
            // period key based on granularity and training time when available (fallback to submittedAt)
            java.time.Instant inst = (r.getTraining()!=null && r.getTraining().getTrainingTime()!=null)
                    ? r.getTraining().getTrainingTime()
                    : r.getSubmittedAt();
            java.time.ZoneId zid = java.time.ZoneId.systemDefault();
            java.time.ZonedDateTime z = java.time.ZonedDateTime.ofInstant(inst, zid);
            switch(granularity){
                case "day": period = z.toLocalDate().toString(); break;
                case "week": period = String.valueOf(z.get(java.time.temporal.IsoFields.WEEK_OF_WEEK_BASED_YEAR)); break;
                case "month": period = z.getYear() + "-" + String.format("%02d", z.getMonthValue()); break;
                case "training": period = r.getTraining() != null ? String.valueOf(r.getTraining().getId()) : "notraining"; break;
                default: period = z.toLocalDate().toString();
            }
            String composite = key + "|" + period;
            buckets.computeIfAbsent(composite, k->new java.util.ArrayList<>()).add(val);
        }

        java.util.List<java.util.Map<String,Object>> out = new java.util.ArrayList<>();
        for (var e : buckets.entrySet()){
            var list = e.getValue();
            double sum = 0; for (Double d : list) sum += d; double avg = list.isEmpty() ? 0.0 : sum / list.size();
            String[] parts = e.getKey().split("\\|",2);
            java.util.Map<String,Object> m = new java.util.HashMap<>();
            m.put("key", parts[0]); m.put("period", parts.length>1?parts[1]:""); m.put("value", avg); m.put("count", list.size());
            out.add(m);
        }
        return out;
    }

    /**
     * Aggregate multiple metrics at once. Returns a map: metric -> list of {key, period, value, count}
     */
    @Transactional(readOnly = true)
    public java.util.Map<String, java.util.List<java.util.Map<String,Object>>> aggregateMulti(java.util.List<String> metrics, String dimension, String granularity, Long groupId, Long clubId, String startIso, String endIso, String phase, java.util.Set<Long> allowedGroupIds){
        java.util.Map<String, java.util.List<java.util.Map<String,Object>>> result = new java.util.HashMap<>();
        if (metrics == null || metrics.isEmpty()) return result;
        for (String m : metrics){
            if (m == null || m.isBlank()) continue;
            var data = aggregate(m, dimension, granularity, groupId, clubId, startIso, endIso, phase, allowedGroupIds);
            result.put(m, data);
        }
        return result;
    }

    /**
     * Drilldown: return raw rows for given filters. Each row contains metric, value, key, period, submittedAt, trainingId, userId, phase.
     * If metrics is null/empty, include all numeric fields found in response JSON (one row per metric field).
     */
    public static class DrilldownResult {
        public java.util.List<java.util.Map<String,Object>> rows;
        public long total;
        public int page;
        public int size;
        public String sort;
    }

    @Transactional(readOnly = true)
    public DrilldownResult drilldown(java.util.List<String> metrics, String dimension, String granularity, Long groupId, Long clubId, String startIso, String endIso, String phase, String filterKey, String period, int page, int size, String sort, java.util.Set<Long> allowedGroupIds){
        java.time.Instant start = null, end = null;
        try { if (startIso != null) start = java.time.Instant.parse(startIso); } catch (Exception ignored) {}
        try { if (endIso != null) end = java.time.Instant.parse(endIso); } catch (Exception ignored) {}

        if (groupId == null && allowedGroupIds != null && allowedGroupIds.isEmpty()){
            DrilldownResult empty = new DrilldownResult();
            empty.rows = java.util.List.of();
            empty.total = 0; empty.page = Math.max(page,0); empty.size = Math.min(Math.max(size,1),1000); empty.sort = sort==null?"submittedAt,desc":sort;
            return empty;
        }

        java.util.List<com.traininginsights.model.QuestionnaireResponse> all = new java.util.ArrayList<>();
        for (com.traininginsights.model.Training t : trainingRepository.findAll()){
            all.addAll(responseService.byTraining(t));
        }

        boolean filterMetrics = metrics != null && !metrics.isEmpty();
        java.util.Set<String> metricsSet = filterMetrics ? new java.util.HashSet<>(metrics) : java.util.Set.of();

    java.util.List<java.util.Map<String,Object>> rows = new java.util.ArrayList<>();
        for (com.traininginsights.model.QuestionnaireResponse r : all){
            if (r.getSubmittedAt() == null) continue;
            if (start != null && r.getSubmittedAt().isBefore(start)) continue;
            if (end != null && r.getSubmittedAt().isAfter(end)) continue;
            if (groupId != null){
                boolean inGroup = r.getTraining() != null && r.getTraining().getGroups() != null && r.getTraining().getGroups().stream().anyMatch(g -> g.getId().equals(groupId));
                if (!inGroup) continue;
            }
            if (groupId == null && allowedGroupIds != null){
                boolean allowed = r.getTraining() != null && r.getTraining().getGroups() != null && r.getTraining().getGroups().stream().anyMatch(g -> allowedGroupIds.contains(g.getId()));
                if (!allowed) continue;
            }
            if (clubId != null){
                boolean inClub = r.getTraining() != null && r.getTraining().getGroups() != null && r.getTraining().getGroups().stream().anyMatch(g -> g.getClubs() != null && g.getClubs().stream().anyMatch(c -> c.getId().equals(clubId)));
                if (!inClub) continue;
            }
            if (phase != null && !phase.isBlank()){
                if (r.getPhase() == null || !r.getPhase().equalsIgnoreCase(phase)) continue;
            }

            // derive key and period
            String key;
            switch (String.valueOf(dimension)){
                case "athlete": key = r.getUser() != null ? String.valueOf(r.getUser().getId()) : "unknown"; break;
                case "group": key = r.getTraining() != null && r.getTraining().getGroups()!=null && !r.getTraining().getGroups().isEmpty() ? String.valueOf(r.getTraining().getGroups().iterator().next().getId()) : "nogroup"; break;
                case "club": key = r.getTraining() != null && r.getTraining().getGroups()!=null && !r.getTraining().getGroups().isEmpty() && r.getTraining().getGroups().iterator().next().getClubs()!=null && !r.getTraining().getGroups().iterator().next().getClubs().isEmpty() ? String.valueOf(r.getTraining().getGroups().iterator().next().getClubs().iterator().next().getId()) : "noclub"; break;
                case "age": key = r.getUser()!=null && r.getUser().getBirthDate()!=null ? String.valueOf(java.time.Period.between(r.getUser().getBirthDate(), java.time.LocalDate.now()).getYears()) : "unknown"; break;
                default: key = "all";
            }
            java.time.Instant inst = (r.getTraining()!=null && r.getTraining().getTrainingTime()!=null)
                    ? r.getTraining().getTrainingTime()
                    : r.getSubmittedAt();
            java.time.ZonedDateTime z = java.time.ZonedDateTime.ofInstant(inst, java.time.ZoneId.systemDefault());
            String per;
            switch (String.valueOf(granularity)){
                case "day": per = z.toLocalDate().toString(); break;
                case "week": per = String.valueOf(z.get(java.time.temporal.IsoFields.WEEK_OF_WEEK_BASED_YEAR)); break;
                case "month": per = z.getYear() + "-" + String.format("%02d", z.getMonthValue()); break;
                case "training": per = r.getTraining() != null ? String.valueOf(r.getTraining().getId()) : "notraining"; break;
                default: per = z.toLocalDate().toString();
            }
            if (filterKey != null && !filterKey.equals(key)) continue;
            if (period != null && !period.equals(per)) continue;

            // parse response JSON and emit rows per metric
            try {
                var node = responseService.getObjectMapper().readTree(r.getResponses());
                java.util.Iterator<String> fieldNames = node.fieldNames();
                while (fieldNames.hasNext()){
                    String fname = fieldNames.next();
                    if (filterMetrics && !metricsSet.contains(fname)) continue;
                    var valNode = node.get(fname);
                    if (valNode != null && valNode.isNumber()){
                        java.util.Map<String,Object> m = new java.util.HashMap<>();
                        m.put("metric", fname);
                        m.put("value", valNode.asDouble());
                        m.put("key", key);
                        m.put("period", per);
                        m.put("submittedAt", r.getSubmittedAt().toString());
                        m.put("userId", r.getUser()!=null ? r.getUser().getId() : null);
                        m.put("trainingId", r.getTraining()!=null ? r.getTraining().getId() : null);
                        m.put("phase", r.getPhase());
                        rows.add(m);
                    }
                }
            } catch (Exception ignored) {}
        }

        // sorting
        String[] sortParts = (sort == null || sort.isBlank() ? "submittedAt,desc" : sort).split(",", 2);
        String sortField = sortParts[0];
        String sortDir = sortParts.length > 1 ? sortParts[1] : "desc";
        java.util.Comparator<java.util.Map<String,Object>> cmp;
        switch (sortField){
            case "metric": cmp = java.util.Comparator.comparing(m -> String.valueOf(m.getOrDefault("metric",""))); break;
            case "value": cmp = java.util.Comparator.comparing(m -> Double.valueOf(String.valueOf(m.getOrDefault("value",0)))); break;
            case "key": cmp = java.util.Comparator.comparing(m -> String.valueOf(m.getOrDefault("key",""))); break;
            case "period": cmp = java.util.Comparator.comparing(m -> String.valueOf(m.getOrDefault("period",""))); break;
            case "trainingId": cmp = java.util.Comparator.comparing(m -> Long.valueOf(String.valueOf(m.getOrDefault("trainingId",0)))); break;
            case "userId": cmp = java.util.Comparator.comparing(m -> Long.valueOf(String.valueOf(m.getOrDefault("userId",0)))); break;
            case "phase": cmp = java.util.Comparator.comparing(m -> String.valueOf(m.getOrDefault("phase",""))); break;
            case "submittedAt":
            default:
                cmp = java.util.Comparator.comparing(m -> String.valueOf(m.getOrDefault("submittedAt","")));
        }
        rows.sort("desc".equalsIgnoreCase(sortDir) ? cmp.reversed() : cmp);

        // paging with safety cap
        int maxSize = Math.min(Math.max(size, 1), 1000); // cap at 1000
        int safePage = Math.max(page, 0);
        int from = safePage * maxSize;
        int to = Math.min(from + maxSize, rows.size());
        java.util.List<java.util.Map<String,Object>> pageRows = from < rows.size() ? rows.subList(from, to) : java.util.List.of();

        DrilldownResult res = new DrilldownResult();
        res.rows = new java.util.ArrayList<>(pageRows);
        res.total = rows.size();
        res.page = safePage;
        res.size = maxSize;
        res.sort = sortField + "," + sortDir;
        return res;
    }

    /**
     * Resolve display labels for dimension keys (athlete/group/club names, etc.).
     */
    @Transactional(readOnly = true)
    public java.util.Map<String,String> resolveLabels(String dimension, java.util.Set<String> keys){
        java.util.Map<String,String> labels = new java.util.HashMap<>();
        if (keys == null || keys.isEmpty()) return labels;
        switch (String.valueOf(dimension)){
            case "athlete":
                java.util.List<Long> userIds = keys.stream().filter(s->s.matches("\\d+")).map(Long::valueOf).toList();
                if (!userIds.isEmpty()){
                    userRepository.findAllById(userIds).forEach(u -> labels.put(String.valueOf(u.getId()), (u.getFirstName()==null?"":u.getFirstName()) + " " + (u.getLastName()==null?"":u.getLastName()).trim()));
                }
                break;
            case "group":
                java.util.List<Long> groupIds = keys.stream().filter(s->s.matches("\\d+")).map(Long::valueOf).toList();
                if (!groupIds.isEmpty()){
                    groupRepository.findAllById(groupIds).forEach(g -> labels.put(String.valueOf(g.getId()), g.getName()));
                }
                break;
            case "club":
                java.util.List<Long> clubIds = keys.stream().filter(s->s.matches("\\d+")).map(Long::valueOf).toList();
                if (!clubIds.isEmpty()){
                    clubRepository.findAllById(clubIds).forEach(c -> labels.put(String.valueOf(c.getId()), c.getName()));
                }
                break;
            case "age":
                for (String k : keys){ labels.put(k, k + "y"); }
                break;
            default:
                for (String k : keys){ labels.put(k, "All"); }
        }
        return labels;
    }

    /**
     * Inspect questionnaire responses (filtered) to list unique numeric metric fields available.
     */
    @Transactional(readOnly = true)
    public java.util.Set<String> availableMetrics(Long groupId, Long clubId, String startIso, String endIso, String phase, java.util.Set<Long> allowedGroupIds){
        java.time.Instant start = null, end = null;
        try { if (startIso != null) start = java.time.Instant.parse(startIso); } catch (Exception ignored){}
        try { if (endIso != null) end = java.time.Instant.parse(endIso); } catch (Exception ignored){}
        java.util.Set<String> metrics = new java.util.HashSet<>();
        if (groupId == null && allowedGroupIds != null && allowedGroupIds.isEmpty()) return metrics;
        // sample across trainings; for simplicity iterate all responses
        for (com.traininginsights.model.Training t : trainingRepository.findAll()){
            for (com.traininginsights.model.QuestionnaireResponse r : responseService.byTraining(t)){
                if (r.getSubmittedAt() == null) continue;
                if (start != null && r.getSubmittedAt().isBefore(start)) continue;
                if (end != null && r.getSubmittedAt().isAfter(end)) continue;
                if (groupId != null){
                    boolean inGroup = r.getTraining() != null && r.getTraining().getGroups() != null && r.getTraining().getGroups().stream().anyMatch(g -> g.getId().equals(groupId));
                    if (!inGroup) continue;
                }
                if (groupId == null && allowedGroupIds != null){
                    boolean allowed = r.getTraining() != null && r.getTraining().getGroups() != null && r.getTraining().getGroups().stream().anyMatch(g -> allowedGroupIds.contains(g.getId()));
                    if (!allowed) continue;
                }
                if (clubId != null){
                    boolean inClub = r.getTraining() != null && r.getTraining().getGroups() != null && r.getTraining().getGroups().stream().anyMatch(g -> g.getClubs() != null && g.getClubs().stream().anyMatch(c -> c.getId().equals(clubId)));
                    if (!inClub) continue;
                }
                if (phase != null && !phase.isBlank()){
                    if (r.getPhase() == null || !r.getPhase().equalsIgnoreCase(phase)) continue;
                }
                try {
                    var node = responseService.getObjectMapper().readTree(r.getResponses());
                    java.util.Iterator<String> fieldNames = node.fieldNames();
                    while (fieldNames.hasNext()){
                        String fname = fieldNames.next();
                        var v = node.get(fname);
                        if (v != null && v.isNumber()) metrics.add(fname);
                    }
                } catch (Exception ignored){}
            }
        }
        return metrics;
    }

    @Transactional(readOnly = true)
    public List<Map<String,Object>> aggregateOptimized(String metric, String dimension, String granularity, Long groupId, Long clubId, String startIso, String endIso, String phase, java.util.Set<Long> allowedGroupIds){
        // This uses Postgres JSON functions to extract numeric values from the responses TEXT column which is stored as JSON.
        // The query returns key, period, avg(value)::double precision, count
        // Build native SQL - note: uses ->> to extract text and cast to numeric
        StringBuilder sql = new StringBuilder();
        sql.append("select ");
        // dimension key
        switch(dimension){
            case "athlete": sql.append("qr.user_id::text as key, "); break;
            case "group": sql.append("(select tg.group_id::text from training_groups tg where tg.training_id = t.id limit 1) as key, "); break;
            case "club": sql.append("(select gc.club_id::text from group_clubs gc join training_groups tg on gc.group_id = tg.group_id where tg.training_id = t.id limit 1) as key, "); break;
            case "age": sql.append("(extract(year from age(u.birth_date))::int)::text as key, "); break;
            default: sql.append("'all' as key, ");
        }
        // period
        switch(granularity){
            case "day": sql.append("to_char(t.training_time at time zone 'UTC', 'YYYY-MM-DD') as period, "); break;
            case "week": sql.append("to_char(t.training_time at time zone 'UTC', 'IYYY-IW') as period, "); break;
            case "month": sql.append("to_char(t.training_time at time zone 'UTC', 'YYYY-MM') as period, "); break;
            case "training": sql.append("t.id::text as period, "); break;
            default: sql.append("to_char(qr.submitted_at at time zone 'UTC', 'YYYY-MM-DD') as period, ");
        }
        sql.append("avg((qr.responses::json->> '"+metric+"')::double precision) as value, count(*) as count ");
    sql.append("from questionnaire_responses qr join trainings t on qr.training_id = t.id join users u on qr.user_id = u.id ");
        // apply filters
    // match numeric-looking values (integers or decimals) using a digit character class
    sql.append("where (qr.responses::json->> '"+metric+"') ~ '^[+-]?[0-9]+(\\.[0-9]+)?$' ");
    if (startIso != null) sql.append(" and qr.submitted_at >= :start ");
    if (endIso != null) sql.append(" and qr.submitted_at <= :end ");
    if (groupId != null) sql.append(" and exists (select 1 from training_groups tg where tg.training_id = t.id and tg.group_id = :gid) ");
    if (groupId == null && allowedGroupIds != null) sql.append(" and exists (select 1 from training_groups tg where tg.training_id = t.id and tg.group_id in (:agids)) ");
    if (clubId != null) sql.append(" and exists (select 1 from group_clubs gc join training_groups tg on gc.group_id = tg.group_id where tg.training_id = t.id and gc.club_id = :cid) ");
    if (phase != null && !phase.isBlank()) sql.append(" and qr.phase = :phase ");
        sql.append(" group by key, period order by period, key");

    Query q = em.createNativeQuery(sql.toString());
    if (startIso != null) q.setParameter("start", java.sql.Timestamp.from(java.time.Instant.parse(startIso)));
    if (endIso != null) q.setParameter("end", java.sql.Timestamp.from(java.time.Instant.parse(endIso)));
    if (groupId != null) q.setParameter("gid", groupId);
    if (groupId == null && allowedGroupIds != null && !allowedGroupIds.isEmpty()) q.setParameter("agids", allowedGroupIds);
    if (clubId != null) q.setParameter("cid", clubId);
    if (phase != null && !phase.isBlank()) q.setParameter("phase", phase);
        @SuppressWarnings("unchecked")
        List<Object[]> rows = q.getResultList();
        java.util.List<java.util.Map<String,Object>> out = new java.util.ArrayList<>();
        for (Object[] row : rows){
            java.util.Map<String,Object> m = new java.util.HashMap<>();
            m.put("key", row[0]==null?"":row[0].toString());
            m.put("period", row[1]==null?"":row[1].toString());
            m.put("value", row[2]==null?0.0:Double.parseDouble(row[2].toString()));
            m.put("count", row[3]==null?0:Integer.parseInt(row[3].toString()));
            out.add(m);
        }
        return out;
    }
}
