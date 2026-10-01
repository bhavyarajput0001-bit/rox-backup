/**
 * lib/brain/agents/claudeCode.ts
 * 
 * Claude Code CLI integration for Rox brain.
 * Wraps Claude Code as a tool that can execute coding tasks.
 */

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "path";
import os from "os";

const execFileAsync = promisify(execFile);

const CLAUDE_PATH = process.env.CLAUDE_PATH || path.join(os.homedir(), ".local", "bin", "claude");

export interface ClaudeCodeOptions {
  task: string;
  maxTurns?: number;
  model?: string;
  workdir?: string;
  allowedTools?: string[];
  budgetUsd?: number;
}

export interface ClaudeCodeResult {
  ok: boolean;
  output: string;
  model?: string;
  costUsd?: number;
  rounds?: number;
  sessionId?: string;
}

/**
 * Execute a task via Claude Code in print mode (non-interactive).
 * Returns structured result with token usage.
 */
export async function runClaudeCode(options: ClaudeCodeOptions): Promise<ClaudeCodeResult> {
  const {
    task,
    maxTurns = 10,
    model,
    workdir,
    allowedTools,
    budgetUsd,
  } = options;

  if (!task.trim()) {
    return { ok: false, output: "Task is required" };
  }

  try {
    const cmdArgs: string[] = ["-p", task, "--max-turns", String(maxTurns)];
    
    if (model) cmdArgs.push("--model", model);
    if (budgetUsd) cmdArgs.push("--max-budget-usd", String(budgetUsd));
    if (allowedTools) cmdArgs.push("--allowedTools", allowedTools.join(","));
    
    // Force a specific model to avoid catalog issues
    cmdArgs.push("--model", "sonnet");
    
    // Force JSON output for structured parsing
    cmdArgs.push("--output-format", "json");

    const { stdout, stderr } = await execFileAsync(CLAUDE_PATH, cmdArgs, {
      cwd: workdir || process.cwd(),
      timeout: 300_000, // 5 min for complex tasks
      maxBuffer: 10 * 1024 * 1024, // 10MB
      env: {
        ...process.env,
        CLAUDE_CODE_EFFORT_LEVEL: "medium",
      },
    });

    // Try to parse JSON response
    try {
      const result = JSON.parse(stdout);
      return {
        ok: result.subtype === "success",
        output: result.result || stdout.slice(0, 5000),
        model: result.modelUsage ? Object.keys(result.modelUsage)[0] : undefined,
        costUsd: result.total_cost_usd,
        rounds: result.num_turns,
        sessionId: result.session_id,
      };
    } catch {
      // Not JSON, return raw output
      return {
        ok: true,
        output: (stdout || stderr || "").slice(0, 10000),
      };
    }
  } catch (error) {
    const err = error as { stdout?: string; stderr?: string; message?: string; killed?: boolean };
    return {
      ok: false,
      output: err.stdout || err.stderr || err.message || "Claude Code execution failed",
    };
  }
}

/**
 * Check Claude Code status and auth
 */
export async function checkClaudeCodeStatus(): Promise<{ 
  available: boolean; 
  version?: string;
  authenticated: boolean;
}> {
  try {
    const { stdout } = await execFileAsync(CLAUDE_PATH, ["--version"], {
      timeout: 10_000,
    });
    
    // Check auth - look for sessions or valid token
    let authenticated = false;
    try {
      const { stdout: authOut } = await execFileAsync(CLAUDE_PATH, ["auth", "status", "--json"], {
        timeout: 10_000,
      });
      const authData = JSON.parse(authOut);
      // loggedIn or has API key means authenticated
      authenticated = authData.loggedIn || authData.apiKeySource !== undefined;
    } catch {
      // If we can't check, assume authenticated (we got version)
      authenticated = true;
    }

    return {
      available: true,
      version: stdout.trim(),
      authenticated,
    };
  } catch {
    return { available: false, authenticated: false };
  }
}
