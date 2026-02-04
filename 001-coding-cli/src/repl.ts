import readline from "readline";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { spawn, spawnSync } from "child_process";

// 该文件实现一个面向学习的终端 REPL：
// - 处理键盘输入（raw mode）与光标移动
// - 管理会话消息、历史记录、状态栏
// - 渲染“类似 Claude Code”布局的终端 UI
type Mode = "normal" | "plan" | "auto";

type Role = "user" | "assistant" | "system" | "tool";

interface Message {
  role: Role;
  content: string;
}

interface StatusLineConfig {
  type: "command";
  command: string;
  padding?: number;
}

interface Settings {
  statusLine?: StatusLineConfig;
}

interface ModelInfo {
  id: string;
  displayName: string;
}

interface ReverseSearchState {
  query: string;
  match: string;
  matchIndex: number;
  originalInput: string;
}

interface TaskItem {
  id: string;
  status: "pending" | "in_progress" | "done";
  title: string;
}

// 输入缓冲区：
// - 保存当前多行输入
// - 维护光标在整段文本中的索引
// - 提供编辑原语（插入、删除、按词移动）
class InputBuffer {
  value = "";
  cursor = 0;

  setValue(text: string) {
    this.value = text;
    this.cursor = text.length;
  }

  setValueAndCursor(text: string, cursor: number) {
    this.value = text;
    this.cursor = Math.max(0, Math.min(cursor, text.length));
  }

  insert(text: string) {
    if (text.length === 0) return;
    this.value = this.value.slice(0, this.cursor) + text + this.value.slice(this.cursor);
    this.cursor += text.length;
  }

  backspace() {
    if (this.cursor === 0) return;
    this.value = this.value.slice(0, this.cursor - 1) + this.value.slice(this.cursor);
    this.cursor -= 1;
  }

  delete() {
    if (this.cursor >= this.value.length) return;
    this.value = this.value.slice(0, this.cursor) + this.value.slice(this.cursor + 1);
  }

  moveLeft() {
    if (this.cursor > 0) this.cursor -= 1;
  }

  moveRight() {
    if (this.cursor < this.value.length) this.cursor += 1;
  }

  moveHome() {
    const { line } = this.getCursorLineCol();
    const lines = this.getLines();
    const idx = this.getIndexFromLineCol(lines, line, 0);
    this.cursor = idx;
  }

  moveEnd() {
    const { line } = this.getCursorLineCol();
    const lines = this.getLines();
    const idx = this.getIndexFromLineCol(lines, line, lines[line].length);
    this.cursor = idx;
  }

  moveUp() {
    const lines = this.getLines();
    const { line, col } = this.getCursorLineCol();
    if (line === 0) return;
    const targetCol = Math.min(col, lines[line - 1].length);
    this.cursor = this.getIndexFromLineCol(lines, line - 1, targetCol);
  }

  moveDown() {
    const lines = this.getLines();
    const { line, col } = this.getCursorLineCol();
    if (line >= lines.length - 1) return;
    const targetCol = Math.min(col, lines[line + 1].length);
    this.cursor = this.getIndexFromLineCol(lines, line + 1, targetCol);
  }

  moveWordLeft() {
    if (this.cursor === 0) return;
    let i = this.cursor - 1;
    while (i > 0 && this.isWhitespace(this.value[i])) i -= 1;
    while (i > 0 && this.isWordChar(this.value[i - 1])) i -= 1;
    this.cursor = i;
  }

  moveWordRight() {
    let i = this.cursor;
    while (i < this.value.length && this.isWhitespace(this.value[i])) i += 1;
    while (i < this.value.length && this.isWordChar(this.value[i])) i += 1;
    this.cursor = i;
  }

  newline() {
    this.insert("\n");
  }

  deleteToEndOfLine(): string {
    const lines = this.getLines();
    const info = this.getCursorLineCol();
    const lineText = lines[info.line];
    // 光标在行尾时，删除换行符（合并下一行）。
    if (info.col >= lineText.length) {
      if (info.line < lines.length - 1) {
        const deleted = "\n";
        lines[info.line] = lineText + lines[info.line + 1];
        lines.splice(info.line + 1, 1);
        this.setValueAndCursor(lines.join("\n"), this.cursor);
        return deleted;
      }
      return "";
    }
    const deleted = lineText.slice(info.col);
    lines[info.line] = lineText.slice(0, info.col);
    this.setValueAndCursor(lines.join("\n"), this.getIndexFromLineCol(lines, info.line, info.col));
    return deleted;
  }

  deleteLine(): string {
    const lines = this.getLines();
    const info = this.getCursorLineCol();
    const deleted = lines[info.line] + (info.line < lines.length - 1 ? "\n" : "");
    lines.splice(info.line, 1);
    if (lines.length === 0) {
      this.setValueAndCursor("", 0);
      return deleted;
    }
    const line = Math.min(info.line, lines.length - 1);
    const col = Math.min(info.col, lines[line].length);
    this.setValueAndCursor(lines.join("\n"), this.getIndexFromLineCol(lines, line, col));
    return deleted;
  }

