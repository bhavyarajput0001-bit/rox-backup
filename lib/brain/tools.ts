import { execFile } from "node:child_process";
import { promisify } from "node:util";
import {
  readFile,
  writeFile,
  mkdir,
  access,
  stat,
  readdir,
} from "node:fs/promises";
import path from "node:path";
import os from "node:os";

const execFileAsync = promisify(execFile);

export const ROX_WORKSPACE = path.join(os.homedir(), "Downloads", "Rox");

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ToolParameter {
  type: "string" | "number" | "boolean" | "object" | "array";
  description?: string;
  enum?: string[];
  items?: ToolParameter;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, ToolParameter>;
    required?: string[];
  };
}

export type ToolExecuteResult = { ok: boolean; output: string };
export type ToolExecuteFn = (args: Record<string, unknown>) => Promise<ToolExecuteResult>;

// ---------------------------------------------------------------------------
// Safety constants
// ---------------------------------------------------------------------------

const BLOCKED_PATTERNS: RegExp[] = [
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
  "date", "pwd", "mkdir", "touch", "cp", "mv", "node", "npm", "npx", "python3",
  "python", "git", "curl", "wget", "open", "osascript", "plutil", "defaults",
  "which", "whoami", "uname", "df", "du", "ps", "graft", "pmset", "sysctl",
  "screencapture", "scutil", "top", "vm_stat",
]);

// ---------------------------------------------------------------------------
// Safety helpers
// ---------------------------------------------------------------------------

function assertSafeShellCommand(command: string): { binary: string; args: string[] } {
  const trimmed = command.trim();
  if (!trimmed) throw new Error("Empty command.");
  if (BLOCKED_PATTERNS.some((p) => p.test(trimmed))) {
    throw new Error("Command blocked by sandbox policy.");
  }
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

function isHttpUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Tool execution functions
// ---------------------------------------------------------------------------

async function shellExecute(args: Record<string, unknown>): Promise<ToolExecuteResult> {
  const command = String(args.command ?? "");
  const cwd = typeof args.cwd === "string" && args.cwd ? args.cwd : ROX_WORKSPACE;
  const { binary, args: cmdArgs } = assertSafeShellCommand(command);
  try {
    const { stdout, stderr } = await execFileAsync(binary, cmdArgs, {
      timeout: 15_000,
      maxBuffer: 2_000_000,
      cwd,
      env: { ...process.env, PATH: "/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin" },
    });
    const output = [stdout, stderr].filter(Boolean).join("\n").trim().slice(0, 20_000);
    return { ok: true, output: output || "(no output)" };
  } catch (e) {
    const err = e as { stdout?: string; stderr?: string; message?: string; killed?: boolean };
    const detail = [err.stdout, err.stderr, err.killed ? "timed out" : ""].filter(Boolean).join("\n").trim();
    return { ok: false, output: detail || err.message || "Command failed." };
  }
}

async function readFileChooser(args: Record<string, unknown>): Promise<ToolExecuteResult> {
  const filePath = String(args.file_path ?? "");
  const resolved = path.resolve(filePath);
  try {
    await access(resolved);
    const s = await stat(resolved);
    if (s.size > 2_000_000) return { ok: false, output: "File too large to read (max 2 MB)." };
    const content = await readFile(resolved, "utf8");
    return { ok: true, output: content.length ? content.slice(0, 20_000) : "(empty file)" };
  } catch (e) {
    return { ok: false, output: `Cannot read file: ${e instanceof Error ? e.message : "unknown error"}` };
  }
}

async function writeFileChooser(args: Record<string, unknown>): Promise<ToolExecuteResult> {
  const filePath = String(args.file_path ?? "");
  const content = String(args.content ?? "");
  const resolved = path.resolve(filePath);
  const MAX = 200_000;
  if (content.length > MAX) return { ok: false, output: `Content too large (max ${MAX} chars).` };
  try {
    await mkdir(path.dirname(resolved), { recursive: true });
    await writeFile(resolved, content, "utf8");
    return { ok: true, output: `Wrote ${content.length} chars to ${resolved}.` };
  } catch (e) {
    return { ok: false, output: `Cannot write file: ${e instanceof Error ? e.message : "unknown error"}` };
  }
}

async function listDirTool(args: Record<string, unknown>): Promise<ToolExecuteResult> {
  const dirPath = String(args.path ?? "");
  const resolved = path.resolve(dirPath);
  try {
    const entries = await readdir(resolved, { withFileTypes: true });
    const lines = entries.slice(0, 100).map((e) => {
      const type = e.isDirectory() ? "dir " : e.isFile() ? "file" : "other";
      return `${type}  ${e.name}`;
    });
    return { ok: true, output: lines.join("\n") || "(empty directory)" };
  } catch (e) {
    return { ok: false, output: `Cannot list directory: ${e instanceof Error ? e.message : "unknown error"}` };
  }
}

async function webSearchExecute(args: Record<string, unknown>): Promise<ToolExecuteResult> {
  const query = String(args.query ?? "");
  try {
    const { stdout } = await execFileAsync("mcporter", ["call", "exa.web_search_exa", `query=${query}`, "numResults=5"], {
      timeout: 20_000,
      maxBuffer: 200_000,
    });
    return { ok: true, output: stdout.trim().slice(0, 8_000) };
  } catch (e) {
    // Fallback to fetch-based search
    try {
      const resp = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
        signal: AbortSignal.timeout(10_000),
        headers: { "User-Agent": "Mozilla/5.0" },
      });
      const text = await resp.text();
      return { ok: true, output: text.slice(0, 5_000) };
    } catch {
      return { ok: false, output: `Web search failed: ${e instanceof Error ? e.message : "unknown"}` };
    }
  }
}

