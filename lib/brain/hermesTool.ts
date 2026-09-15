// Hermes Tool Bridge for Rox
// Gives Rox access to ALL 25 Hermes toolsets via the Hermes CLI/gateway
// This is the single tool that provides access to everything Hermes can do

import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";
import os from "os";

const execFileAsync = promisify(execFile);

const HERMES_PATH = process.env.HERMES_PATH || path.join(os.homedir(), ".hermes", "bin", "hermes");
const HERMES_HOME = process.env.HERMES_HOME || path.join(os.homedir(), ".hermes");

export const HERMES_TOOLSETS = [
  "computer_use",    // macOS/Windows/Linux desktop automation
  "browser",         // Web browser automation
  "browser_use",     // Browser-use CLI
  "file",            // File operations (read, write, list, etc.)
  "terminal",        // Terminal/shell execution
  "web",             // Web search, fetch, extract
  "delegation",      // Sub-agent spawning (delegate_task)
  "memory",          // Memory operations (recall, store, graph)
  "cron",            // Cron job management
  "skills",          // Skill loading/management
  "mcp",             // MCP server connections
  "github",          // GitHub operations (issues, PRs, repos)
  "email",           // Email (Himalaya IMAP/SMTP)
  "apple",           // Apple ecosystem (Notes, Reminders, iMessage, FindMy)
  "deployment",      // Deployment (Docker, Render, Supabase)
  "data_science",    // Jupyter, data analysis
  "mlops",           // ML ops (HuggingFace, vLLM, llama.cpp)
  "creative",        // Creative (ascii, diagrams, music, video)
  "productivity",    // Productivity (Notion, Linear, Obsidian, Google Workspace)
  "research",        // Research (arXiv, web, citations)
  "social_media",    // Social media (X/Twitter)
  "devops",          // DevOps (Kanban, Docker, local debugging)
  "code",            // Code tools (lint, typecheck, debug)
  "debug",           // Debugging (Node, Python, Hermes TUI)
  "note_taking",     // Note taking (Obsidian, session memory)
];

export interface HermesToolResult {
  success: boolean;
  output: string;
  toolCalls?: Array<{
    toolset: string;
    tool: string;
    args: unknown;
    result: unknown;
  }>;
  sessionId?: string;
}

export interface HermesExecutionOptions {
  message: string;
  toolsets?: string[];
  history?: Array<{ role: string; content: string }>;
  sessionId?: string;
  stream?: boolean;
  maxTurns?: number;
  provider?: string;
  model?: string;
}

async function runHermesChat(options: HermesExecutionOptions): Promise<HermesToolResult> {
  const args = [
    "chat",
    "-q", options.message,
    "--provider", options.provider || "auto",
    "--toolsets", options.toolsets?.join(",") || "all",
  ];

  if (options.history && options.history.length > 0) {
    // Build session context
    // For simplicity, we prepend history to the message
    const context = options.history
      .map(t => `${t.role.toUpperCase()}: ${t.content}`)
      .join("\n");
    args.splice(2, 0, "--context", context);
  }

  if (options.maxTurns) {
    args.push("--max-turns", String(options.maxTurns));
  }

  try {
    const { stdout, stderr } = await execFileAsync(HERMES_PATH, args, {
      cwd: process.cwd(),
      env: {
        ...process.env,
        HERMES_HOME,
        PATH: `${path.join(os.homedir(), ".hermes", "bin")}:${process.env.PATH}`,
      },
      timeout: 180000, // 3 minutes
      maxBuffer: 50 * 1024 * 1024,
    });

    const output = stdout || stderr;
    
    // Parse session ID if present
    const sessionMatch = stdout.match(/Session:\s+(\S+)/);
    const sessionId = sessionMatch?.[1];

    return {
      success: true,
      output: output.trim(),
      sessionId,
    };
  } catch (error) {
    const err = error as { stdout?: string; stderr?: string; message?: string; killed?: boolean };
    return {
      success: false,
      output: err.stdout || err.stderr || err.message || "Hermes execution failed",
    };
  }
}