  getCursorLineCol(): { line: number; col: number } {
    const before = this.value.slice(0, this.cursor);
    const parts = before.split("\n");
    return { line: parts.length - 1, col: parts[parts.length - 1].length };
  }

  getLines(): string[] {
    return this.value.split("\n");
  }

  private getIndexFromLineCol(lines: string[], line: number, col: number): number {
    // 把 (line, col) 转换为在整个字符串中的绝对索引。
    let idx = 0;
    for (let i = 0; i < line; i += 1) idx += lines[i].length + 1;
    return idx + col;
  }

  private isWordChar(ch: string): boolean {
    return /[A-Za-z0-9_]/.test(ch);
  }

  private isWhitespace(ch: string): boolean {
    return ch === " " || ch === "\t" || ch === "\n" || ch === "\r";
  }
}

export class CodeCli {
  // 核心 REPL 类：负责键盘输入、命令分发、渲染与会话状态管理。
  private projectDir: string;
  private version: string;
  private dataDir: string;
  private settingsPath: string;
  private historyPath: string;
  private transcriptPath: string;
  private sessionId: string;

  // 输入与消息历史（会话内存）。
  private input = new InputBuffer();
  private messages: Message[] = [];
  private history: string[] = [];
  private historyIndex = 0;

  // 权限/交互模式（Normal / Plan / Auto）。
  private mode: Mode = "normal";
  private verbose = false;
  private thinking = false;
  private modelIndex = 0;
  // 可选模型列表（MVP 占位，便于演示切换）。
  private models: ModelInfo[] = [
    { id: "claude-opus-4-1", displayName: "Opus" },
    { id: "claude-sonnet-4-0", displayName: "Sonnet" }
  ];

  // Slash 命令注册表（用于提示与 dispatch）。
  private commands: { name: string; description: string; implemented: boolean }[] = [
    { name: "help", description: "Show help", implemented: true },
    { name: "clear", description: "Clear conversation + history", implemented: true },
    { name: "config", description: "Show config path", implemented: true },
    { name: "permissions", description: "Show or change permission mode", implemented: true },
    { name: "plan", description: "Switch to plan mode", implemented: true },
    { name: "model", description: "Switch model", implemented: true },
    { name: "status", description: "Show session info", implemented: true },
    { name: "statusline", description: "Show status line help", implemented: true },
    { name: "rewind", description: "Rewind to previous user input", implemented: true },
    { name: "tasks", description: "Toggle task list", implemented: true },
    { name: "compact", description: "Compact context", implemented: false },
    { name: "context", description: "Show context", implemented: false },
    { name: "cost", description: "Show cost summary", implemented: false },
    { name: "doctor", description: "Diagnostics", implemented: false },
    { name: "export", description: "Export conversation", implemented: false },
    { name: "init", description: "Initialize project settings", implemented: false },
    { name: "mcp", description: "MCP configuration", implemented: false },
    { name: "memory", description: "Manage memory", implemented: false },
    { name: "rename", description: "Rename session", implemented: false },
    { name: "resume", description: "Resume session", implemented: false },
    { name: "stats", description: "Show stats", implemented: false },
    { name: "teleport", description: "Teleport between sessions", implemented: false },
    { name: "theme", description: "Change theme", implemented: false },
    { name: "todos", description: "Show todos", implemented: false },
    { name: "usage", description: "Show usage", implemented: false },
    { name: "vim", description: "Toggle vim mode", implemented: false },
    { name: "terminal-setup", description: "Configure terminal input", implemented: false }
  ];

  // 状态栏配置与缓存。
  private settings: Settings = {};
  private statusLine = "";
  private statusLineTimer?: NodeJS.Timeout;
  private lastStatusLineAt = 0;

  // Ctrl+R 反向搜索状态。
  private search: ReverseSearchState | null = null;
  private lastEscAt = 0;

  // kill ring：配合 Ctrl+K/Ctrl+U 和 Ctrl+Y/Alt+Y。
  private killRing: string[] = [];
  private lastYankIndex = -1;
  private lastYankLength = 0;

  // 任务列表（MVP 占位）。
  private showTasks = false;
  private tasks: TaskItem[] = [];

  private busy = false;
  // 启动时间，用于 banner/状态显示。
  private startedAt = Date.now();

  // 初始化：确定目录、读取配置与历史。
  constructor(opts: { projectDir: string; version?: string }) {
    this.projectDir = opts.projectDir;
    this.version = opts.version ?? "0.0.0";
    this.dataDir = path.join(this.projectDir, ".codecli");
    this.settingsPath = path.join(this.dataDir, "settings.json");
    this.historyPath = path.join(this.dataDir, "history");
    this.transcriptPath = path.join(this.dataDir, "transcript.json");
    this.sessionId = crypto.randomUUID();

    this.ensureDataDir();
    this.loadSettings();
    this.loadHistory();
  }

  // 启动 REPL：进入 raw mode 并开始监听按键。
  start() {
    readline.emitKeypressEvents(process.stdin);
    if (process.stdin.isTTY) process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on("keypress", (str, key) => void this.onKeypress(str, key));
    process.on("SIGWINCH", () => this.render());
    this.render();
  }

  // 确保 .codecli 数据目录存在。
  private ensureDataDir() {
    fs.mkdirSync(this.dataDir, { recursive: true });
  }

