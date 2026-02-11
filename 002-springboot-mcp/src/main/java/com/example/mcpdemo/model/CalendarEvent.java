package com.example.mcpdemo.model;

public record CalendarEvent(
        String id,
        String title,
        String startTime,
        String endTime,
        String location,
        String description
) {
}
