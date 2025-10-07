package com.traininginsights.service;

import java.time.*;
import java.time.format.DateTimeFormatter;
import java.util.*;

/** Utility to parse a limited RRULE subset and expand occurrences. */
public class RecurrenceUtil {
    public record RRule(String freq, int interval, List<DayOfWeek> byDay, Integer byMonthDay, Instant until, Integer count) {}

    private static final DateTimeFormatter UNTIL_FMT_Z = DateTimeFormatter.ofPattern("yyyyMMdd'T'HHmmss'Z'"); // e.g. 20250131T130000Z
    private static final int MAX_OCCURRENCES_CAP = 500;

    public static RRule parse(String rruleRaw, Instant explicitUntil, Integer explicitCount){
        if (rruleRaw == null || rruleRaw.isBlank()) throw new IllegalArgumentException("RRULE required");
        String[] parts = rruleRaw.split(";" );
        String freq = null; int interval = 1; List<DayOfWeek> byDays = new ArrayList<>(); Integer byMonthDay = null; Instant until = explicitUntil; Integer count = explicitCount;
        for (String p : parts){
            String[] kv = p.split("="); if (kv.length!=2) continue; String k = kv[0].toUpperCase(Locale.ROOT).trim(); String v = kv[1].trim();
            switch (k){
                case "FREQ" -> freq = v.toUpperCase(Locale.ROOT);
                case "INTERVAL" -> interval = Math.max(1, Integer.parseInt(v));
                case "BYDAY" -> {
                    byDays.clear();
                    for (String d : v.split(",")){
                        d = d.trim(); if (d.isEmpty()) continue;
                        byDays.add(parseDay(d));
                    }
                }
                case "BYMONTHDAY" -> byMonthDay = Integer.parseInt(v);
                case "UNTIL" -> {
                    // Robust UNTIL parsing supporting:
                    //  - RFC inline format like 20250131T130000Z
                    //  - Date only 20250131 (treated as end of that day UTC)
                    //  - Full ISO-8601 passed through (Instant.parse)
                    String raw = v;
                    Instant parsed = null;
                    // Try direct Instant.parse for ISO-8601 inputs (e.g. 2025-01-31T13:00:00Z)
                    try { parsed = Instant.parse(raw); } catch (Exception ignored) {}
                    if (parsed == null) {
                        if (raw.matches("^\\d{8}T\\d{6}Z$")) {
                            try { parsed = Instant.from(UNTIL_FMT_Z.parse(raw)); } catch (Exception ignored) {}
                        }
                    }
                    if (parsed == null) {
                        if (raw.matches("^\\d{8}$")) {
                            try {
                                LocalDate ld = LocalDate.parse(raw, DateTimeFormatter.BASIC_ISO_DATE);
                                // Interpret date-only UNTIL as end-of-day UTC so occurrences that day are included
                                parsed = ld.plusDays(1).atStartOfDay(ZoneOffset.UTC).toInstant().minusSeconds(1);
                            } catch (Exception ignored) {}
                        }
                    }
                    if (parsed == null) throw new IllegalArgumentException("Invalid UNTIL value: " + raw);
                    until = parsed;
                }
                case "COUNT" -> count = Integer.parseInt(v);
            }
        }
        if (freq == null) throw new IllegalArgumentException("FREQ missing in RRULE");
        if (until != null && count != null) throw new IllegalArgumentException("UNTIL and COUNT both specified");
        if (count != null && count > MAX_OCCURRENCES_CAP) throw new IllegalArgumentException("COUNT exceeds cap");
        return new RRule(freq, interval, List.copyOf(byDays), byMonthDay, until, count);
    }

    private static DayOfWeek parseDay(String token){
        return switch (token.toUpperCase(Locale.ROOT)) {
            case "MO" -> DayOfWeek.MONDAY;
            case "TU" -> DayOfWeek.TUESDAY;
            case "WE" -> DayOfWeek.WEDNESDAY;
            case "TH" -> DayOfWeek.THURSDAY;
            case "FR" -> DayOfWeek.FRIDAY;
            case "SA" -> DayOfWeek.SATURDAY;
            case "SU" -> DayOfWeek.SUNDAY;
            default -> throw new IllegalArgumentException("Invalid BYDAY token: " + token);
        };
    }

    public static List<ZonedDateTime> expand(RRule rule, ZonedDateTime seedStart){
        List<ZonedDateTime> list = new ArrayList<>();
        int produced = 0; ZonedDateTime cursor = seedStart;
    // Safety window ~3 years (approx 1095 days)
    ZonedDateTime safetyEnd = seedStart.plusDays(365L * 3);
        while (true){
            if (rule.count()!=null && produced >= rule.count()) break;
            if (rule.until()!=null && cursor.toInstant().isAfter(rule.until())) break;
            if (cursor.isAfter(safetyEnd)) break;
            // Inclusion test per frequency
            boolean include = switch (rule.freq()){
                case "DAILY" -> true;
                case "WEEKLY" -> rule.byDay().isEmpty() || rule.byDay().contains(cursor.getDayOfWeek());
                case "MONTHLY" -> rule.byMonthDay()!=null ? cursor.getDayOfMonth()==rule.byMonthDay() : cursor.getDayOfMonth()==seedStart.getDayOfMonth();
                case "YEARLY" -> cursor.getMonth()==seedStart.getMonth() && cursor.getDayOfMonth()==seedStart.getDayOfMonth();
                default -> throw new IllegalArgumentException("Unsupported FREQ: "+rule.freq());
            };
            if (include){
                list.add(cursor);
                produced++;
            }
            // Advance cursor
            cursor = switch (rule.freq()){
                case "DAILY" -> cursor.plusDays(rule.interval());
                case "WEEKLY" -> {
                    // If BYDAY specified, advance day-by-day until next eligible or until next base week after cycling
                    if (!rule.byDay().isEmpty()){
                        ZonedDateTime next = cursor.plusDays(1);
                        // If moving beyond a week cycle relative to seed (interval logic)
                        // Simpler: produce all days in current week, then jump (interval-1) weeks after finishing last
                        if (rule.byDay().contains(next.getDayOfWeek())) {
                            yield next;
                        } else {
                            // find next included day in same week
                            for (int i=1;i<=6;i++){
                                ZonedDateTime cand = cursor.plusDays(i);
                                if (rule.byDay().contains(cand.getDayOfWeek())) { next = cand; break; }
                            }
                            if (!rule.byDay().contains(next.getDayOfWeek())){
                                // none left in this week: jump interval-1 weeks + to first BYDAY of next cycle
                                ZonedDateTime base = cursor.plusWeeks(rule.interval()).withHour(seedStart.getHour()).withMinute(seedStart.getMinute()).withSecond(seedStart.getSecond()).withNano(seedStart.getNano());
                                // move forward until BYDAY match
                                ZonedDateTime aligned = base;
                                for (int i=0;i<7;i++){
                                    if (rule.byDay().contains(aligned.getDayOfWeek())) break;
                                    aligned = aligned.plusDays(1);
                                }
                                yield aligned;
                            }
                            yield next;
                        }
                    } else {
                        yield cursor.plusWeeks(rule.interval());
                    }
                }
                case "MONTHLY" -> cursor.plusMonths(rule.interval());
                case "YEARLY" -> cursor.plusYears(rule.interval());
                default -> throw new IllegalArgumentException("Unsupported FREQ: "+rule.freq());
            };
            if (list.size() >= MAX_OCCURRENCES_CAP) break;
        }
        return list;
    }
}
