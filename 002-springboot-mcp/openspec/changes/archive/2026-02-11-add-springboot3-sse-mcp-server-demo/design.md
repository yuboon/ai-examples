## Context

本变更目标是在现有仓库中提供一个可演示的 SpringBoot3 + SSE MCP 服务器最小实现，覆盖 MCP 工具调用的核心链路：`initialize`、`tools/list`、`tools/call`。
当前项目尚未提供“协议完整 + 示例工具清晰 + 分层易读”的服务端样例。为了让团队成员可在一次演示中看清协议入口、工具注册与业务执行关系，需要先明确统一的技术结构。

约束与前提：
- 以 Demo 可读性优先，不引入复杂基础设施（消息队列、数据库迁移等）。
- 以 MCP 工具能力演示为核心，不扩展与需求无关的协议面。
- SSE 用于服务端事件输出，HTTP 入口保持简洁。

## Goals / Non-Goals

**Goals:**
- 提供可运行的 SpringBoot3 MCP Server Demo，完整支持 `initialize`、`tools/list`、`tools/call`。
- 提供示例工具 `get_calendar_events`，展示“工具声明 + 参数校验 + 业务执行 + 结果返回”。
- 建立清晰的代码组织（协议层、应用层、工具层、模型层），便于演示与扩展。
- 输出最小使用说明，支持本地快速启动与调用验证。

**Non-Goals:**
- 不实现完整 MCP 全量能力（如 prompts/resources 全套协议）。
- 不接入真实第三方日历平台（Google/Outlook 等），仅使用可替换的数据源（内存或 mock service）。
- 不处理生产级 HA、鉴权体系、审计追踪与复杂限流。

## Decisions

### 1) 通信模式：HTTP + SSE 双通道
- 决策：采用一个普通 HTTP 请求入口承载 MCP 请求（JSON-RPC），通过 SSE endpoint 推送事件/响应流。
- 原因：与 SpringBoot3 原生 `SseEmitter` 能力匹配，实现成本低，便于前端/客户端调试。
- 备选方案：
  - WebSocket：双向能力更强，但超出本次 Demo 必要复杂度。
  - 纯 HTTP 同步返回：无法体现 SSE 流式能力，不符合本提案目标。

### 2) 协议处理：统一 MCP 请求分发器
- 决策：定义统一入口控制器 + `McpRequestDispatcher`，按 method 分发到 `initialize` / `tools/list` / `tools/call` 处理器。
- 原因：将协议适配与业务逻辑解耦，后续新增 method 时仅扩展 handler 即可。
- 备选方案：每个 method 单独 Controller。
  - 不采用原因：控制器数量膨胀，协议一致性和日志处理分散。

### 3) 工具机制：注册中心 + 工具接口
- 决策：抽象 `McpTool` 接口（name、schema、invoke），通过 `ToolRegistry` 管理可用工具。
- 原因：演示价值高，新增工具只需新增类并注册，结构直观。
- 备选方案：在 `tools/call` 中使用 `if/else` 或 `switch` 直接分支。
  - 不采用原因：不利于扩展和测试。

### 4) 示例工具：`get_calendar_events` 使用内存数据服务
- 决策：`CalendarService` 返回固定示例事件，并支持按日期范围/关键词过滤。
- 原因：保证演示稳定且不依赖外部网络。
- 备选方案：直连数据库或三方 API。
  - 不采用原因：增加环境搭建成本，不利于快速示范。

### 5) 包结构分层
- 决策：建议结构（示例）
  - `controller`：MCP/SSE HTTP 入口
  - `protocol`：JSON-RPC 与 MCP 方法分发
  - `tool`：工具接口、注册中心、工具实现
  - `service`：日程业务服务
  - `model`：请求/响应 DTO 与 schema
- 原因：对应演示讲解路径“入口 → 协议 → 工具 → 业务”。
- 备选方案：扁平目录。
  - 不采用原因：短期可行，长期可读性差。

## Risks / Trade-offs

- [SSE 连接管理复杂度上升] → 通过统一会话管理器维护 emitter 生命周期、超时和异常关闭。
- [Demo 数据与真实业务差距] → 在文档中明确“示例数据层可替换”，并留出 `CalendarService` 接口扩展点。
- [工具参数校验不足导致误调用] → 在 `tools/call` 入参解析时增加基础 schema 校验与错误响应模板。
- [仅覆盖部分 MCP 能力导致认知偏差] → 在 README 明确当前实现边界（仅 Tools 核心链路）。

## Migration Plan

1. 新增 MCP 协议入口与 SSE endpoint（不影响现有模块）。
2. 新增 ToolRegistry 与 `get_calendar_events` 实现，打通 `tools/list` 与 `tools/call`。
3. 增加示例请求/响应与运行说明，完成本地联调。
4. 验证三条主流程：
   - initialize 成功返回会话能力
   - tools/list 返回工具定义
   - tools/call 成功返回日程数据

回滚策略：
- 若实现不稳定，可整体移除新增 `mcp` 相关包与路由，不影响既有代码路径。

## Open Questions

- 是否需要在本次 Demo 中预留简单鉴权头（如 `X-Client-Id`）以便后续扩展？
- `get_calendar_events` 的输入 schema 是否仅支持日期范围，还是同步支持分页参数？
- SSE 响应是否需要保留事件类型分级（progress/result/error）供前端演示？
