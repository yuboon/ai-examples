package com.example.mcpdemo.controller;

import com.example.mcpdemo.model.JsonRpcResponse;
import com.example.mcpdemo.protocol.McpErrorCodes;
import com.example.mcpdemo.protocol.McpException;
import com.example.mcpdemo.protocol.SseSessionManager;
import org.springframework.http.HttpStatus;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {
    private final SseSessionManager sseSessionManager;

    public GlobalExceptionHandler(SseSessionManager sseSessionManager) {
        this.sseSessionManager = sseSessionManager;
    }

    @ExceptionHandler(McpException.class)
    @ResponseStatus(HttpStatus.OK)
    public JsonRpcResponse handleMcpException(McpException ex) {
        sseSessionManager.broadcast("mcp-error", Map.of("message", ex.getMessage(), "code", ex.getCode()));
        return JsonRpcResponse.failure(null, ex.getCode(), ex.getMessage(), ex.getData());
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    @ResponseStatus(HttpStatus.OK)
    public JsonRpcResponse handleInvalidJson(HttpMessageNotReadableException ex) {
        String message = "Invalid JSON payload";
        sseSessionManager.broadcast("mcp-error", Map.of("message", message, "code", McpErrorCodes.PARSE_ERROR));
        return JsonRpcResponse.failure(null, McpErrorCodes.PARSE_ERROR, message, null);
    }

    @ExceptionHandler(Exception.class)
    @ResponseStatus(HttpStatus.OK)
    public JsonRpcResponse handleUnhandledException(Exception ex) {
        sseSessionManager.broadcast("mcp-error", Map.of("message", ex.getMessage(), "code", McpErrorCodes.INTERNAL_ERROR));
        return JsonRpcResponse.failure(null, McpErrorCodes.INTERNAL_ERROR, "Internal server error", null);
    }
}