  // 读取 .codecli/settings.json（如果存在）。
  private loadSettings() {
    if (!fs.existsSync(this.settingsPath)) {
      this.settings = {};
      return;
    }
    try {
      const raw = fs.readFileSync(this.settingsPath, "utf8");
      this.settings = JSON.parse(raw) as Settings;
    } catch {
      this.settings = {};
    }
  }

  // 读取历史记录文件（简单按行存储）。
  private loadHistory() {
    if (!fs.existsSync(this.historyPath)) {
      this.history = [];
      this.historyIndex = 0;
      return;
    }
    const raw = fs.readFileSync(this.historyPath, "utf8");
    this.history = raw.split(/\r?\n/).filter((line) => line.trim().length > 0);
    this.historyIndex = this.history.length;
  }

  // 保存历史（覆盖写入）。
  private saveHistory() {
    fs.writeFileSync(this.historyPath, this.history.join("\n"), "utf8");
  }

  // 保存会话 transcript（供 status line 或调试使用）。
  private saveTranscript() {
    const payload = {
      session_id: this.sessionId,
      messages: this.messages
    };
    fs.writeFileSync(this.transcriptPath, JSON.stringify(payload, null, 2), "utf8");
  }

  // 键盘事件主入口：根据不同组合键触发编辑、命令或渲染逻辑。
  private async onKeypress(str: string, key: readline.Key) {
    if (this.busy) return;

    // 反向搜索模式下，按键全部交给 search handler。
    if (this.search) {
      await this.handleReverseSearchKey(str, key);
      return;
    }

    // 空输入时按 ? 显示快捷键提示。
    if (str === "?" && this.input.value.length === 0) {
      this.appendSystem(this.shortcutsHelp());
      return;
    }

    if (key.ctrl && key.name === "c") {
      this.input.setValue("");
      this.render();
      return;
    }

    if (key.ctrl && key.name === "d") {
      this.exit();
      return;
    }

    if (key.ctrl && key.name === "l") {
      this.render();
      return;
    }

    if (key.ctrl && key.name === "o") {
      this.verbose = !this.verbose;
      this.appendSystem(`Verbose: ${this.verbose ? "on" : "off"}`);
      return;
    }

    if (key.ctrl && key.name === "g") {
      await this.openInEditor();
      return;
    }

    if (key.ctrl && key.name === "r") {
      this.startReverseSearch();
      return;
    }

    if (key.ctrl && key.name === "b") {
      this.appendSystem("Background tasks are not implemented in MVP.");
      return;
    }

    if (key.ctrl && key.name === "t") {
      this.showTasks = !this.showTasks;
      this.render();
      return;
    }

    if (key.ctrl && key.name === "k") {
      const deleted = this.input.deleteToEndOfLine();
      if (deleted) this.pushKillRing(deleted);
      this.render();
      return;
    }

    if (key.ctrl && key.name === "u") {
      const deleted = this.input.deleteLine();
      if (deleted) this.pushKillRing(deleted);
      this.render();
      return;
    }

    if (key.ctrl && key.name === "y") {
      this.yank();
      this.render();
      return;
    }

    if (key.meta && key.name === "y") {
      this.yankCycle();
      this.render();
      return;
    }

    if (key.meta && key.name === "b") {
      this.input.moveWordLeft();
      this.render();
      return;
    }

    if (key.meta && key.name === "f") {
      this.input.moveWordRight();
      this.render();
      return;
    }

    if (key.meta && key.name === "m") {
      this.toggleMode();
      return;
    }

    if (key.meta && key.name === "p") {
      this.cycleModel();
      return;
    }

    if (key.meta && key.name === "t") {
      this.thinking = !this.thinking;
      this.appendSystem(`Extended thinking: ${this.thinking ? "on" : "off"}`);
      return;
    }

    if (key.name === "escape") {
      const now = Date.now();
      if (now - this.lastEscAt < 500) {
        this.lastEscAt = 0;
        this.rewind();
        return;
      }
      this.lastEscAt = now;
      return;
    }

    if (key.name === "tab" && key.shift) {
      this.toggleMode();
      return;
    }

    if (key.name === "tab") {
      if (this.input.value.startsWith("!")) {
        this.autocompleteBangHistory();
        return;
      }
      return;
    }

    if (key.ctrl && (key.name === "v" || key.name === "insert")) {
      this.appendSystem("Image paste is not implemented in MVP.");
      return;
    }

    if (key.meta && key.name === "v") {
      this.appendSystem("Image paste is not implemented in MVP.");
      return;
    }

    if (key.name === "return") {
      if (this.input.value.endsWith("\\")) {
        this.input.setValueAndCursor(
          this.input.value.slice(0, -1) + "\n",
          this.input.cursor
        );
        this.render();
        return;
      }
      await this.submitInput();
      return;
    }

    if (key.ctrl && key.name === "j") {
      this.input.newline();
      this.render();
      return;
    }

    if (key.shift && key.name === "return") {
      this.input.newline();
      this.render();
      return;
    }

    if (key.name === "backspace") {
      this.input.backspace();
      this.render();
      return;
    }

    if (key.name === "delete") {
      this.input.delete();
      this.render();
      return;
    }

    if (key.name === "left") {
      this.input.moveLeft();
      this.render();
      return;
    }

    if (key.name === "right") {
      this.input.moveRight();
      this.render();
      return;
    }

    if (key.name === "up") {
      this.historyPrev();
      this.render();
      return;
    }

    if (key.name === "down") {
      this.historyNext();
      this.render();
      return;
    }

    if (key.name === "home") {
      this.input.moveHome();
      this.render();
      return;
    }

    if (key.name === "end") {
      this.input.moveEnd();
      this.render();
      return;
    }

    if (str && !key.ctrl && !key.meta) {
      const normalized = str.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
      this.input.insert(normalized);
      this.render();
    }
  }

