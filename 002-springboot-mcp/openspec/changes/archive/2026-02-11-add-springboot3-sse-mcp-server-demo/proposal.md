## Why

需要一个可运行、可讲解的 MCP 服务端 Demo，帮助团队快速理解 SpringBoot3 场景下 MCP + SSE 的最小闭环实现方式。
当前缺少一个“协议流程完整（initialize、tools/list、tools/call）+ 业务工具示例明确”的参考项目，因此有必要补充一个结构清晰、便于课堂演示和二次扩展的样例。

## What Changes

- 新增基于 SpringBoot3 的 MCP Server Demo，采用 SSE 作为服务端到客户端的事件推送通道。
- 实现 MCP Tools 相关核心能力：`initialize`、`tools/list`、`tools/call`。
- 新增示例工具 `get_calendar_events`，用于按查询条件返回日程事件数据。
- 明确项目分层与目录组织（协议层、工具注册层、业务服务层、模型层），确保示例代码可读、可扩展。
- 增加最小演示说明（启动方式、调用路径、示例请求/响应），降低上手门槛。

## Capabilities

### New Capabilities
- `mcp-sse-server-core`: 提供基于 SpringBoot3 + SSE 的 MCP 服务端核心能力，覆盖会话初始化与工具生命周期接口（initialize、tools/list、tools/call）。
- `calendar-events-tool`: 提供 `get_calendar_events` 工具定义与调用逻辑，返回结构化的日程查询结果，用于演示工具注册与执行流程。

### Modified Capabilities
- None.

## Impact

- Affected code:
  - `src/main/java/...` 下新增或调整 MCP 协议处理、SSE 推送、工具注册与业务服务实现代码。
  - 可能新增 `model/dto` 与 `tool` 相关包结构以承载请求/响应与工具描述。
- API / Protocol:
  - 对外提供符合 MCP 交互语义的 `initialize`、`tools/list`、`tools/call` 能力。
  - 新增工具名 `get_calendar_events` 及其输入输出约定。
- Dependencies:
  - 基于现有 SpringBoot3 依赖，可能补充与 SSE/MCP 序列化相关的轻量依赖。
- Systems:
  - 主要影响 Demo 应用本身，不涉及外部生产系统改造。
