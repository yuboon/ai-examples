package com.example.mcpdemo.service;

import com.example.mcpdemo.protocol.McpErrorCodes;
import com.example.mcpdemo.protocol.McpException;
import com.example.mcpdemo.tool.McpTool;
import com.example.mcpdemo.tool.ToolRegistry;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class McpToolsService {
    private final ToolRegistry toolRegistry;

    public McpToolsService(ToolRegistry toolRegistry) {
        this.toolRegistry = toolRegistry;
    }

    public Map<String, Object> listTools() {
        List<Map<String, Object>> tools = toolRegistry.list().stream()
                .map(tool -> Map.<String, Object>of(
                        "name", tool.getName(),
                        "description", tool.getDescription(),
                        "inputSchema", tool.getInputSchema()
                ))
                .toList();
        return Map.of("tools", tools);
    }

    @SuppressWarnings("unchecked")
    public Object callTool(Map<String, Object> params) {
        if (params == null) {
            throw new McpException(McpErrorCodes.INVALID_PARAMS, "tools/call requires params");
        }

        Object rawToolName = params.get("name");
        if (!(rawToolName instanceof String toolName) || toolName.isBlank()) {
            throw new McpException(McpErrorCodes.INVALID_PARAMS, "tools/call requires non-empty name");
        }

        Object rawArguments = params.getOrDefault("arguments", new HashMap<String, Object>());
        if (!(rawArguments instanceof Map<?, ?> mapArguments)) {
            throw new McpException(McpErrorCodes.INVALID_PARAMS, "tools/call arguments must be object");
        }

        Map<String, Object> arguments = (Map<String, Object>) mapArguments;
        McpTool tool = toolRegistry.findByName(toolName)
                .orElseThrow(() -> new McpException(McpErrorCodes.TOOL_NOT_FOUND,
                        "Tool not found: " + toolName));

        return tool.invoke(arguments);
    }
}
