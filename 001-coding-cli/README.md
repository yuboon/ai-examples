> 从零开始构建终端 AI 编程助手，探索 REPL 交互、输入缓冲区、终端渲染等技术

# 前言

**重要说明：** 本项目的代码完全由 AI 辅助生成。我扮演产品经理的角色，负责提出需求、明确功能边界，而 AI 负责所有的编码实现。这是一次探索"AI 主导开发"模式的实践。

用过 Claude Code 的开发者都会被它流畅的终端交互体验所吸引。一个简单但功能强大的命令行工具，让 AI 像结对编程伙伴一样在终端中与你协作。

晚上使用AI过程突然心血来潮：能否用 AI 来实现一个类似的工具，顺便了解下这种终端工具是如何实现的 ？说干就干——我只负责描述想要的功能，让 AI 来完成所有的代码编写。

先看看最终实现的效果：

```
┌─ CodeCLI v0.1.0 ───────────────────────────────────────────┐
│ Welcome back!                                              │
│                                                            │
│   ____          _                                         │
│  / ___| ___  __| | ___                                    │
│ | |    / _ \/ _` |/ _ \                                   │
│ | |___|  __/ (_| |  __/                                   │
│  \____|\___|\__,_|\___|                                   │
│                                                            │
│ Project: my-project                                        │
│ Model: Opus                                                │
└────────────────────────────────────────────────────────────┘
──────────────────────────────────────────────────────────────
› _
──────────────────────────────────────────────────────────────
accept edits off (shift+tab to cycle)
```

核心功能包括：
- 流畅的多行输入编辑
- 历史命令搜索
- 斜杠命令系统
- 终端内的 Shell 执行

# 核心架构

项目只有两个核心文件：

```
src/
├── index.ts    # 入口，处理命令行参数
└── repl.ts     # REPL引擎，约1200行
```

虽然 `repl.ts` 代码量不小，但结构非常清晰，可以拆分为几个独立的模块：

```
┌─────────────────────────────────────────────────────┐
│                    CodeCli                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │ InputBuffer │  │  Renderer   │  │  CommandSet │ │
│  │  (输入状态)  │  │  (终端渲染)  │  │  (命令处理)  │ │
│  └─────────────┘  └─────────────┘  └─────────────┘ │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │  History    │  │KillRing     │  │   Message   │ │
│  │  (历史管理)  │  │(复制粘贴)    │  │  (消息队列)  │ │
│  └─────────────┘  └─────────────┘  └─────────────┘ │
└─────────────────────────────────────────────────────┘
```

# 功能介绍

#### 一、输入缓冲区：处理多行编辑

最基础也最关键的是输入缓冲区。它需要维护两个核心状态：文本内容和光标位置。

```typescript
class InputBuffer {
  value = "";      // 当前文本
  cursor = 0;      // 光标位置

  insert(text: string) {
    // 在光标处插入文本，更新光标
    this.value = this.value.slice(0, this.cursor) + text + this.value.slice(this.cursor);
    this.cursor += text.length;
  }

  moveWordLeft() {
    // 跳到前一个单词开头
    let i = this.cursor - 1;
    while (i > 0 && this.isWhitespace(this.value[i])) i--;
    while (i > 0 && this.isWordChar(this.value[i - 1])) i--;
    this.cursor = i;
  }
}
```

**设计要点：**

**1. 光标位置独立跟踪** - 不依赖终端的实际光标，只维护逻辑位置

**2. 多行支持** - 内部用 `\n` 分割，渲染时转换为行列坐标

**3. 词操作** - 类似 Emacs，按单词边界移动（Alt+B/F）

这个设计的巧妙之处在于：输入逻辑与渲染逻辑完全解耦。无论终端怎么变化，InputBuffer 只负责维护正确的文本状态。

#### 二、终端渲染：ANSI 转义序列

终端渲染的核心是使用 ANSI 转义序列控制屏幕：

```typescript
private render() {
  const lines: string[] = [];

  // 1. 构建所有行的内容
  lines.push(header);
  lines.push(...messages);
  lines.push(inputArea);
  lines.push(modeLine);

  // 2. 清屏并输出
  process.stdout.write("\x1b[2J\x1b[H");  // 清屏，光标归位
  process.stdout.write(lines.join("\n"));

  // 3. 定位光标
  process.stdout.write(`\x1b[${row};${col}H`);
}
```

**常用 ANSI 序列：**

| 序列 | 作用 |
|------|------|
| `\x1b[2J` | 清屏 |
| `\x1b[H` | 光标移到左上角 |
| `\x1b[row;colH` | 移动光标到指定位置 |
| `\x1b[?25h` | 显示光标 |
| `\x1b[35m` | 设置颜色（紫色） |

渲染策略采用"全屏刷新"：每次状态变化都重新计算并绘制所有内容。这在现代终端上性能足够好，且代码简洁。

#### 三、键盘事件：原始模式处理

Node.js 默认使用" cooked mode"，需要回车才发送输入。我们需要切换到"raw mode"来捕获每个按键：

```typescript
start() {
  readline.emitKeypressEvents(process.stdin);
  if (process.stdin.isTTY) process.stdin.setRawMode(true);
  process.stdin.on("keypress", (str, key) => this.onKeypress(str, key));
}

private onKeypress(str: string, key: readline.Key) {
  if (key.ctrl && key.name === "c") {
    this.input.setValue("");  // Ctrl+C 清空
  } else if (key.ctrl && key.name === "r") {
    this.startReverseSearch();  // Ctrl+R 历史搜索
  } else if (str && !key.ctrl && !key.meta) {
    this.input.insert(str);  // 普通字符
  }
  this.render();  // 每次按键后重绘
}
```

**事件处理的难点：**

**组合键识别** - Ctrl/Alt/Shift 需要检查 `key.ctrl`、`key.meta` 等标志

**特殊键处理** - 方向键、Home/End 等不会产生可打印字符

**双击 ESC** - 检测两次 ESC 的间隔来判断 rewind 命令

#### 四、历史搜索：仿 Emacs 的 Ctrl+R

历史搜索是提升效率的关键功能。实现思路：

```
┌─────────────────────────────────────────────────────────┐
│  用户输入搜索字符串                                      │
│         ↓                                                │
│  从历史末尾向前遍历查找匹配                              │
│         ↓                                                │
│  实时更新显示的匹配结果                                  │
│         ↓                                                │
│  用户可以继续输入缩小搜索，或 Ctrl+R 查看上一个匹配      │
└─────────────────────────────────────────────────────────┘
```

```typescript
private findHistoryMatch(query: string, startIndex: number): number {
  if (!query) return startIndex;
  for (let i = startIndex; i >= 0; i--) {
    if (this.history[i].includes(query)) return i;
  }
  return -1;
}
```

搜索是交互式的：每输入一个字符就重新搜索，实时显示匹配结果。

#### 五、杀环：Emacs 风格的复制粘贴

"杀环"（Kill Ring）是 Emacs 的概念，比系统剪贴板更强大：

```
操作          效果
─────────────────────────────
Ctrl+K        删除到行尾，存入杀环
Ctrl+U        删除整行，存入杀环
Ctrl+Y        粘贴最新剪切内容
Alt+Y         循环切换剪贴历史
```

```typescript
private killRing: string[] = [];

private pushKillRing(text: string) {
  this.killRing.push(text);  // 记录每次删除
}

private yank() {
  const text = this.killRing[this.killRing.length - 1];
  this.input.insert(text);
  this.lastYankIndex = this.killRing.length - 1;
}

private yankCycle() {
  // Alt+Y：粘贴后循环切换之前剪切的内容
  this.lastYankIndex = this.lastYankIndex <= 0
    ? this.killRing.length - 1
    : this.lastYankIndex - 1;
  // 替换刚才粘贴的内容...
}
```

这个设计让多次剪切的内容都能被访问，比单一剪贴板灵活得多。

#### 六、命令系统：斜杠前缀

命令以 `/` 开头，类似 Discord/Slash 命令：

```
/help      显示帮助
/clear     清空对话
/plan      切换到计划模式
/model     切换AI模型
```

实现核心是一个简单的路由器：

```typescript
private async handleCommand(input: string) {
  const parts = input.slice(1).trim().split(/\s+/);
  const cmd = parts[0];
  const args = parts.slice(1);

  switch (cmd) {
    case "help": return this.showHelp();
    case "clear": return this.clearAll();
    case "plan": this.mode = "plan"; break;
    case "model": this.setModel(args[0]); break;
  }
}
```

**命令补全：** 当用户输入 `/` 时，实时显示匹配的命令列表，提升发现性。

#### 七、Shell 模式：感叹号前缀

用 `!` 前缀可以直接执行 shell 命令：

```typescript
// 用户输入：! git status
private async runShell(command: string) {
  const child = spawn("powershell.exe", ["-Command", command]);
  let output = "";
  child.stdout.on("data", (data) => output += data);
  child.on("close", () => {
    this.appendMessage({ role: "tool", content: output });
  });
}
```

这让你在 AI 对话中无缝执行系统命令，结果直接显示在对话中。

# 写在最后

本文介绍了一个简化版的 Claude Code CLI 的关键功能及相关实现代码。虽然这是一个 MVP 实现，但展示了终端应用开发的核心技术，这些技术可应用于任何需要复杂终端交互的项目。
