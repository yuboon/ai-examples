package com.example.mcpdemo.tool;

import java.util.Map;

public interface McpTool {
    String getName();

    String getDescription();

    Map<String, Object> getInputSchema();

    Object invoke(Map<String, Object> arguments);
}
