# SpringBoot3 + OpenSpec 实现 MCP 服务器实践

本次主要分享 OpenSpec 的整体开发流程，并以 MCP 工具作为示例进行演示。该示例功能简单，但覆盖了从需求、设计到实现的完整过程，既能帮助理解 OpenSpec 的使用方式，也能让大家掌握 MCP 工具的基本开发流程。

首先对 MCP 与 OpenSpec 进行一点概念普及。

# 一、MCP 协议简介

**MCP（Model Context Protocol）** 是 Anthropic 推出的开放协议，用于规范 AI 应用与外部数据源的交互。

### 解决了什么问题

传统模式下，让 AI 访问数据库、文件系统、第三方 API，每接一个数据源都要写一套对接代码：认证、数据格式解析、错误处理... 重复劳动多，维护成本高。

MCP 规范了一套统一接口，数据源按标准实现后，AI 就能直接调用。

### 核心能力

**Tools** - AI 可调用的函数

**Resources** - AI 可读取的数据

**Prompts** - 预定义的提示模板

协议本身与传输层无关，JSON-RPC 2.0 格式通信。

# 二、OpenSpec 流程简介

**OpenSpec** 是一个工件驱动的开发方法，通过结构化的文档规范开发过程。

### 解决了什么问题

AI 辅助编程时，经常出现：需求理解偏差、代码偏离原始意图、后期验证困难等问题。OpenSpec 通过前置设计和后期验证，减少 AI 开发中的需求偏差和返工。

### 核心工件

| 工件 | 描述 | 提示词 |
|------|------|--------|
| Proposal | 设计提案，记录决策和权衡 | "我需要为 xxx 功能创建一个提案，包含技术选型、架构设计决策" |
| Tasks | 任务拆分 | "基于上面的提案，帮我拆解成具体的开发任务" |
| Design | 详细设计 | "基于任务列表，帮我设计类结构、接口定义" |
| Implementation | 代码实现 | "按照设计文档，实现具体的代码" |
| Verification | 验证归档 | "验证实现是否完整，整理归档" |

### OpenSpec 流程的价值

在 AI 辅助编程场景下，OpenSpec 流程能解决几个常见问题：

- 避免开发过程中需求漂移
- 每一步都有明确的产出物
- 后期验证有据可依
- 归档后可追溯决策过程

# 三、MCP工具开发

### 功能目标

用 SpringBoot3 + SSE 实现一个基础的 MCP 服务器 Demo：

- 支持 Tools 能力
- 代码结构清晰
- 便于演示和讲解

### OpenSpec 工件清单

本项目将产出以下工件：

| 工件 | 内容 |
|------|------|
| Proposal | 技术选型、架构设计决策 |
| Tasks | 任务拆分和依赖关系 |
| Design | 类设计、接口定义 |
| Implementation | 核心代码实现 |
| Verification | 测试结果和归档 |

# 四、Proposal：设计提案

### 提示词模板

```
我想用 SpringBoot3 + SSE 实现一个 MCP 服务器 Demo，帮我创建一个提案。

需求：
- 实现 Tools 能力（initialize、tools/list、tools/call）
- 提供一个示例工具：查询日程（get_calendar_events）
- 代码结构清晰，便于演示
```

### 技术选型决策

**传输层选型**

最初考虑了三种方案：Stdio、WebSocket、SSE。

- Stdio 最简单，官方示例都用这个，但我们的项目是 Web 应用，集成起来不够自然
- WebSocket 功能最强，双向通信，但实现相对复杂
- SSE 基于 HTTP 长连接，实现简单，也符合 MCP 的推送模式

本示例项目使用sse方案。

### 核心抽象设计

MCP 协议定义了多种能力，本 Demo 先聚焦 Tools（工具）。工具是 AI 可调用的函数，后续可根据需求扩展。

### 协议方法

初步确定实现以下方法：

```
initialize     - 初始化握手，协商协议版本
tools/list     - 返回所有可用工具
tools/call     - 执行指定工具
```