async function readWebpageExecute(args: Record<string, unknown>): Promise<ToolExecuteResult> {
  const url = String(args.url ?? "");
  if (!isHttpUrl(url)) return { ok: false, output: "Only http(s) URLs are supported." };
  try {
    const resp = await fetch(`https://r.jina.ai/${url}`, {
      signal: AbortSignal.timeout(20_000),
      headers: { Accept: "text/plain" },
    });
    if (!resp.ok) return { ok: false, output: `Jina reader returned ${resp.status}.` };
    const text = await resp.text();
    return { ok: true, output: text.slice(0, 8_000) };
  } catch (e) {
    return { ok: false, output: `Read webpage failed: ${e instanceof Error ? e.message : "unknown"}` };
  }
}

async function weatherExecute(args: Record<string, unknown>): Promise<ToolExecuteResult> {
  const location = String(args.location ?? "").trim();
  if (!location) return { ok: false, output: "A location is required." };
  try {
    const resp = await fetch(`https://wttr.in/${encodeURIComponent(location)}?format=3`, {
      signal: AbortSignal.timeout(8_000),
      headers: { "User-Agent": "Rox-Assistant/1.0" },
    });
    if (!resp.ok) return { ok: false, output: `Weather service returned ${resp.status}.` };
    const text = await resp.text();
    return { ok: true, output: text.trim() };
  } catch (e) {
    return { ok: false, output: `Weather lookup failed: ${e instanceof Error ? e.message : "unknown"}` };
  }
}

async function newsExecute(args: Record<string, unknown>): Promise<ToolExecuteResult> {
  const topic = String(args.topic ?? "technology").trim();
  try {
    const resp = await fetch(
      `https://news.google.com/rss/search?q=${encodeURIComponent(topic)}&hl=en-US&gl=US&ceid=US:en`,
      { signal: AbortSignal.timeout(8_000), headers: { Accept: "application/rss+xml" } },
    );
    if (!resp.ok) return { ok: false, output: `News service returned ${resp.status}.` };
    const xml = await resp.text();
    const items = [...xml.matchAll(/<item>[\s\S]*?<title>([\s\S]*?)<\/title>[\s\S]*?<link>([\s\S]*?)<\/link>[\s\S]*?<\/item>/g)]
      .slice(0, 5)
      .map((m, i) => `${i + 1}. ${m[1].replace(/<!\[CDATA\[|\]\]>/g, "").trim()} - ${m[2].trim()}`);
    return { ok: true, output: items.join("\n") || "No headlines found." };
  } catch (e) {
    return { ok: false, output: `News lookup failed: ${e instanceof Error ? e.message : "unknown"}` };
  }
}

