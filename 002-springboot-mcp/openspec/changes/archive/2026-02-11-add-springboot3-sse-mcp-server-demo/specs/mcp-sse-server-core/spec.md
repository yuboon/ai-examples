## ADDED Requirements

### Requirement: MCP initialize handshake
系统 MUST 支持 `initialize` 方法，并在合法请求下返回服务端能力声明、协议版本与会话初始化信息，以建立后续 MCP 交互上下文。

#### Scenario: Initialize succeeds with valid request
- **WHEN** 客户端发送格式合法的 `initialize` 请求
- **THEN** 服务端 SHALL 返回成功响应，包含协议版本与服务能力信息

#### Scenario: Initialize fails with invalid payload
- **WHEN** 客户端发送缺失必要字段或结构错误的 `initialize` 请求
- **THEN** 服务端 SHALL 返回标准错误响应，并说明参数不合法

### Requirement: MCP tools/list discovery
系统 MUST 支持 `tools/list` 方法，返回当前可用工具列表及每个工具的名称、描述和输入参数 schema。

#### Scenario: List all registered tools
- **WHEN** 客户端调用 `tools/list`
- **THEN** 服务端 SHALL 返回包含 `get_calendar_events` 在内的已注册工具元数据

#### Scenario: Tools list remains consistent in one runtime
- **WHEN** 在同一次服务运行中重复调用 `tools/list`
- **THEN** 服务端 SHALL 返回一致的工具定义结构（除非发生显式配置变更）

### Requirement: MCP tools/call invocation routing
系统 MUST 支持 `tools/call` 方法，并根据工具名将请求路由到对应工具执行器，返回结构化结果或标准错误。

#### Scenario: Call registered tool successfully
- **WHEN** 客户端通过 `tools/call` 调用已注册工具且参数合法
- **THEN** 服务端 SHALL 执行对应工具并返回成功结果

#### Scenario: Call unknown tool
- **WHEN** 客户端通过 `tools/call` 调用未注册工具名
- **THEN** 服务端 SHALL 返回“工具不存在或不可用”的标准错误响应

### Requirement: SSE event channel for MCP responses
系统 MUST 提供 SSE 通道用于事件输出，并保证在连接建立后可发送请求处理结果或错误事件。

#### Scenario: SSE connection established
- **WHEN** 客户端连接 SSE endpoint
- **THEN** 服务端 SHALL 建立可用连接并维持事件推送能力直到连接关闭或超时

#### Scenario: SSE emits error event on processing failure
- **WHEN** 某次 MCP 请求处理过程中出现未捕获异常
- **THEN** 服务端 SHALL 通过 SSE 或对应响应返回可识别的错误事件/错误对象
