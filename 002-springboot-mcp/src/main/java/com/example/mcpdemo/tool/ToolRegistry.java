package com.example.mcpdemo.tool;

import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class ToolRegistry {
    private final Map<String, McpTool> toolMap = new ConcurrentHashMap<>();

    public ToolRegistry(List<McpTool> tools) {
        tools.forEach(tool -> toolMap.put(tool.getName(), tool));
    }

    public List<McpTool> list() {
        return toolMap.values().stream().sorted((a, b) -> a.getName().compareToIgnoreCase(b.getName())).toList();
    }

    public Optional<McpTool> findByName(String name) {
        return Optional.ofNullable(toolMap.get(name));
    }
}