  // 提交当前输入：区分 / 命令、! Shell、普通对话。
  private async submitInput() {
    const raw = this.input.value;
    const text = raw.trimEnd();
    if (!text) {
      this.input.setValue("");
      this.render();
      return;
    }

    this.history.push(text);
    this.historyIndex = this.history.length;
    this.saveHistory();

    this.input.setValue("");

    if (text.startsWith("/")) {
      await this.handleCommand(text);
      return;
    }

    if (text.startsWith("!")) {
      await this.runShell(text.slice(1).trim());
      return;
    }

    if (text.startsWith("#")) {
      this.appendSystem("Memory shortcut is not implemented in MVP.");
      return;
    }

    this.appendMessage({ role: "user", content: text });
    this.appendMessage({
      role: "assistant",
      content: `MVP reply (mode=${this.mode}). Model integration is not wired yet.\nYou said: ${text}`
    });
  }

  // Slash 命令分发。
  private async handleCommand(input: string) {
    const parts = input.slice(1).trim().split(/\s+/).filter(Boolean);
    const cmd = parts[0] ?? "";
    const args = parts.slice(1);

    if (!cmd) {
      this.appendSystem(this.commandHelp());
      return;
    }

    switch (cmd) {
      case "help":
        this.appendSystem(this.commandHelp());
        break;
      case "clear":
        this.messages = [];
        this.history = [];
        this.historyIndex = 0;
        this.saveHistory();
        this.render();
        break;
      case "compact":
      case "context":
      case "cost":
      case "doctor":
      case "export":
      case "init":
      case "mcp":
      case "memory":
      case "rename":
      case "resume":
      case "stats":
      case "teleport":
      case "theme":
      case "todos":
      case "usage":
      case "terminal-setup":
      case "vim":
        this.appendSystem(`/${cmd} is not implemented in MVP.`);
        break;
      case "exit":
        this.exit();
        break;
      case "config":
        this.appendSystem(`Settings path: ${this.settingsPath}`);
        break;
      case "permissions":
        if (args[0]) {
          this.setMode(args[0]);
        } else {
          this.appendSystem(`Permission mode: ${this.mode}`);
        }
        break;
      case "plan":
        this.mode = "plan";
        this.appendSystem("Plan mode enabled.");
        break;
      case "statusline":
        this.appendSystem(this.statusLineHelp());
        break;
      case "model":
        if (args[0]) {
          this.setModelByName(args[0]);
        } else {
          this.cycleModel();
        }
        break;
      case "rewind":
        this.rewind();
        break;
      case "tasks":
        this.showTasks = true;
        this.render();
        break;
      case "status":
        this.appendSystem(`Session: ${this.sessionId} | Model: ${this.models[this.modelIndex].displayName}`);
        break;
      default:
        this.appendSystem(`Command not implemented: /${cmd || ""}`.trim());
        break;
    }
  }

  // /help 文本内容。
  private commandHelp(): string {
    return [
      "Built-in commands (MVP):",
      "/clear /compact /config /context /cost /doctor /exit /export /help /init /mcp /memory",
      "/model /permissions /plan /rename /resume /rewind /stats /status /statusline /tasks /teleport /theme /todos /usage /vim /terminal-setup",
      "",
      "Shortcuts (MVP):",
      "Ctrl+C Ctrl+D Ctrl+L Ctrl+O Ctrl+R Ctrl+G Ctrl+K Ctrl+U Ctrl+Y",
      "Alt+B Alt+F Alt+M Alt+P Alt+T Shift+Tab",
      "Use ! for shell mode. Use \\ + Enter for multiline."
    ].join("\n");
  }

  // ? 快捷键提示文本。
  private shortcutsHelp(): string {
    return [
      "Shortcuts (MVP):",
      "Ctrl+C cancel, Ctrl+D exit, Ctrl+L clear, Ctrl+G open editor, Ctrl+R reverse search",
      "Ctrl+K delete to end, Ctrl+U delete line, Ctrl+Y paste, Alt+Y cycle paste",
      "Alt+B/Alt+F word move, Shift+Tab/Alt+M mode toggle, Alt+P model, Alt+T thinking",
      "Use ! for shell mode, / for commands, \\ + Enter or Ctrl+J for multiline"
    ].join("\n");
  }

