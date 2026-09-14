import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFile, writeFile, mkdir, access, rename, stat, readdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const execFileAsync = promisify(execFile);

export const ROX_WORKSPACE = path.join(os.homedir(), "Downloads", "Rox");

const BLOCKED_PATTERNS = [
  /rm\s+-rf\s+\//,
  /:\s*rm\s+-rf\s+\//,
  /\bmkfs\b/,
  /\bdd\s+if=/,
  />\s*\/dev\/sd/,
  /:\s*\(\)\s*\{\s*:\s*\|\s*:\s*&\s*\}\s*;/,
  /shutdown|reboot|halt|poweroff/,
  /\bsudo\b/,
  /rm\s+-rf\s+\/\s*\*/,
  /chmod\s+777\s+\//,
];

const ALLOWED_COMMANDS = new Set([
  "cat", "echo", "ls", "find", "grep", "head", "tail", "wc", "sort", "uniq",
  "date", "pwd", "mkdir", "touch", "cp", "mv",
  "node", "npm", "npx", "python3", "python",  // added python entry
  "git", "curl", "wget",
  "open", "osascript", "plutil", "defaults",
  "which", "whoami", "uname", "df", "du", "ps",
  "graft" // allow the Graft CLI for self‑improvement
]);

function assertSafe(command: string): { binary: string; args: string[] } {
  const trimmed = command.trim();
  if (!trimmed) throw new Error("Empty command.");
  if (BLOCKED_PATTERNS.some((pattern) => pattern.test(trimmed))) {
    throw new Error("Command blocked by sandbox policy.");
  }
  // Only absolute binaries or allow-listed bare names.
  const parts = trimmed.split(/\s+/);
  const binary = parts[0];
  const args = parts.slice(1);
  if (binary.includes("/")) {
    const resolved = path.resolve(binary);
    if (!resolved.startsWith("/usr") && !resolved.startsWith("/bin") && !resolved.startsWith("/opt/homebrew/bin")) {
      throw new Error("Command outside allowed paths.");
    }
  } else if (!ALLOWED_COMMANDS.has(binary)) {
    throw new Error(`Binary '${binary}' is not in the allow-list.`);
  }
  return { binary, args };
}

export type ExecResult = { ok: boolean; output: string };

export async function runShell(command: string, timeoutMs = 10_000): Promise<ExecResult> {
  const { binary, args } = assertSafe(command);
  try {
    const { stdout, stderr } = await execFileAsync(binary, args, {
      timeout: timeoutMs,
      maxBuffer: 2_000_000,
      cwd: ROX_WORKSPACE,
      env: { ...process.env, PATH: "/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin" },
    });
    const output = [stdout, stderr].filter(Boolean).join("\n").trim().slice(0, 20_000);
    return { ok: true, output: output || "(no output)" };
  } catch (error) {
    const err = error as { stdout?: string; stderr?: string; message?: string; killed?: boolean };
    const detail = [err.stdout, err.stderr, err.killed ? "timed out" : ""].filter(Boolean).join("\n").trim();
    return { ok: false, output: detail || err.message || "Command failed." };
  }
}

export async function runShellIn(dir: string, command: string, timeoutMs = 15_000): Promise<ExecResult> {
  const { binary, args } = assertSafe(command);
  const cwd = path.resolve(dir);
  try {
    const { stdout, stderr } = await execFileAsync(binary, args, { timeout: timeoutMs, maxBuffer: 2_000_000, cwd });
    const output = [stdout, stderr].filter(Boolean).join("\n").trim().slice(0, 20_000);
    return { ok: true, output: output || "(no output)" };
  } catch (error) {
    const err = error as { stdout?: string; stderr?: string; message?: string; killed?: boolean };
    const detail = [err.stdout, err.stderr, err.killed ? "timed out" : ""].filter(Boolean).join("\n").trim();
    return { ok: false, output: detail || err.message || "Command failed." };
  }
}

export async function readFileTool(filePath: string): Promise<ExecResult> {
  const resolved = path.resolve(filePath);
  try {
    await access(resolved);
    const stats = await stat(resolved);
    if (stats.size > 2_000_000) return { ok: false, output: "File too large to read (max 2 MB)." };
    const content = await readFile(resolved, "utf8");
    return { ok: true, output: content.length ? content.slice(0, 20_000) : "(empty file)" };
  } catch (error) {
    return { ok: false, output: `Cannot read file: ${error instanceof Error ? error.message : "unknown error"}` };
  }
}

export async function writeFileTool(filePath: string, content: string): Promise<ExecResult> {
  const resolved = path.resolve(filePath);
  const max = 200_000;
  if (content.length > max) return { ok: false, output: `Content too large (max ${max} chars).` };
  try {
    await mkdir(path.dirname(resolved), { recursive: true });
    await writeFile(resolved, content, "utf8");
    return { ok: true, output: `Wrote ${content.length} chars to ${resolved}.` };
  } catch (error) {
    return { ok: false, output: `Cannot write file: ${error instanceof Error ? error.message : "unknown error"}` };
  }
}

export async function listDirTool(dirPath: string): Promise<ExecResult> {
  const resolved = path.resolve(dirPath);
  try {
    const entries = await readdir(resolved, { withFileTypes: true });
    const lines = entries.slice(0, 100).map((entry) => {
      const type = entry.isDirectory() ? "dir " : entry.isFile() ? "file" : "other";
      return `${type}  ${entry.name}`;
    });
    return { ok: true, output: lines.join("\n") || "(empty directory)" };
  } catch (error) {
    return { ok: false, output: `Cannot list directory: ${error instanceof Error ? error.message : "unknown error"}` };
  }
}

export async function openAppTool(appName: string): Promise<ExecResult> {
  const name = appName.trim().replace(/[^a-zA-Z0-9 ._-]/g, "");
  if (!name || name.length > 80) return { ok: false, output: "Invalid application name." };
  if (process.platform !== "darwin") return { ok: false, output: "App launching currently requires macOS." };
  try {
    await execFileAsync("open", ["-a", name], { timeout: 8_000 });
    return { ok: true, output: `Launched ${name}.` };
  } catch (error) {
    return { ok: false, output: `Could not launch ${name}: ${error instanceof Error ? error.message : "unknown error"}` };
  }
}

export type FileWriteArgs = { file_path: string; content: string };
export type FileReadArgs = { file_path: string };
export type ListDirArgs = { path: string };
export type OpenAppArgs = { app: string };
export type ShellArgs = { command: string; cwd?: string };
export type ToolContext = { toolName: string; args: unknown; output: string; ok: boolean };

export function openUrlTool(url: string): Promise<ExecResult> {
  const trimmed = url.trim();
  if (!/^https?:\/\//i.test(trimmed) || trimmed.length > 2048) {
    return Promise.resolve({ ok: false, output: "Only http(s) URLs can be opened." });
  }
  return execFileAsync("open", [trimmed], { timeout: 8_000 })
    .then(() => ({ ok: true, output: `Opened ${trimmed} in the default browser.` }))
    .catch((error: unknown) => ({
      ok: false,
      output: `Could not open ${trimmed}: ${error instanceof Error ? error.message : "unknown error"}`,
    }));
}