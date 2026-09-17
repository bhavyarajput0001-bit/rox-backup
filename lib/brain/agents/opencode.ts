/**
 * lib/brain/agents/opencode.ts
 * 
 * OpenCode CLI integration for Rox brain.
 * Wraps OpenCode as a tool that can execute coding tasks.
 */

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "path";
import os from "os";

const execFileAsync = promisify(execFile);

const OPENCODE_PATH = process.env.OPENCODE_PATH || path.join(os.homedir(), ".opencode", "bin", "opencode");

export interface OpenCodeOptions {
  task: string;
  model?: string;
  workdir?: string;
  thinking?: boolean;
  variant?: "low" | "medium" | "high" | "max";
}

export interface OpenCodeResult {
  ok: boolean;
  output: string;
  model?: string;
  thinking?: boolean;
}

/**
 * Execute a task via OpenCode in run mode (one-shot).
 */
export async function runOpenCode(options: OpenCodeOptions): Promise<OpenCodeResult> {
  const {
    task,
    model,
    workdir,
    thinking,
    variant,
  } = options;

  if (!task.trim()) {
    return { ok: false, output: "Task is required" };
  }

  try {
    const cmdArgs: string[] = ["run", `"${task.replace(/"/g, '\\"')}"`];
    
    if (model) cmdArgs.push("--model", model);
    if (thinking) cmdArgs.push("--thinking");
    if (variant) cmdArgs.push("--variant", variant);

    // Join the run command properly
    const fullCommand = `run ${task}${model ? ` --model ${model}` : ""}${thinking ? " --thinking" : ""}${variant ? ` --variant ${variant}` : ""}`;
    
    const { stdout, stderr } = await execFileAsync(OPENCODE_PATH, fullCommand.split(" "), {
      cwd: workdir || process.cwd(),
      timeout: 300_000,
      maxBuffer: 10 * 1024 * 1024,
      shell: true,
    });

    return {
      ok: true,
      output: (stdout || stderr || "").slice(0, 10000),
      model,
      thinking,
    };
  } catch (error) {
    const err = error as { stdout?: string; stderr?: string; message?: string };
    return {
      ok: false,
      output: err.stdout || err.stderr || err.message || "OpenCode execution failed",
    };
  }
}

/**
 * Check OpenCode status
 */
export async function checkOpenCodeStatus(): Promise<{
  available: boolean;
  version?: string;
}> {
  try {
    const { stdout } = await execFileAsync(OPENCODE_PATH, ["--version"], {
      timeout: 10_000,
    });
    
    return {
      available: true,
      version: stdout.trim(),
    };
  } catch {
    return { available: false };
  }
}