async function calculateExecute(args: Record<string, unknown>): Promise<ToolExecuteResult> {
  const expr = String(args.expression ?? "").replace(/[^0-9+\-*/().%\s]/g, "").trim();
  if (!expr || expr.length > 100 || !/[0-9]/.test(expr)) {
    return { ok: false, output: "Invalid calculation." };
  }
  try {
    const tokens = expr.match(/\d+(?:\.\d+)?|[()+\-*/%]/g) ?? [];
    const values: number[] = [];
    const ops: string[] = [];
    const prec: Record<string, number> = { "+": 1, "-": 1, "*": 2, "/": 2, "%": 2 };
    const apply = () => {
      const op = ops.pop();
      const r = values.pop();
      const l = values.pop();
      if (!op || l === undefined || r === undefined) throw new Error("Invalid calc.");
      if (op === "+") values.push(l + r);
      if (op === "-") values.push(l - r);
      if (op === "*") values.push(l * r);
      if (op === "/") values.push(l / r);
      if (op === "%") values.push(l % r);
    };
    for (const t of tokens) {
      if (/^\d/.test(t)) values.push(Number(t));
      else if (t === "(") ops.push(t);
      else if (t === ")") { while (ops.at(-1) && ops.at(-1) !== "(") apply(); if (ops.pop() !== "(") throw new Error("Invalid calc."); }
      else { while (ops.at(-1) && ops.at(-1) !== "(" && prec[ops.at(-1)!] >= prec[t]) apply(); ops.push(t); }
    }
    while (ops.length) apply();
    const result = values[0];
    if (values.length !== 1 || !Number.isFinite(result)) throw new Error("Invalid calculation.");
    return { ok: true, output: `= ${Number(result.toFixed(8))}` };
  } catch (e) {
    return { ok: false, output: e instanceof Error ? e.message : "Invalid calculation." };
  }
}

// Memory store/recall using .rox-data
async function memoryStoreExecute(args: Record<string, unknown>): Promise<ToolExecuteResult> {
  const key = String(args.key ?? "");
  let rawValue = String(args.value ?? "");
  if (!key) return { ok: false, output: "Key is required." };
  const memDir = path.join(ROX_WORKSPACE, ".rox-data");
  try {
    await mkdir(memDir, { recursive: true });
    // Try to parse as JSON; if it fails, store as plain text wrapped in an object
    let parsedValue: unknown;
    try {
      parsedValue = JSON.parse(rawValue);
    } catch {
      parsedValue = rawValue;
    }
    await writeFile(path.join(memDir, `${key.replace(/\//g, "_")}.json`), JSON.stringify({ value: parsedValue, storedAt: new Date().toISOString() }), "utf8");
    return { ok: true, output: `Stored value under key: ${key}` };
  } catch (e) {
    return { ok: false, output: `Memory store failed: ${e instanceof Error ? e.message : "unknown"}` };
  }
}

async function memoryRecallExecute(args: Record<string, unknown>): Promise<ToolExecuteResult> {
  const query = String(args.query ?? "");
  const memDir = path.join(ROX_WORKSPACE, ".rox-data");
  try {
    const entries = await readdir(memDir);
    const hits = entries
      .filter((f) => f.endsWith(".json"))
      .map(async (f) => {
        try {
          const fs = await import("node:fs/promises");
          const raw = await fs.readFile(path.join(memDir, f), "utf8");
          const parsed = JSON.parse(raw);
          return { key: f.replace(".json", ""), ...parsed };
        } catch {
          return null;
        }
      });
    const resolvedHits = (await Promise.all(hits)).filter(Boolean);
    if (!query) return { ok: true, output: resolvedHits.length ? resolvedHits.map((h) => `- ${h.key}: ${JSON.stringify(h.value)?.slice(0, 200)}`).join("\n") : "(no memories stored)" };
    const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
    const scored = resolvedHits.map((h) => {
      const text = `${h.key} ${JSON.stringify(h.value)}`.toLowerCase();
      const score = tokens.filter((t) => text.includes(t)).length;
      return { ...h, score };
    }).filter((h) => h.score > 0).sort((a, b) => b.score - a.score);
    return { ok: true, output: scored.length ? scored.map((h) => `- ${h.key}: ${JSON.stringify(h.value)?.slice(0, 200)}`).join("\n") : "No matching memories." };
  } catch (e) {
    return { ok: false, output: `Memory recall failed: ${e instanceof Error ? e.message : "unknown"}` };
  }
}