// Main tool definition for Rox brain
export const hermesTool = {
  name: "hermes",
  description: `Execute ANY task using the full Hermes Agent framework. This gives access to ALL 25 Hermes toolsets:
  
COMPUTER USE: macOS/Windows/Linux desktop automation (screenshots, clicks, typing, apps)
BROWSER: Web browser automation (navigation, clicks, forms, extraction)
BROWSER_USE: Browser-use CLI for complex web tasks
FILE: File operations (read, write, list, search, edit)
TERMINAL: Shell execution (any command, background processes)
WEB: Web search, fetch, extract content from URLs
DELEGATION: Spawn sub-agents for parallel tasks
MEMORY: Persistent memory (recall, store, graph, sessions)
CRON: Cron job scheduling and management
SKILLS: Load/use any of 200+ Hermes skills
MCP: Connect to MCP servers for external tools
GITHUB: GitHub operations (issues, PRs, repos, reviews)
EMAIL: IMAP/SMTP email management
APPLE: Apple ecosystem (Notes, Reminders, iMessage, FindMy)
DEPLOYMENT: Docker, Render, Supabase, Vercel deployment
DATA_SCIENCE: Jupyter kernels, data analysis
MLOPS: HuggingFace, vLLM, llama.cpp, model serving
CREATIVE: ASCII art, diagrams, music, video generation
PRODUCTIVITY: Notion, Linear, Obsidian, Google Workspace
RESEARCH: arXiv, web search, citations, competitor monitoring
SOCIAL_MEDIA: X/Twitter posting and search
DEVOPS: Kanban, Docker, local debugging, Next.js
CODE: Lint, typecheck, debug, refactor
DEBUG: Node, Python, Hermes TUI debugging
NOTE_TAKING: Obsidian, session memory, cross-session recall

Use this tool for ANY complex task that requires real-world action, multi-step reasoning, or access to external systems. Hermes handles planning, tool selection, execution, and self-improvement automatically.

Parameters:
- message: The task/question for Hermes to complete
- toolsets: Optional specific toolsets to enable (default: "all")
- history: Conversation history for context
- sessionId: Resume a previous Hermes session
- stream: Whether to stream response (not yet implemented)
- maxTurns: Maximum reasoning/tool turns (default: 20)
- provider: LLM provider to use (auto, openai, anthropic, etc.)
- model: Specific model to use`,
  parameters: {
    type: "object",
    properties: {
      message: { 
        type: "string", 
        description: "The task or question for Hermes to complete. Be specific and detailed." 
      },
      toolsets: { 
        type: "array", 
        items: { type: "string", enum: HERMES_TOOLSETS },
        description: "Specific toolsets to enable. Default: all 25 toolsets." 
      },
      history: { 
        type: "array", 
        items: {
          type: "object",
          properties: {
            role: { type: "string", enum: ["user", "assistant", "system"] },
            content: { type: "string" },
          },
          required: ["role", "content"],
        },
        description: "Conversation history for context" 
      },
      sessionId: { 
        type: "string", 
        description: "Hermes session ID to resume" 
      },
      stream: { 
        type: "boolean", 
        description: "Stream response incrementally" 
      },
      maxTurns: { 
        type: "number", 
        description: "Max reasoning/tool turns (default: 20)" 
      },
      provider: { 
        type: "string", 
        description: "LLM provider (auto, openai, anthropic, etc.)" 
      },
      model: { 
        type: "string", 
        description: "Specific model (e.g., gpt-4o, claude-3.5-sonnet)" 
      },
    },
    required: ["message"],
  },
} as const;

export async function executeHermesTool(args: Record<string, unknown>): Promise<HermesToolResult> {
  const options: HermesExecutionOptions = {
    message: args.message as string,
    toolsets: args.toolsets as string[] | undefined,
    history: args.history as Array<{ role: string; content: string }> | undefined,
    sessionId: args.sessionId as string | undefined,
    stream: args.stream as boolean | undefined,
    maxTurns: args.maxTurns as number | undefined,
    provider: args.provider as string | undefined,
    model: args.model as string | undefined,
  };

  return runHermesChat(options);
}

// One-shot helper for quick tasks
export async function hermesQuick(message: string, toolsets?: string[]): Promise<string> {
  const result = await runHermesChat({ message, toolsets });
  return result.output;
}

// Streaming helper (returns a readable stream)
export async function hermesStream(message: string, options?: Partial<HermesExecutionOptions>): Promise<ReadableStream<Uint8Array>> {
  const encoder = new TextEncoder();
  
  return new ReadableStream({
    async start(controller) {
      try {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "meta", provider: "hermes" })}\n\n`));
        
        // For now, use one-shot and simulate streaming
        const result = await runHermesChat({ message, ...options });
        
        if (result.toolCalls && result.toolCalls.length > 0) {
          for (const tc of result.toolCalls) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "tool_call", ...tc })}\n\n`));
          }
        }
        
        const words = result.output.split(/(\s+)/);
        for (const word of words) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "chunk", text: word })}\n\n`));
          await new Promise(r => setTimeout(r, 5));
        }
        
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "done", reply: result.output, provider: "hermes" })}\n\n`));
        controller.close();
      } catch (error) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "error", error: String(error) })}\n\n`));
        controller.close();
      }
    },
  });
}