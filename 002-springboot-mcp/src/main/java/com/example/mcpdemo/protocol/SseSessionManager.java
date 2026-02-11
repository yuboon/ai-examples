package com.example.mcpdemo.protocol;

import org.springframework.stereotype.Component;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class SseSessionManager {
    private static final long SSE_TIMEOUT_MS = 60_000L;
    private final Map<String, SseEmitter> emitters = new ConcurrentHashMap<>();

    public SseEmitter connect(String clientId) {
        String key = normalizeClientId(clientId);
        SseEmitter emitter = new SseEmitter(SSE_TIMEOUT_MS);
        emitters.put(key, emitter);

        emitter.onCompletion(() -> emitters.remove(key));
        emitter.onTimeout(() -> {
            emitters.remove(key);
            emitter.complete();
        });
        emitter.onError(ex -> emitters.remove(key));
        return emitter;
    }

    public void sendToClient(String clientId, String eventName, Object payload) {
        String key = normalizeClientId(clientId);
        SseEmitter emitter = emitters.get(key);
        if (emitter == null) {
            return;
        }

        try {
            emitter.send(SseEmitter.event()
                    .name(eventName)
                    .data(payload));
        } catch (IOException ex) {
            emitters.remove(key);
            emitter.completeWithError(ex);
        }
    }

    public void broadcast(String eventName, Object payload) {
        emitters.keySet().forEach(clientId -> sendToClient(clientId, eventName, payload));
    }

    private String normalizeClientId(String clientId) {
        return (clientId == null || clientId.isBlank()) ? "default" : clientId.trim();
    }
}
