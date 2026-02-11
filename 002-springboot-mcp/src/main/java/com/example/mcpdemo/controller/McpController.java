package com.example.mcpdemo.controller;

import com.example.mcpdemo.model.JsonRpcRequest;
import com.example.mcpdemo.model.JsonRpcResponse;
import com.example.mcpdemo.protocol.McpErrorCodes;
import com.example.mcpdemo.protocol.McpException;
import com.example.mcpdemo.protocol.McpRequestDispatcher;
import com.example.mcpdemo.protocol.SseSessionManager;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping(path = "/mcp")
public class McpController {
    private final McpRequestDispatcher dispatcher;
    private final SseSessionManager sseSessionManager;

    public McpController(McpRequestDispatcher dispatcher, SseSessionManager sseSessionManager) {
        this.dispatcher = dispatcher;
        this.sseSessionManager = sseSessionManager;
    }

    @GetMapping(produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter connectMcpSse(
            @RequestHeader(value = "X-Client-Id", required = false) String headerClientId,
            @RequestParam(value = "clientId", required = false) String queryClientId
    ) {
        String clientId = resolveClientId(headerClientId, queryClientId);
        SseEmitter emitter = sseSessionManager.connect(clientId);
        sseSessionManager.sendToClient(clientId, "endpoint", "http://localhost:8080/mcp/messages?clientId=" + clientId);
        return emitter;
    }

    @PostMapping(path = "/messages", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<Void> handleMcpMessage(
            @RequestParam("clientId") String clientId,
            @RequestBody JsonRpcRequest request
    ) {
        if (request == null || request.getId() == null) {
            try {
                dispatcher.dispatch(request);
            } catch (Exception ignored) {
            }
            return ResponseEntity.status(HttpStatus.ACCEPTED).build();
        }

        JsonRpcResponse response;
        try {
            Object result = dispatcher.dispatch(request);
            response = JsonRpcResponse.success(request.getId(), result);
        } catch (McpException ex) {
            response = JsonRpcResponse.failure(request != null ? request.getId() : null, ex.getCode(), ex.getMessage(), ex.getData());
        } catch (Exception ex) {
            response = JsonRpcResponse.failure(request != null ? request.getId() : null,
                    McpErrorCodes.INTERNAL_ERROR,
                    "Internal server error",
                    null);
        }

        sseSessionManager.sendToClient(clientId, "message", response);
        return ResponseEntity.status(HttpStatus.ACCEPTED).build();
    }

    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public JsonRpcResponse handleHttp(
            @RequestBody JsonRpcRequest request,
            @RequestHeader(value = "X-Client-Id", required = false) String clientId
    ) {
        if (request == null || request.getId() == null) {
            dispatcher.dispatch(request);
            return null;
        }

        Object result = dispatcher.dispatch(request);
        JsonRpcResponse response = JsonRpcResponse.success(request.getId(), result);
        sseSessionManager.sendToClient(clientId, "mcp-response", Map.of(
                "method", request.getMethod(),
                "id", request.getId(),
                "status", "ok"
        ));
        return response;
    }

    private String resolveClientId(String headerClientId, String queryClientId) {
        if (headerClientId != null && !headerClientId.isBlank()) {
            return headerClientId.trim();
        }
        if (queryClientId != null && !queryClientId.isBlank()) {
            return queryClientId.trim();
        }
        return UUID.randomUUID().toString();
    }
}