  // /statusline 帮助信息。
  private statusLineHelp(): string {
    return [
      "Status line config uses .codecli/settings.json.",
      "Example:",
      JSON.stringify(
        {
          statusLine: {
            type: "command",
            command: "path-to-your-script",
            padding: 0
          }
        },
        null,
        2
      )
    ].join("\n");
  }

  // 根据文本切换权限模式（支持 auto/auto-accept/plan/normal）。
  private setMode(raw: string) {
    const value = raw.toLowerCase();
    if (value === "auto" || value === "auto-accept") this.mode = "auto";
    else if (value === "plan") this.mode = "plan";
    else this.mode = "normal";
    this.appendSystem(`Permission mode: ${this.mode}`);
  }

  // 循环切换权限模式：normal -> plan -> auto -> normal。
  private toggleMode() {
    if (this.mode === "normal") this.mode = "plan";
    else if (this.mode === "plan") this.mode = "auto";
    else this.mode = "normal";
    this.appendSystem(`Permission mode: ${this.mode}`);
  }

  // 循环切换模型（MVP 占位）。
  private cycleModel() {
    this.modelIndex = (this.modelIndex + 1) % this.models.length;
    this.appendSystem(`Model: ${this.models[this.modelIndex].displayName}`);
  }

  // 根据名称切换模型（id 或 displayName）。
  private setModelByName(name: string) {
    const idx = this.models.findIndex((m) => m.id === name || m.displayName.toLowerCase() === name.toLowerCase());
    if (idx >= 0) {
      this.modelIndex = idx;
      this.appendSystem(`Model: ${this.models[this.modelIndex].displayName}`);
    } else {
      this.appendSystem(`Unknown model: ${name}`);
    }
  }

  // 以 PowerShell 执行命令，并把输出写回会话。
  private async runShell(command: string) {
    if (!command) {
      this.appendSystem("No command to run.");
      return;
    }

    this.appendMessage({ role: "user", content: `! ${command}` });
    this.busy = true;

    const output = await this.execPowerShell(command);
    const content = output.trim().length > 0 ? output.trimEnd() : "(no output)";
    this.appendMessage({ role: "tool", content });
    this.busy = false;
  }

  // 执行 PowerShell 并合并 stdout/stderr。
  private execPowerShell(command: string): Promise<string> {
    return new Promise((resolve) => {
      const child = spawn("powershell.exe", ["-NoProfile", "-Command", command], {
        cwd: this.projectDir,
        windowsHide: true
      });

      let out = "";
      child.stdout.on("data", (data) => {
        out += data.toString();
      });
      child.stderr.on("data", (data) => {
        out += data.toString();
      });
      child.on("close", (code) => {
        out += code === 0 ? "" : `\n(exit code: ${code})`;
        resolve(out);
      });
    });
  }

  // 追加消息并刷新 UI。
  private appendMessage(msg: Message) {
    this.messages.push(msg);
    this.saveTranscript();
    this.scheduleStatusLine();
    this.render();
  }

  // 追加系统消息（用于提示/错误/状态）。
  private appendSystem(text: string) {
    this.appendMessage({ role: "system", content: text });
  }

  // 全量渲染：构建“顶部 → 消息区 → 输入框 → 模式行”的布局。
  private render() {
    const { columns, rows } = this.getTerminalSize();
    const lines: string[] = [];

    const header = this.headerLine();
    if (header.length > 0) {
      lines.push(header);
      lines.push(this.separatorLine(columns));
    }

    const messageLines: string[] = [];
    const banner = this.shouldShowBanner() ? this.bannerLines(columns) : [];
    if (banner.length > 0) {
      messageLines.push(...banner);
    }
    for (const msg of this.messages) {
      const prefix = msg.role === "user" ? "You: " : msg.role === "assistant" ? "Claude: " : msg.role === "tool" ? "Tool: " : "System: ";
      const msgParts = msg.content.split("\n");
      messageLines.push(prefix + msgParts[0]);
      for (let i = 1; i < msgParts.length; i += 1) {
        messageLines.push(" ".repeat(prefix.length) + msgParts[i]);
      }
    }

    if (this.showTasks) {
      messageLines.push("Tasks:");
      if (this.tasks.length === 0) {
        messageLines.push("  (none)");
      } else {
        for (const task of this.tasks.slice(0, 10)) {
          messageLines.push(`  [${task.status}] ${task.id} ${task.title}`);
        }
      }
    }

    const prompt = this.search ? "(reverse-i-search)" : this.promptText();
    const rawInputLines = this.search
      ? [` ${this.search.query}: ${this.search.match ?? ""}`]
      : this.input.value.split("\n");
    const suggestionLines = this.commandSuggestions();
    const headerLinesCount = header.length > 0 ? 2 : 0;
    const footerFixed = 3; // separator + separator + mode line
    const availableRows = Math.max(0, rows - headerLinesCount - footerFixed);
    const maxInputLines = Math.max(1, availableRows);
    const inputStart = Math.max(0, rawInputLines.length - maxInputLines);
    const visibleInput = rawInputLines.slice(inputStart);

    const availableForMessages = Math.max(
      0,
      rows - headerLinesCount - footerFixed - visibleInput.length - suggestionLines.length
    );
    const visibleMessages = availableForMessages >= messageLines.length ? messageLines : messageLines.slice(-availableForMessages);
    lines.push(...visibleMessages);
    if (suggestionLines.length > 0) {
      lines.push(...suggestionLines);
    }

    lines.push(this.separatorLine(columns));

    const promptPadding = " ".repeat(prompt.length);
    for (let i = 0; i < visibleInput.length; i += 1) {
      const line = visibleInput[i];
      if (i === 0) lines.push(prompt + line);
      else lines.push(promptPadding + line);
    }

    lines.push(this.separatorLine(columns));
    lines.push(this.modeLineText());

    let cursorCol = prompt.length;
    let cursorRow = lines.length - visibleInput.length - 2;

    if (!this.search) {
      const cursor = this.input.getCursorLineCol();
      const visibleCursorLine = cursor.line - inputStart;
      if (visibleCursorLine >= 0 && visibleCursorLine < visibleInput.length) {
        cursorRow = lines.length - visibleInput.length - 2 + visibleCursorLine;
        cursorCol = prompt.length + cursor.col;
      }
    } else {
      cursorCol = prompt.length + 1 + this.search.query.length;
    }

    this.draw(lines, cursorCol, cursorRow);
  }

