package com.example.mcpdemo.service;

import com.example.mcpdemo.model.CalendarEvent;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
public class CalendarService {
    private static final DateTimeFormatter FORMATTER = DateTimeFormatter.ISO_DATE_TIME;

    public List<CalendarEvent> queryEvents(Map<String, Object> arguments) {
        LocalDateTime start = parseDateTime(arguments.get("start_time"));
        LocalDateTime end = parseDateTime(arguments.get("end_time"));
        String keyword = readKeyword(arguments.get("keyword"));

        return sampleEvents().stream()
                .filter(event -> start == null || !LocalDateTime.parse(event.endTime(), FORMATTER).isBefore(start))
                .filter(event -> end == null || !LocalDateTime.parse(event.startTime(), FORMATTER).isAfter(end))
                .filter(event -> keyword == null || containsKeyword(event, keyword))
                .toList();
    }

    private String readKeyword(Object value) {
        if (value == null) {
            return null;
        }
        return value.toString().trim().toLowerCase(Locale.ROOT);
    }

    private boolean containsKeyword(CalendarEvent event, String keyword) {
        return event.title().toLowerCase(Locale.ROOT).contains(keyword)
                || event.description().toLowerCase(Locale.ROOT).contains(keyword)
                || event.location().toLowerCase(Locale.ROOT).contains(keyword);
    }

    private LocalDateTime parseDateTime(Object value) {
        if (value == null || value.toString().isBlank()) {
            return null;
        }
        try {
            return LocalDateTime.parse(value.toString(), FORMATTER);
        } catch (DateTimeParseException ex) {
            return null;
        }
    }

    private List<CalendarEvent> sampleEvents() {
        return List.of(
                new CalendarEvent(
                        "evt-001",
                        "Daily Standup",
                        "2026-02-11T09:30:00",
                        "2026-02-11T09:45:00",
                        "Meeting Room A",
                        "Daily sync for engineering team"
                ),
                new CalendarEvent(
                        "evt-002",
                        "Product Review",
                        "2026-02-11T14:00:00",
                        "2026-02-11T15:00:00",
                        "Conference Room 3",
                        "Review sprint deliverables"
                ),
                new CalendarEvent(
                        "evt-003",
                        "Architecture Workshop",
                        "2026-02-12T10:00:00",
                        "2026-02-12T11:30:00",
                        "Online",
                        "Discuss MCP server extensibility"
                )
        );
    }
}