async function skillLoadExecute(args: Record<string, unknown>): Promise<ToolExecuteResult> {
  const skillName = String(args.skill_name ?? "");
  if (!skillName) return { ok: false, output: "skill_name is required." };
  const skillsDir = path.join(os.homedir(), ".hermes", "skills");
  // Try to find the skill by walking the directory tree
  async function findSkill(dir: string, partial: string): Promise<string | null> {
    try {
      const entries = await readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          const candidate = await findSkill(fullPath, partial);
          if (candidate) return candidate;
        }
        if (entry.name === "SKILL.md" && entry.parentPath?.includes(partial)) {
          return fullPath;
        }
      }
    } catch { /* ignore */ }
    return null;
  }
  // Simpler: just check direct child and nested
  let skillPath: string | null = null;
  try {
    const topEntries = await readdir(skillsDir, { withFileTypes: true });
    for (const top of topEntries) {
      if (!top.isDirectory()) continue;
      const candidate = path.join(skillsDir, top.name, skillName, "SKILL.md");
      try { await access(candidate); skillPath = candidate; break; } catch { /* try deeper */ }
      // Also try flat: skillsDir/skillName/SKILL.md
      const flatCandidate = path.join(skillsDir, skillName, "SKILL.md");
      try { await access(flatCandidate); skillPath = flatCandidate; break; } catch { /* continue */ }
    }
  } catch { /* ignore */ }
  if (!skillPath) return { ok: false, output: `Skill '${skillName}' not found in ~/.hermes/skills/` };
  try {
    const content = await readFile(skillPath, "utf8");
    return { ok: true, output: content.slice(0, 12_000) };
  } catch (e) {
    return { ok: false, output: `Failed to load skill: ${e instanceof Error ? e.message : "unknown"}` };
  }
}

async function youtubeExecute(args: Record<string, unknown>): Promise<ToolExecuteResult> {
  const command = String(args.command ?? "");
  // Relay to YouTube agent on localhost:3457
  const YT_AGENT_URL = process.env.YOUTUBE_AGENT_URL || "http://localhost:3457";
  try {
    const resp = await fetch(`${YT_AGENT_URL}/api/command`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(process.env.YOUTUBE_AGENT_API_KEY ? { "x-api-key": process.env.YOUTUBE_AGENT_API_KEY } : {}) },
      body: JSON.stringify({ command }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!resp.ok) return { ok: false, output: `YouTube agent returned ${resp.status}.` };
    const data = await resp.json() as { reply?: string; error?: string };
    return { ok: true, output: data.reply || data.error || "(no response)" };
  } catch (e) {
    return { ok: false, output: `Could not reach YouTube agent: ${e instanceof Error ? e.message : "unknown"}` };
  }
}

// ---------------------------------------------------------------------------
// TOOL_DEFINITIONS — OpenAI function calling format
// ---------------------------------------------------------------------------

