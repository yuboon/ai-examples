#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { CodeCli } from "./repl";

// 从 package.json 读取版本号，启动界面显示固定版本。
function readVersion(projectDir: string): string {
  try {
    const pkgPath = path.join(projectDir, "package.json");
    const raw = fs.readFileSync(pkgPath, "utf8");
    const pkg = JSON.parse(raw) as { version?: string };
    return pkg.version ?? "0.0.0";
  } catch {
    return "0.0.0";
  }
}

// CLI 入口：处理最小参数，然后启动交互式 REPL。
const projectDir = process.cwd();
const args = process.argv.slice(2);

if (args.includes("--help") || args.includes("-h")) {
  console.log("codecli (MVP)\n\nUsage:\n  codecli\n  codecli --version");
  process.exit(0);
}

if (args.includes("--version") || args.includes("-v")) {
  console.log(readVersion(projectDir));
  process.exit(0);
}

const app = new CodeCli({ projectDir, version: readVersion(projectDir) });
app.start();
