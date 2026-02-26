# AI项目重写 - 需求文档模板

> 本模板专为AI代码生成优化设计，确保AI能够准确理解需求并生成可执行的代码

---

## 📋 文档元信息

```yaml
project_name: ""
project_type: ""  # web应用/mobile应用/desktop应用/库/API服务等
tech_stack:       # 目标技术栈
  language: ""
  framework: ""
  database: ""
  other: []
ai_compatibility: "AI-READY"  # 标记文档已为AI优化
```

---

## 1. 项目概述

### 1.1 项目目标
> 用一段话清晰描述项目要解决什么问题，为谁解决，如何解决

**格式要求：**
```
[目标用户] 需要 [核心问题]，因此本项目通过 [解决方案] 来实现 [价值主张]
```

### 1.2 核心功能清单
> 列出项目必须具备的功能，便于AI逐个实现

| 功能ID | 功能名称 | 功能描述 | 优先级 |
|--------|----------|----------|--------|
| F001   |          |          | P0     |
| F002   |          |          | P1     |

### 1.3 约束条件
- 技术约束：
- 性能约束：
- 兼容性约束：

---

## 2. 架构设计

### 2.1 系统架构图（可选，用ASCII或描述）
```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   前端层    │ ←→  │   后端层    │ ←→  │   数据层    │
│             │     │             │     │             │
└─────────────┘     └─────────────┘     └─────────────┘
```

### 2.2 目录结构规范
> AI将严格按照此结构生成代码

```
project-root/
├── src/
│   ├── components/      # 可复用组件
│   ├── pages/           # 页面组件
│   ├── services/        # API/业务服务
│   ├── utils/           # 工具函数
│   ├── types/           # 类型定义
│   └── styles/          # 样式文件
├── tests/               # 测试文件
├── docs/                # 文档
└── config/              # 配置文件
```

### 2.3 技术选型理由
> 帮助AI理解设计决策

| 技术点 | 选择 | 理由 |
|--------|------|------|
| 前端框架 |      |      |
| 状态管理 |      |      |
| UI库 |      |      |

---

## 3. 数据模型

### 3.1 数据实体定义
> 以Type Interface或JSON Schema形式定义

```typescript
// 用户实体
interface User {
  id: string;
  username: string;
  email: string;
  createdAt: Date;
  // ...
}

// 产品实体
interface Product {
  id: string;
  name: string;
  price: number;
  description: string;
  // ...
}
```

### 3.2 数据关系图
```
User ──1:N── Order ──N:1── Product
  │                    │
  └───── Address ──────┘
```

---

## 4. 功能详细规格

### 4.1 功能规格模板
> **每个功能使用以下模板详细描述**

#### 功能: [功能名称]

**功能ID:** F001
**优先级:** P0/P1/P2

**用户故事:**
```
作为 [角色]
我想要 [操作]
以便于 [价值]
```

**前置条件:**
- 条件1
- 条件2

**输入参数:**
```typescript
interface InputParams {
  // 参数定义
}
```

**业务规则:**
1. 规则描述
2. 规则描述

**输出/返回:**
```typescript
interface Output {
  // 返回值定义
}
```

**异常处理:**
| 异常情况 | 处理方式 |
|----------|----------|
|          |          |

**UI/交互要求:**
- 页面布局描述
- 交互流程描述
- 特殊状态说明（loading/error/empty）

**验收标准:**
- [ ] 标准1
- [ ] 标准2

---

### 4.2 API规格（如适用）

#### API: [API名称]

**Method:** GET/POST/PUT/DELETE
**Path:** /api/resource
**认证要求:** 是/否

**请求:**
```json
{
  "param1": "type",
  "param2": "type"
}
```

**响应:**
```json
{
  "code": 200,
  "data": {},
  "message": ""
}
```

**错误码:**
| Code | 描述 | 处理 |
|------|------|------|
| 400  |      |      |

---

## 5. 状态管理

### 5.1 全局状态
```typescript
interface GlobalState {
  // 定义需要全局管理的数据
  user: User | null;
  theme: 'light' | 'dark';
  // ...
}
```

### 5.2 状态流转
```
State A → [Action] → State B → [Action] → State C
```

---

## 6. UI设计规范

### 6.1 设计系统
- 颜色规范：
- 字体规范：
- 间距规范：
- 圆角规范：

### 6.2 组件规范
> 定义可复用组件及其props

```typescript
// 示例按钮组件
interface ButtonProps {
  variant: 'primary' | 'secondary' | 'danger';
  size: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  onClick?: () => void;
  children: ReactNode;
}
```

---

## 7. 安全要求

### 7.1 认证授权
- 认证方式：
- 权限模型：
- Token管理：

### 7.2 数据安全
- 敏感数据加密：
- XSS防护：
- CSRF防护：

---

## 8. 测试要求

### 8.1 测试类型
- [ ] 单元测试（覆盖率目标：_%）
- [ ] 集成测试
- [ ] E2E测试

### 8.2 关键测试场景
| 场景 | 测试要点 | 预期结果 |
|------|----------|----------|
|      |          |          |

---

## 9. 部署要求

### 9.1 构建配置
```yaml
build:
  mode: production
  minify: true
  sourcemap: false
```

### 9.2 环境变量
```bash
# 必需的环境变量列表
ENV_VAR_1=value
ENV_VAR_2=value
```

---

## 10. AI执行指令

### 10.1 生成顺序
> AI按以下顺序生成代码，确保依赖关系正确

1. **Phase 1: 项目初始化**
   - 创建目录结构
   - 配置构建工具
   - 安装依赖

2. **Phase 2: 基础设施**
   - 类型定义
   - 工具函数
   - 配置文件

3. **Phase 3: 数据层**
   - 数据模型
   - API服务
   - 状态管理

4. **Phase 4: UI组件**
   - 基础组件
   - 复合组件
   - 页面组件

5. **Phase 5: 功能实现**
   - 按F001→F002→...顺序实现

6. **Phase 6: 测试**
   - 单元测试
   - 集成测试

### 10.2 代码规范

```yaml
coding_standards:
  naming_convention: camelCase # 变量/函数
  component_naming: PascalCase # 组件
  file_naming: kebab-case     # 文件名
  max_line_length: 100
  indent: 2
  semicolons: true
```

### 10.3 注释要求
- 每个文件顶部添加文件描述
- 复杂函数添加JSDoc注释
- TODO标记格式：`// TODO: [描述]`

---

## 11. 参考信息

### 11.1 旧项目路径
```
旧代码位置: [路径]
关键文件: [列出重要文件路径]
```

### 11.2 参考资源
- 设计稿: [链接]
- API文档: [链接]
- 第三方库文档: [链接]

---

## 附录：变更记录

| 版本 | 日期 | 变更内容 | 变更人 |
|------|------|----------|--------|
| 1.0  |      | 初始版本 |        |

---

> **文档生成说明**
> 本模板遵循AI最佳实践设计，确保：
> 1. 结构化数据便于AI解析
> 2. 明确的执行顺序
> 3. 完整的类型定义
> 4. 清晰的验收标准
