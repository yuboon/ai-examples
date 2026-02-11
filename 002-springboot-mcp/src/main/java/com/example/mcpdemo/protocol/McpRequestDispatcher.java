package com.example.mcpdemo.protocol;

import com.example.mcpdemo.model.JsonRpcRequest;
import com.example.mcpdemo.service.McpToolsService;
import org.springframework.stereotype.Component;

import java.util.Map;

@Component
public class McpRequestDispatcher {
    private final McpToolsService mcpToolsService;

    public McpRequestDispatcher(McpToolsService mcpToolsService) {
        this.mcpToolsService = mcpToolsService;
    }

    public Object dispatch(JsonRpcRequest request) {
        if (request == null || request.getMethod() == null || request.getMethod().isBlank()) {
            throw new McpException(McpErrorCodes.INVALID_REQUEST, "Missing method in request");
        }
        if (request.getJsonrpc() == null || !"2.0".equals(request.getJsonrpc())) {
            throw new McpException(McpErrorCodes.INVALID_REQUEST, "Only JSON-RPC 2.0 is supported");
        }

        return switch (request.getMethod()) {
            case "initialize" -> handleInitialize();
            case "ping" -> Map.of();
            case "notifications/initialized", "initialized" -> Map.of();
            case "tools/list" -> mcpToolsService.listTools();
            case "tools/call" -> mcpToolsService.callTool(request.getParams());
            default -> throw new McpException(McpErrorCodes.METHOD_NOT_FOUND,
                    "Method not found: " + request.getMethod());
        };
    }

    private Map<String, Object> handleInitialize() {
        return Map.of(
                "protocolVersion", "2025-06-18",
                "serverInfo", Map.of(
                        "name", "springboot3-sse-mcp-demo",
                        "version", "0.0.1"
                ),
                "capabilities", Map.of(
                        "tools", Map.of("listChanged", false)
                )
        );
    }
}
