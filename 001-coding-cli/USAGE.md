# CodeCLI（学习项目）

本项目为学习性质的 CLI 原型，主要用于理解与复刻 Claude Code CLI 的交互与实现思路。仅供学习与研究使用，功能并不完整。

## 快速开始
```powershell
npm install
npm run build
node dist/index.js
```

## 使用说明（Windows / PowerShell）

### 1. 环境要求
- Node.js 18+（建议 LTS）
- PowerShell（Windows Terminal 或系统 PowerShell 均可）

### 2. 安装与构建
```powershell
npm install
npm run build
```

### 3. 启动
```powershell
node dist/index.js
```

启动后会进入交互式 REPL。

### 4. 交互输入
- 单行输入：直接键入后回车
- 多行输入：
  - 行尾输入 `\` 后回车
  - 或 `Ctrl+J` / `Shift+Enter` 直接换行

### 5. 快捷键（已实现）
- `Ctrl+C` 取消当前输入
- `Ctrl+D` 退出
- `Ctrl+L` 清屏（重绘界面）
- `Ctrl+R` 反向搜索历史
- `Ctrl+G` 打开编辑器（默认 notepad）
- `Ctrl+K` 删除光标到行尾（并入 kill-ring）
- `Ctrl+U` 删除当前行（并入 kill-ring）
- `Ctrl+Y` 粘贴（yank）
- `Alt+Y` 循环粘贴历史（yank cycle）
- `Alt+B` / `Alt+F` 按词移动
- `Alt+M` / `Shift+Tab` 切换权限模式
- `Alt+P` 切换模型（MVP 内置占位）
- `Alt+T` 切换 extended thinking（占位）
- 空输入时按 `?` 显示快捷键提示

### 6. 斜杠命令（/）
输入 `/help` 查看命令列表。当前实现：
- `/help`：帮助
- `/clear`：清空会话与历史
- `/config`：显示配置文件路径
- `/permissions`：查看/切换权限模式
- `/plan`：切换到 plan 模式
- `/model`：切换模型（占位）
- `/status`：显示会话信息
- `/statusline`：状态栏配置说明
- `/rewind`：回退到上一条用户输入
- `/tasks`：显示任务列表（占位）

以下命令已注册但为 stub，会提示“未实现”：
`/compact /context /cost /doctor /export /init /mcp /memory /rename /resume /stats /teleport /theme /todos /usage /vim /terminal-setup`

### 7. Shell 模式（!）
以 `!` 开头的输入会通过 PowerShell 执行并回显输出：
```
! dir
! echo hello
```

### 8. 状态栏（Status Line）
在项目根目录创建 `.codecli/settings.json`：
```json
{
  "statusLine": {
    "type": "command",
    "command": "node .codecli/statusline.js"
  }
}
```

示例脚本 `.codecli/statusline.js`：
```js
process.stdin.setEncoding("utf8");
let data = "";
process.stdin.on("data", (c) => (data += c));
process.stdin.on("end", () => {
  process.stdout.write("STATUS: ok\n");
});
```

状态栏每 300ms 最多刷新一次，取 stdout 第一行作为显示内容。

### 9. 数据目录
项目根目录下自动创建 `.codecli/`：
- `settings.json`：配置
- `history`：历史记录
- `transcript.json`：会话日志

### 10. 已知限制（MVP）
- 未实现 `/` 命令联想菜单的选择/补全（目前仅显示提示列表）
- 未实现 `@` 路径补全
- 未实现 Vim 模式
- 未实现后台任务（Ctrl+B）
- 未接入真实模型（当前仅回显占位回复）
- UI 仅对齐结构与边框，未精确复刻所有颜色与装饰

## 说明
- 目前仅支持 Windows + PowerShell。
- 数据与配置存放在项目根目录下的 `.codecli/`。
- 仍有大量功能为占位/未实现（例如 Vim 模式、后台任务、完整模型接入等）。

> 目标：帮助大家从工程角度理解 Claude Code 的终端交互与实现方式。