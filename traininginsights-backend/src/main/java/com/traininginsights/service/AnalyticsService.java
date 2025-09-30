package com.traininginsights.service;

import com.traininginsights.model.Group;
import com.traininginsights.model.Training;
import com.traininginsights.repository.GroupRepository;
import com.traininginsights.repository.TrainingRepository;
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
    private final EntityManager em;

    public AnalyticsService(TrainingRepository trainingRepository, GroupRepository groupRepository, QuestionnaireResponseService responseService, EntityManager em) {
        this.trainingRepository = trainingRepository;
        this.groupRepository = groupRepository;
        this.responseService = responseService;
        this.em = em;
    }

    /**
     * Placeholder: compute average of numeric field "soreness" across post-training questionnaire responses
     * for trainings in the given ISO week.
     */
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
     * Generic aggregator: compute average of numeric field `metric` across responses, grouped by the requested
     * dimension and granularity.
     * Returns a list of maps with keys: key (dimension key), period (string), value (average)
     */
    public java.util.List<java.util.Map<String,Object>> aggregate(String metric, String dimension, String granularity, Long groupId, Long clubId, String startIso, String endIso){
        // try optimized DB-side aggregation using Postgres JSON functions; if failure, fall back to in-memory aggregation
        try {
            java.util.List<java.util.Map<String,Object>> opt = aggregateOptimized(metric, dimension, granularity, groupId, clubId, startIso, endIso);
            if (opt != null && !opt.isEmpty()) return opt;
            // if optimized returned no rows, fall back to in-memory (covers nested JSON or unexpected formats)
        } catch (Exception ex) {
            // log at debug level in real app; here we fallback
        }
        // fallback to original implementation
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
            if (clubId != null){
                boolean inClub = r.getTraining() != null && r.getTraining().getGroups() != null && r.getTraining().getGroups().stream().anyMatch(g -> g.getClubs() != null && g.getClubs().stream().anyMatch(c -> c.getId().equals(clubId)));
                if (!inClub) continue;
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
            // period key based on granularity and submittedAt/trainingTime
            java.time.Instant inst = r.getSubmittedAt();
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

    @Transactional(readOnly = true)
    public List<Map<String,Object>> aggregateOptimized(String metric, String dimension, String granularity, Long groupId, Long clubId, String startIso, String endIso){
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
            case "day": sql.append("to_char(qr.submitted_at at time zone 'UTC', 'YYYY-MM-DD') as period, "); break;
            case "week": sql.append("to_char(qr.submitted_at at time zone 'UTC', 'IYYY-IW') as period, "); break;
            case "month": sql.append("to_char(qr.submitted_at at time zone 'UTC', 'YYYY-MM') as period, "); break;
            case "training": sql.append("t.id::text as period, "); break;
            default: sql.append("to_char(qr.submitted_at at time zone 'UTC', 'YYYY-MM-DD') as period, ");
        }
        sql.append("avg((qr.responses::json->> '"+metric+"')::double precision) as value, count(*) as count ");
        sql.append("from questionnaire_responses qr join trainings t on qr.training_id = t.id join users u on qr.user_id = u.id ");
        // apply filters
    // match numeric-looking values (integers or decimals) using a digit character class
    sql.append("where (qr.responses::json->> '"+metric+"') ~ '^[+-]?[0-9]+(\\.[0-9]+)?$' ");
        if (startIso != null) sql.append(" and qr.submitted_at >= '"+startIso+"' ");
        if (endIso != null) sql.append(" and qr.submitted_at <= '"+endIso+"' ");
        if (groupId != null) sql.append(" and exists (select 1 from training_groups tg where tg.training_id = t.id and tg.group_id = " + groupId + ") ");
        if (clubId != null) sql.append(" and exists (select 1 from group_clubs gc join training_groups tg on gc.group_id = tg.group_id where tg.training_id = t.id and gc.club_id = " + clubId + ") ");
        sql.append(" group by key, period order by period, key");

        Query q = em.createNativeQuery(sql.toString());
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