export const TOOL_DEFINITIONS: Array<{
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, ToolParameter>;
    required?: string[];
  };
  execute: ToolExecuteFn;
}> = [
  {
    name: "shell",
    description: "Run a shell command on the local macOS machine. Allow-listed binaries: cat, echo, ls, find, grep, head, tail, wc, sort, uniq, date, pwd, mkdir, touch, cp, mv, node, npm, npx, python3, git, curl, wget, open, osascript, plutil, defaults, which, whoami, uname, df, du, ps, graft, pmset, sysctl, screencapture, scutil, top, vm_stat. Destructive commands (rm -rf /, sudo, shutdown, mkfs, dd to raw devices) are blocked.",
    parameters: {
      type: "object",
      properties: {
        command: { type: "string", description: "Shell command to execute" },
        cwd: { type: "string", description: "Optional working directory (absolute path)" },
      },
      required: ["command"],
    },
    execute: shellExecute,
  },
  {
    name: "read_file",
    description: "Read a text file from disk. Pass an absolute path. Returns content up to 20 KB. Files larger than 2 MB are rejected.",
    parameters: {
      type: "object",
      properties: {
        file_path: { type: "string", description: "Absolute path to the file" },
      },
      required: ["file_path"],
    },
    execute: readFileChooser,
  },
  {
    name: "write_file",
    description: "Write text content to a file, creating parent directories. Pass an absolute path. Content is limited to 200 KB.",
    parameters: {
      type: "object",
      properties: {
        file_path: { type: "string", description: "Absolute path to the file" },
        content: { type: "string", description: "Content to write" },
      },
      required: ["file_path", "content"],
    },
    execute: writeFileChooser,
  },
  {
    name: "list_dir",
    description: "List directory entries (files and folders). Pass an absolute path. Returns up to 100 entries.",
    parameters: {
      type: "object",
      properties: {
        path: { type: "string", description: "Absolute path to directory" },
      },
      required: ["path"],
    },
    execute: listDirTool,
  },
  {
    name: "web_search",
    description: "Search the web (Exa). Returns up to 5 results with titles and summaries. Falls back to DuckDuckGo HTML if Exa is unavailable.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query" },
      },
      required: ["query"],
    },
    execute: webSearchExecute,
  },
  {
    name: "read_webpage",
    description: "Read the text content of a web page via Jina Reader. Pass a full HTTP/HTTPS URL.",
    parameters: {
      type: "object",
      properties: {
        url: { type: "string", description: "Webpage URL" },
      },
      required: ["url"],
    },
    execute: readWebpageExecute,
  },
  {
    name: "weather",
    description: "Get current weather for a location using wttr.in. Returns temperature, conditions, and wind.",
    parameters: {
      type: "object",
      properties: {
        location: { type: "string", description: "City or location name" },
      },
      required: ["location"],
    },
    execute: weatherExecute,
  },
  {
    name: "news",
    description: "Get latest news headlines from Google News RSS, optionally filtered by topic.",
    parameters: {
      type: "object",
      properties: {
        topic: { type: "string", description: "News topic (optional, defaults to 'technology')" },
      },
    },
    execute: newsExecute,
  },
  {
    name: "calculate",
    description: "Evaluate a math expression safely using a custom parser (no eval). Supports +, -, *, /, %, parentheses.",
    parameters: {
      type: "object",
      properties: {
        expression: { type: "string", description: "Math expression like '6 * 7 + 3'" },
      },
      required: ["expression"],
    },
    execute: calculateExecute,
  },
  {
    name: "memory_store",
    description: "Store a value in .rox-data for persistence across sessions. Values are saved as JSON files keyed by name.",
    parameters: {
      type: "object",
      properties: {
        key: { type: "string", description: "Unique key for this memory entry" },
        value: { type: "string", description: "JSON string or plain text value to store" },
      },
      required: ["key", "value"],
    },
    execute: memoryStoreExecute,
  },
  {
    name: "memory_recall",
    description: "Search stored memories in .rox-data. If query is empty, returns all stored keys and values.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query to filter memories (optional)" },
      },
    },
    execute: memoryRecallExecute,
  },
  {
    name: "skill_load",
    description: "Load a Hermes skill by name from ~/.hermes/skills/. Returns the full SKILL.md content for context injection.",
    parameters: {
      type: "object",
      properties: {
        skill_name: { type: "string", description: "Name of the skill directory (e.g. 'hermes-agent', 'docker-deploy')" },
      },
      required: ["skill_name"],
    },
    execute: skillLoadExecute,
  },
  {
    name: "youtube",
    description: "Relay a command to the YouTube Automation agent (runs on port 3457). Commands: status, jobs, dashboard, generate <topic>, upload, etc.",
    parameters: {
      type: "object",
      properties: {
        command: { type: "string", description: "YouTube command to relay" },
      },
      required: ["command"],
    },
    execute: youtubeExecute,
  },
];

// ---------------------------------------------------------------------------
// Export helpers
// ---------------------------------------------------------------------------

/** Run a tool by name with the given arguments. */
export async function runTool(name: string, args: Record<string, unknown>): Promise<ToolExecuteResult> {
  const tool = TOOL_DEFINITIONS.find((t) => t.name === name);
  if (!tool) return { ok: false, output: `Unknown tool: ${name}` };
  return tool.execute(args);
}

/** Return the TOOL_DEFINITIONS array shaped for OpenAI function-calling API. */
export function openAIToolSchema(): Array<{ type: "function"; function: { name: string; description: string; parameters: object } }> {
  return TOOL_DEFINITIONS.map((t) => ({
    type: "function",
    function: { name: t.name, description: t.description, parameters: t.parameters },
  }));
}