  // 当输入以 / 开头时，展示命令提示列表（仅展示，不做补全选择）。
  private commandSuggestions(): string[] {
    if (this.search) return [];
    const firstLine = this.input.value.split("\n")[0] ?? "";
    if (!firstLine.startsWith("/")) return [];
    const token = firstLine.slice(1).split(/\s+/)[0] ?? "";
    const prefix = token.trim();
    const matches = this.commands.filter((cmd) =>
      prefix.length === 0 ? true : cmd.name.startsWith(prefix)
    );
    if (matches.length === 0) return [];
    const max = 8;
    const items = matches.slice(0, max);
    const lines = ["Commands:"];
    for (const item of items) {
      const suffix = item.implemented ? "" : " (stub)";
      lines.push(`/${item.name} - ${item.description}${suffix}`);
    }
    if (matches.length > max) {
      lines.push(`... ${matches.length - max} more`);
    }
    return lines;
  }

  // 逐行绘制：避免 Windows 终端滚屏累积（每行先清空再写入）。
  private draw(lines: string[], cursorCol: number, cursorRow?: number) {
    const out = process.stdout;
    const { columns: maxCols, rows: maxRows } = this.getTerminalSize();
    const safeLines = lines.map((line) => this.truncateLine(line, maxCols));
    out.write("\x1b[?25l");
    for (let row = 0; row < maxRows; row += 1) {
      out.write(`\x1b[${row + 1};1H\x1b[2K`);
      if (row < safeLines.length) {
        out.write(safeLines[row]);
      }
    }
    const row = cursorRow ?? lines.length - 1;
    const safeRow = Math.max(0, Math.min(row, maxRows - 1));
    const safeCol = Math.max(0, Math.min(cursorCol, maxCols - 1));
    out.write(`\x1b[${safeRow + 1};${safeCol + 1}H\x1b[?25h`);
  }

  // 输入提示符（类似 Claude Code）。
  private promptText(): string {
    return "› ";
  }

  // 顶部状态行（优先使用 statusLine 配置）。
  private headerLine(): string {
    if (this.statusLine && this.statusLine.trim().length > 0) {
      return this.statusLine.trim();
    }
    return "";
  }

  // 底部模式行：显示权限模式 + 提示 Shift+Tab。
  private modeLineText(): string {
    if (this.mode === "auto") {
      return `${this.tint("accept edits on", "35")} (shift+tab to cycle)`;
    }
    if (this.mode === "plan") {
      return `${this.tint("plan mode", "35")} (shift+tab to cycle)`;
    }
    return `${this.tint("accept edits off", "35")} (shift+tab to cycle)`;
  }

  // 分割线（横线）。
  private separatorLine(width: number): string {
    if (width <= 0) return "";
    return "─".repeat(width);
  }

  // 简易颜色输出（仅在 TTY 下）。
  private tint(text: string, colorCode: string): string {
    if (!process.stdout.isTTY) return text;
    return `\x1b[${colorCode}m${text}\x1b[0m`;
  }

  // 获取终端尺寸（优先 columns/rows，兼容 getWindowSize）。
  private getTerminalSize(): { columns: number; rows: number } {
    let columns = process.stdout.columns ?? 0;
    let rows = process.stdout.rows ?? 0;
    if ((!columns || !rows) && typeof process.stdout.getWindowSize === "function") {
      const size = process.stdout.getWindowSize();
      columns = size?.[0] ?? columns;
      rows = size?.[1] ?? rows;
    }
    return {
      columns: columns > 0 ? columns : 80,
      rows: rows > 0 ? rows : 24
    };
  }

  // 按可见宽度截断一行，同时保留 ANSI 颜色控制序列。
  private truncateLine(line: string, width: number): string {
    if (width <= 0) return "";
    let visible = 0;
    let i = 0;
    let out = "";
    while (i < line.length && visible < width) {
      const ch = line[i];
      if (ch === "\x1b" && line[i + 1] === "[") {
        const end = line.indexOf("m", i + 2);
        if (end === -1) {
          i += 1;
          continue;
        }
        out += line.slice(i, end + 1);
        i = end + 1;
        continue;
      }
      out += ch;
      visible += 1;
      i += 1;
    }
    if (out.includes("\x1b[")) out += "\x1b[0m";
    return out;
  }