---

# 五、Tasks：任务拆分

### 提示词模板

```
基于上面的提案，帮我拆解成具体的开发任务。
```

### 第一次拆解

根据提案，把开发拆成以下任务：

| 任务 | 描述 | 依赖 |
|------|------|------|
| T1 | 项目初始化，添加 Web、SSE 依赖 | 无 |
| T2 | 实现 JSON-RPC 协议模型 | T1 |
| T3 | 实现 SSE Controller | T1 |
| T4 | 实现协议路由器 | T2, T3 |
| T5 | 实现 Tool 接口和注册中心 | T2 |
| T6 | 实现示例工具 | T5 |

# 六、Design：详细设计

### 提示词模板

```
基于任务列表，帮我做详细设计：类结构、核心接口、数据流转。
```

### 整体架构

```
                    AI Client
                        │
                        SSE
                        │
┌─────────────────────────────────────┐
│         SpringBoot Server             │
│                                      │
│   ┌─────────────────────────────┐   │
│   │     MCP Protocol Handler     │   │
│   └─────────────────────────────┘   │
│                    │                  │
│   ┌───────────────┼───────────────┐ │
│   ▼               ▼               ▼ │
│ Tool Registry  Resource Registry  Prompt │
│      │              │               │    │
│      ▼              ▼               ▼    │
│   工具实现       资源实现        提示实现   │
└─────────────────────────────────────┘
```

### 类设计思考

**协议层**

- `JsonRpcRequest` / `JsonRpcResponse` - 纯粹的 POJO，只做序列化/反序列化
- `McpHandler` - 负责请求路由，不关心传输细节

**注册中心**

- `ToolRegistry` - 工具注册中心，利用 Spring 的 `List<Tool>` 自动注入
- 这样的好处是新增工具只需写一个类，不用改配置

**Controller**

- 接收 HTTP POST 请求
- 返回 `SseEmitter` 实现服务端推送
- 超时时间设为 60 秒

### 工具接口设计

```java
public interface McpTool {
    String getName();           // 工具名字
    String getDescription();    // 描述，告诉 AI 什么时候用它
    Map<String, Object> getInputSchema(); // 参数格式
    String execute(Map<String, Object> arguments); // 执行逻辑
}
```

---

# 七、Implementation：实现

### 提示词模板

```
按照设计文档，实现以下功能：
1. JSON-RPC 协议模型（JsonRpcRequest、JsonRpcResponse）
2. 协议处理器（initialize、tools/list、tools/call）
3. SSE Controller（SseEmitter）
4. Tool 接口和注册中心
5. 日程查询工具（GetCalendarEventsTool），根据日期查询日程

使用 SpringBoot3 + Spring Web，用 @Component、@Autowired 进行依赖注入。
```

> 以下代码均由AI根据提案相关内容生成，此处主要为了方便理解贴出了部分关键代码。

### 7.1 项目初始化

用 `start.spring.io` 生成项目骨架，添加了 Spring Web 依赖。

### 7.2 JSON-RPC 协议模型

协议格式是 MCP 规范定义好的，直接照搬：

```java
public class JsonRpcRequest {
    private String jsonrpc = "2.0";
    private String method;
    private Object params;
    private Object id;
}
```

### 7.3 协议处理器的实现

这部分是核心，路由逻辑如下：

```java
public JsonRpcResponse handle(JsonRpcRequest request) {
    return switch (request.getMethod()) {
        case "initialize" -> handleInitialize(request);
        case "tools/list" -> handleListTools(request);
        case "tools/call" -> handleCallTool(request);
        default -> JsonRpcResponse.error(-32601, "方法不存在", request.getId());
    };
}
```

### 7.4 SSE 接口

SSE 接口实现：

