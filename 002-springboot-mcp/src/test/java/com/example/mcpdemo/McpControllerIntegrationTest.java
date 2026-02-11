package com.example.mcpdemo;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class McpControllerIntegrationTest {

    @Autowired
    private TestRestTemplate restTemplate;

    @Test
    void initializeShouldReturnCapabilities() {
        ResponseEntity<Map> response = post(Map.of(
                "jsonrpc", "2.0",
                "method", "initialize",
                "params", Map.of(),
                "id", 1
        ));

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(response.getBody()).containsKey("result");

        Map<String, Object> result = (Map<String, Object>) response.getBody().get("result");
        assertThat(result).containsKey("protocolVersion");
        assertThat(result).containsKey("capabilities");
    }

    @Test
    void toolsListShouldContainCalendarTool() {
        ResponseEntity<Map> response = post(Map.of(
                "jsonrpc", "2.0",
                "method", "tools/list",
                "params", Map.of(),
                "id", 2
        ));

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        Map<String, Object> result = (Map<String, Object>) response.getBody().get("result");
        assertThat(result).containsKey("tools");
        assertThat(result.get("tools").toString()).contains("get_calendar_events");
    }

    @Test
    void toolsCallShouldReturnCalendarEvents() {
        ResponseEntity<Map> response = post(Map.of(
                "jsonrpc", "2.0",
                "method", "tools/call",
                "params", Map.of(
                        "name", "get_calendar_events",
                        "arguments", Map.of(
                                "start_time", "2026-02-11T00:00:00",
                                "end_time", "2026-02-12T23:59:59"
                        )
                ),
                "id", 3
        ));

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(response.getBody()).containsKey("result");

        Map<String, Object> toolResult = (Map<String, Object>) response.getBody().get("result");
        assertThat(toolResult.get("event_count")).isEqualTo(3);
        assertThat(toolResult.get("has_events")).isEqualTo(true);
        assertThat(toolResult).containsKey("structuredContent");

        Map<String, Object> structuredContent = (Map<String, Object>) toolResult.get("structuredContent");
        assertThat(structuredContent.get("event_count")).isEqualTo(3);
        assertThat(structuredContent.get("has_events")).isEqualTo(true);
        assertThat(structuredContent.get("events").toString()).contains("Daily Standup");

        List<Map<String, Object>> content = (List<Map<String, Object>>) toolResult.get("content");
        assertThat(content).hasSize(1);
        assertThat(content.get(0).get("type")).isEqualTo("text");
        assertThat(content.get(0).get("text").toString()).contains("Found 3 calendar events");
    }

    @Test
    void toolsCallShouldReturnErrorForUnknownTool() {
        ResponseEntity<Map> response = post(Map.of(
                "jsonrpc", "2.0",
                "method", "tools/call",
                "params", Map.of(
                        "name", "unknown_tool",
                        "arguments", Map.of()
                ),
                "id", 4
        ));

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(response.getBody()).containsKey("error");
        Map<String, Object> error = (Map<String, Object>) response.getBody().get("error");
        assertThat(error.get("code")).isEqualTo(-32001);
    }

    private ResponseEntity<Map> post(Map<String, Object> payload) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("X-Client-Id", "test-client");
        return restTemplate.postForEntity("/mcp", new HttpEntity<>(payload, headers), Map.class);
    }
}