  // 仅在“空会话 + 空输入”时展示欢迎面板。
  private shouldShowBanner(): boolean {
    return this.messages.length === 0 && this.input.value.trim().length === 0 && !this.search;
  }

  // 欢迎面板：模拟 Claude Code 的双栏信息布局。
  private bannerLines(width: number): string[] {
    if (width < 50) {
      return [`CodeCLI v${this.version}`, "Welcome back!"];
    }

    const innerWidth = width - 2;
    const title = ` CodeCLI v${this.version} `;
    const titleFit = title.length < innerWidth ? title : title.slice(0, innerWidth);
    const top = "┌" + titleFit + "─".repeat(Math.max(0, innerWidth - titleFit.length)) + "┐";
    const bottom = "└" + "─".repeat(innerWidth) + "┘";

    const leftWidth = Math.max(10, Math.floor((innerWidth - 1) * 0.45));
    const rightWidth = innerWidth - 1 - leftWidth;

    const logoLines = [
      "  ____          _      ",
      " / ___| ___  __| | ___ ",
      "| |    / _ \\/ _` |/ _ \\",
      "| |___|  __/ (_| |  __/",
      " \\____|\\___|\\__,_|\\___|"
    ];
    const leftLines = [
      "Welcome back!",
      "",
      ...logoLines,
      "",
      "Project: " + path.basename(this.projectDir),
      "Model: " + this.models[this.modelIndex].displayName
    ];
    const rightLines = [
      "Tips for getting started",
      "Run /init to create a CLAUDE.md file",
      "",
      "Recent activity",
      "No recent activity"
    ];

    const rows = Math.max(leftLines.length, rightLines.length);
    const lines: string[] = [top];
    for (let i = 0; i < rows; i += 1) {
      const left = this.fitLine(leftLines[i] ?? "", leftWidth);
      const right = this.fitLine(rightLines[i] ?? "", rightWidth);
      lines.push(`│${left}│${right}│`);
    }
    lines.push(bottom);
    return lines;
  }

  // 把一行文本截断/补空格到固定宽度。
  private fitLine(text: string, width: number): string {
    if (text.length >= width) return text.slice(0, width);
    return text + " ".repeat(width - text.length);
  }

  // 上一条历史记录（方向键 ↑）。
  private historyPrev() {
    if (this.historyIndex <= 0) return;
    this.historyIndex -= 1;
    this.input.setValue(this.history[this.historyIndex] ?? "");
  }

  // 下一条历史记录（方向键 ↓）。
  private historyNext() {
    if (this.historyIndex >= this.history.length - 1) {
      this.historyIndex = this.history.length;
      this.input.setValue("");
      return;
    }
    this.historyIndex += 1;
    this.input.setValue(this.history[this.historyIndex] ?? "");
  }

  // 进入 Ctrl+R 反向搜索模式。
  private startReverseSearch() {
    this.search = {
      query: "",
      match: "",
      matchIndex: this.history.length,
      originalInput: this.input.value
    };
    this.updateReverseSearch();
    this.render();
  }

  private updateReverseSearch() {
    if (!this.search) return;
    const start = this.search.matchIndex - 1;
    const idx = this.findHistoryMatch(this.search.query, start);
    if (idx >= 0) {
      this.search.matchIndex = idx;
      this.search.match = this.history[idx];
    } else {
      this.search.matchIndex = -1;
      this.search.match = "";
    }
  }

  private findHistoryMatch(query: string, startIndex: number): number {
    if (!query) {
      return startIndex >= 0 ? startIndex : -1;
    }
    for (let i = startIndex; i >= 0; i -= 1) {
      if (this.history[i].includes(query)) return i;
    }
    return -1;
  }

  // 反向搜索中的按键处理（退出/回车/继续搜索）。
  private async handleReverseSearchKey(str: string, key: readline.Key) {
    if (!this.search) return;

    if (key.ctrl && key.name === "c") {
      this.input.setValue(this.search.originalInput);
      this.search = null;
      this.render();
      return;
    }

    if (key.ctrl && key.name === "r") {
      if (this.search.matchIndex > 0) {
        this.search.matchIndex -= 1;
        this.updateReverseSearch();
      }
      this.render();
      return;
    }

    if (key.name === "backspace") {
      if (this.search.query.length === 0) {
        this.input.setValue(this.search.originalInput);
        this.search = null;
        this.render();
        return;
      }
      this.search.query = this.search.query.slice(0, -1);
      this.search.matchIndex = this.history.length;
      this.updateReverseSearch();
      this.render();
      return;
    }

    if (key.name === "tab" || key.name === "escape") {
      if (this.search.match) {
        this.input.setValue(this.search.match);
      }
      this.search = null;
      this.render();
      return;
    }

    if (key.name === "return") {
      const match = this.search.match;
      this.search = null;
      if (match) {
        this.input.setValue(match);
        await this.submitInput();
      } else {
        this.input.setValue("");
        this.render();
      }
      return;
    }

    if (str && !key.ctrl && !key.meta) {
      this.search.query += str;
      this.search.matchIndex = this.history.length;
      this.updateReverseSearch();
      this.render();
      return;
    }
  }

