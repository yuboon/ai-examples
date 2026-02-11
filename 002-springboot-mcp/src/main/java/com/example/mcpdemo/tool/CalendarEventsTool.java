package com.example.mcpdemo.tool;

import com.example.mcpdemo.model.CalendarEvent;
import com.example.mcpdemo.protocol.McpErrorCodes;
import com.example.mcpdemo.protocol.McpException;
import com.example.mcpdemo.service.CalendarService;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.Map;

@Component
public class CalendarEventsTool implements McpTool {
    private static final DateTimeFormatter FORMATTER = DateTimeFormatter.ISO_DATE_TIME;

    private final CalendarService calendarService;

    public CalendarEventsTool(CalendarService calendarService) {
        this.calendarService = calendarService;
    }

    @Override
    public String getName() {
        return "get_calendar_events";
    }

    @Override
    public String getDescription() {
        return "Query calendar events by date range and keyword";
    }

    @Override
    public Map<String, Object> getInputSchema() {
        return Map.of(
                "type", "object",
                "properties", Map.of(
                        "start_time", Map.of("type", "string", "format", "date-time", "description", "Inclusive start time"),
                        "end_time", Map.of("type", "string", "format", "date-time", "description", "Inclusive end time"),
                        "keyword", Map.of("type", "string", "description", "Keyword in title, location or description")
                ),
                "additionalProperties", false
        );
    }

    @Override
    public Object invoke(Map<String, Object> arguments) {
        validate(arguments);
        List<CalendarEvent> events = calendarService.queryEvents(arguments);
        String summary = buildSummary(events);

        return Map.of(
                "event_count", events.size(),
                "has_events", !events.isEmpty(),
                "structuredContent", Map.of(
                        "events", events,
                        "event_count", events.size(),
                        "has_events", !events.isEmpty()
                ),
                "content", List.of(
                        Map.of(
                                "type", "text",
                                "text", summary
                        )
                )
        );
    }

    private String buildSummary(List<CalendarEvent> events) {
        if (events.isEmpty()) {
            return "No calendar events found in the specified time range.";
        }

        StringBuilder summary = new StringBuilder("Found " + events.size() + " calendar events:");
        for (CalendarEvent event : events) {
            summary.append("\n- ")
                    .append(event.startTime())
                    .append(" ~ ")
                    .append(event.endTime())
                    .append(" | ")
                    .append(event.title())
                    .append(" @ ")
                    .append(event.location());
        }
        return summary.toString();
    }

    private void validate(Map<String, Object> arguments) {
        if (arguments == null) {
            return;
        }

        validateType(arguments, "start_time");
        validateType(arguments, "end_time");
        validateType(arguments, "keyword");

        LocalDateTime start = parse(arguments.get("start_time"), "start_time");
        LocalDateTime end = parse(arguments.get("end_time"), "end_time");
        if (start != null && end != null && start.isAfter(end)) {
            throw new McpException(McpErrorCodes.INVALID_PARAMS,
                    "start_time must be earlier than or equal to end_time");
        }
    }

    private void validateType(Map<String, Object> arguments, String field) {
        Object value = arguments.get(field);
        if (value == null) {
            return;
        }
        if (!(value instanceof String)) {
            throw new McpException(McpErrorCodes.INVALID_PARAMS, field + " must be string");
        }
    }

    private LocalDateTime parse(Object value, String field) {
        if (value == null) {
            return null;
        }
        String text = value.toString();
        if (text.isBlank()) {
            return null;
        }
        try {
            return LocalDateTime.parse(text, FORMATTER);
        } catch (DateTimeParseException ex) {
            throw new McpException(McpErrorCodes.INVALID_PARAMS,
                    field + " must be ISO-8601 date-time, e.g. 2026-02-11T09:00:00");
        }
    }
}