```java
@PostMapping(value = "/mcp", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
public ResponseBodyEmitter handle(@RequestBody JsonRpcRequest request) {
    SseEmitter emitter = new SseEmitter(60_000L);
    CompletableFuture.runAsync(() -> {
        try {
            JsonRpcResponse response = mcpHandler.handle(request);
            emitter.send(SseEmitter.event()
                    .data(objectMapper.writeValueAsString(response)));
            emitter.complete();
        } catch (Exception e) {
            emitter.completeWithError(e);
        }
    });
    return emitter;
}
```

### 7.5 工具注册

利用 Spring 的依赖注入：

```java
@Component
public class ToolRegistry {
    private final Map<String, Tool> tools = new ConcurrentHashMap<>();

    @Autowired
    public void registerAllTools(List<Tool> toolList) {
        toolList.forEach(tool -> tools.put(tool.getName(), tool));
    }
}
```

这样所有实现 `Tool` 接口的 `@Component` 都会自动注册进来。

### 7.6 示例工具

写了一个简单的日程查询工具：

```java
@Component
public class GetCalendarEventsTool implements Tool {
    @Override
    public String getName() {
        return "get_calendar_events";
    }

    @Override
    public String getDescription() {
        return "查询指定日期的日历事件";
    }

    @Override
    public String execute(Map<String, Object> arguments) {
        String date = (String) arguments.get("date");
        return "2026-02-10 有 3 个会议";
    }
}
```

# 八、Verification：验证与归档

### 提示词模板

```
验证实现是否完整，帮我生成归档报告。

需要验证：
- JSON-RPC 协议解析和响应（initialize、tools/list、tools/call）
- SSE 传输层
- 日程查询工具（get_calendar_events）调用
```

### 测试结果

**正向测试**

```
→ POST /mcp {"method":"tools/list","id":1}
← {"jsonrpc":"2.0","result":{"tools":[{"name":"get_calendar_events",...}]},"id":1}

→ POST /mcp {"method":"tools/call","params":{"name":"get_calendar_events","arguments":{"date":"2026-02-10"}},"id":2}
← {"jsonrpc":"2.0","result":{"content":[{"type":"text","text":"..."}]},"id":2}
```

**异常测试**

```
→ POST /mcp {"method":"unknown","id":1}
← {"jsonrpc":"2.0","error":{"code":-32601,"message":"方法不存在"},"id":1}
```

### 归档

```
openspec archive --change "<change-name>"
```

---

# 九、在 Claude Code 中测试 MCP 服务器

### 前置条件

确保 MCP 服务器已启动：

```bash
# 编译并启动 SpringBoot 应用
./gradlew bootRun

# 服务器默认在 http://localhost:8080 运行
```

### 配置方法

SSE 方式需要在 MCP 客户端和服务器之间建立 HTTP 连接。一种简单方式是使用 npx 直接调用：

```bash
# 启动 MCP 服务器（另一个终端）

# 添加MCP服务
claude mcp add --transport http --scope user calendar-mcp http://localhost:8080/mcp
```

### 在 Claude Code 中使用

1. 确保 MCP 服务器已启动运行
2. 在 Claude Code 对话中直接测试：
   ```
   请调用 get_calendar_events 工具，查询今天的日程
   ```
3. 如果配置正确，Claude Code 会自动发现可用工具并调用

### 验证步骤

1. 服务器启动后，确认控制台输出 `Started McpServerApplication in x seconds`
2. 测试接口是否正常返回：
   ```bash
   curl -X POST http://localhost:8080/mcp \
     -H "Content-Type: application/json" \
     -d '{"jsonrpc":"2.0","method":"tools/list","id":1}'
   ```

### 验证配置

1. 重启 Claude Code
2. 对话中尝试调用工具：
   - "列出所有可用工具"
   - "查询今天的日程"
3. 如果工具正常返回，说明 MCP 服务器配置成功

# 十、总结

本文基于 SpringBoot3 和 SSE 实现最小可用 MCP 服务器，并通过 OpenSpec 工件驱动流程，从提案到实现完整演示 AI 辅助后端开发的技术落地实践，希望和能给大家一些关于OpenSpec 与 MCP 开发使用的参考。

```

```

