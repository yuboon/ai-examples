package com.example.mcpdemo.controller;

import com.example.mcpdemo.protocol.SseSessionManager;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@RestController
@RequestMapping(path = "/mcp/sse", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
public class SseController {
    private final SseSessionManager sseSessionManager;

    public SseController(SseSessionManager sseSessionManager) {
        this.sseSessionManager = sseSessionManager;
    }

    @GetMapping
    public SseEmitter connect(@RequestHeader(value = "X-Client-Id", required = false) String clientId) {
        return sseSessionManager.connect(clientId);
    }
}
