## 1. 项目骨架与协议入口

- [x] 1.1 新建/整理 MCP Demo 包结构（controller、protocol、tool、service、model）
- [x] 1.2 定义 JSON-RPC 基础请求/响应模型与统一错误模型
- [x] 1.3 实现 MCP HTTP 入口控制器并接入统一分发器
- [x] 1.4 新增 SSE endpoint 与连接生命周期管理（建立、超时、关闭、异常）

## 2. MCP Tools 核心能力

- [x] 2.1 实现 `initialize` 处理器并返回协议版本与服务能力
- [x] 2.2 实现 `tools/list` 处理器并返回已注册工具元数据
- [x] 2.3 实现 `tools/call` 处理器并支持按工具名路由执行
- [x] 2.4 补充工具不存在、参数不合法等标准错误返回路径

## 3. 工具注册与示例工具实现

- [x] 3.1 抽象 `McpTool` 接口（name、schema、invoke）
- [x] 3.2 实现 `ToolRegistry`，支持工具注册与按名称查找
- [x] 3.3 实现 `get_calendar_events` 工具定义（描述与输入 schema）
- [x] 3.4 实现 `CalendarService`（内存示例数据 + 日期范围/关键词过滤）
- [x] 3.5 将 `get_calendar_events` 注入注册中心并打通 `tools/list` 与 `tools/call`

## 4. 校验、演示与文档

- [x] 4.1 为 `get_calendar_events` 增加入参校验（类型、时间范围）
- [x] 4.2 完成三条主链路联调：`initialize`、`tools/list`、`tools/call`
- [x] 4.3 补充 README 最小演示说明（启动、SSE 连接、示例请求/响应）
- [x] 4.4 明确 Demo 边界与后续扩展点（鉴权、分页、更多工具）