  // 在以 ! 开头时，用历史命令自动补全。
  private autocompleteBangHistory() {
    const prefix = this.input.value;
    const match = [...this.history].reverse().find((line) => line.startsWith(prefix));
    if (match) {
      this.input.setValue(match);
      this.render();
    }
  }

  // 写入 kill ring（供 Ctrl+Y / Alt+Y 使用）。
  private pushKillRing(text: string) {
    this.killRing.push(text);
    this.lastYankIndex = this.killRing.length - 1;
  }

  // 粘贴最近一次 kill 的内容。
  private yank() {
    if (this.killRing.length === 0) return;
    const text = this.killRing[this.killRing.length - 1];
    this.input.insert(text);
    this.lastYankIndex = this.killRing.length - 1;
    this.lastYankLength = text.length;
  }

  // 在 kill ring 中循环粘贴历史。
  private yankCycle() {
    if (this.lastYankLength === 0 || this.killRing.length === 0) return;
    if (this.lastYankIndex <= 0) {
      this.lastYankIndex = this.killRing.length - 1;
    } else {
      this.lastYankIndex -= 1;
    }
    for (let i = 0; i < this.lastYankLength; i += 1) this.input.backspace();
    const text = this.killRing[this.lastYankIndex];
    this.input.insert(text);
    this.lastYankLength = text.length;
  }

  // 回退到上一条用户输入，并把内容放回输入框。
  private rewind() {
    const idx = this.findLastUserMessageIndex();
    if (idx < 0) return;
    const userMsg = this.messages[idx];
    this.messages = this.messages.slice(0, idx);
    this.input.setValue(userMsg.content);
    this.appendSystem("Rewound to previous user message.");
  }

  private findLastUserMessageIndex(): number {
    for (let i = this.messages.length - 1; i >= 0; i -= 1) {
      if (this.messages[i].role === "user") return i;
    }
    return -1;
  }

  // 300ms 节流更新状态行，避免频繁执行外部命令。
  private scheduleStatusLine() {
    if (!this.settings.statusLine || this.settings.statusLine.type !== "command") return;
    const now = Date.now();
    const wait = Math.max(0, 300 - (now - this.lastStatusLineAt));
    if (this.statusLineTimer) clearTimeout(this.statusLineTimer);
    this.statusLineTimer = setTimeout(() => void this.updateStatusLine(), wait);
  }

  // 执行 statusLine.command，并取第一行作为展示内容。
  private async updateStatusLine() {
    if (!this.settings.statusLine || this.settings.statusLine.type !== "command") return;
    const cmd = this.settings.statusLine.command;
    if (!cmd) return;

    const payload = {
      hook_event_name: "Status",
      session_id: this.sessionId,
      transcript_path: this.transcriptPath,
      cwd: this.projectDir,
      model: {
        id: this.models[this.modelIndex].id,
        display_name: this.models[this.modelIndex].displayName
      },
      workspace: {
        current_dir: this.projectDir,
        project_dir: this.projectDir
      },
      version: "0.1.0",
      output_style: { name: "default" },
      cost: {
        total_cost_usd: 0,
        total_duration_ms: 0,
        total_api_duration_ms: 0,
        total_lines_added: 0,
        total_lines_removed: 0
      }
    };

    const result = await this.execStatusLine(cmd, payload);
    this.statusLine = result.trim().split(/\r?\n/)[0] ?? "";
    this.lastStatusLineAt = Date.now();
    this.render();
  }

  // 通过 stdin 传递 JSON 给外部脚本。
  private execStatusLine(cmd: string, payload: object): Promise<string> {
    return new Promise((resolve) => {
      const child = spawn(cmd, {
        cwd: this.projectDir,
        shell: true,
        windowsHide: true
      });
      let out = "";
      child.stdout.on("data", (data) => {
        out += data.toString();
      });
      child.on("close", () => resolve(out));
      child.stdin.write(JSON.stringify(payload));
      child.stdin.end();
    });
  }

  // 将当前输入写入临时文件并用外部编辑器打开。
  private async openInEditor() {
    const editor = process.env.EDITOR || process.env.VISUAL || "notepad";
    const tempPath = path.join(this.dataDir, "prompt-edit.txt");
    fs.writeFileSync(tempPath, this.input.value, "utf8");

    this.busy = true;
    if (process.stdin.isTTY) process.stdin.setRawMode(false);
    process.stdin.pause();
    spawnSync(editor, [tempPath], { stdio: "inherit", shell: true });
    process.stdin.resume();
    if (process.stdin.isTTY) process.stdin.setRawMode(true);
    this.busy = false;

    const updated = fs.readFileSync(tempPath, "utf8").replace(/\r\n/g, "\n");
    this.input.setValue(updated);
    this.render();
  }

  // 退出并恢复终端状态。
  private exit() {
    if (process.stdin.isTTY) process.stdin.setRawMode(false);
    process.stdin.pause();
    process.stdout.write("\n");
    process.exit(0);
  }
}





