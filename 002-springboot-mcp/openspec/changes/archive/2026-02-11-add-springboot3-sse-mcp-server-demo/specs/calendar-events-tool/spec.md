## ADDED Requirements

### Requirement: Calendar events tool is discoverable
系统 MUST 在 `tools/list` 中暴露 `get_calendar_events` 工具，包含稳定工具名、用途说明与输入参数 schema。

#### Scenario: Tool appears in tools/list
- **WHEN** 客户端调用 `tools/list`
- **THEN** 返回结果 SHALL 包含名称为 `get_calendar_events` 的工具定义

### Requirement: Calendar events query execution
系统 MUST 在接收到 `tools/call(get_calendar_events)` 时执行日程查询逻辑，并返回结构化事件列表。

#### Scenario: Query events with valid filters
- **WHEN** 客户端传入合法查询参数（如日期范围、关键词）调用 `get_calendar_events`
- **THEN** 服务端 SHALL 返回匹配条件的事件数组，每条事件包含标题、开始时间、结束时间等核心字段

#### Scenario: Query events with empty result
- **WHEN** 查询参数合法但无匹配日程
- **THEN** 服务端 SHALL 返回空数组而不是错误

### Requirement: Calendar tool input validation
系统 MUST 对 `get_calendar_events` 输入参数执行基础校验，并在参数不合法时返回标准工具调用错误。

#### Scenario: Invalid date range
- **WHEN** `start_time` 晚于 `end_time`
- **THEN** 服务端 SHALL 返回参数校验失败错误，并指明日期范围无效

#### Scenario: Malformed field type
- **WHEN** 请求参数字段类型与 schema 不匹配
- **THEN** 服务端 SHALL 返回参数类型错误，且不执行查询逻辑
