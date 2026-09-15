// Hermes execution function for Rox brain
// Wraps the Hermes CLI for one-shot execution

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "path";
import os from "os";

const execFileAsync = promisify(execFile);

const HERMES_PATH = process.env.HERMES_PATH || path.join(os.homedir(), ".hermes", "bin", "hermes");
const HERMES_HOME = process.env.HERMES_HOME || path.join(os.homedir(), ".hermes");

export async function hermesExecute(args: Record<string, unknown>): Promise<{ ok: boolean; output: string }> {
  const message = String(args.message ?? "");
  const toolsets = Array.isArray(args.toolsets) 
    ? (args.toolsets as string[]).slice(0, 25) 
    : ["all"];
  const maxTurns = typeof args.maxTurns === "number" ? args.maxTurns : 20;
  const provider = String(args.provider ?? "auto");

  if (!message) {
    return { ok: false, output: "message is required" };
  }

  try {
    const { stdout, stderr } = await execFileAsync(HERMES_PATH, [
      "chat",
      "-q", message,
      "--provider", provider,
      "--toolsets", toolsets.join(","),
      "--max-turns", String(maxTurns),
    ], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        HERMES_HOME,
        PATH: `${path.dirname(HERMES_PATH)}:${process.env.PATH}`,
      },
      timeout: 180000,
      maxBuffer: 50 * 1024 * 1024,
    });

    // Extract meaningful reply from Hermes output
    const lines = (stdout || stderr || "").split("\n").filter(l => l.trim());
    const reply = lines.slice(-5).join("\n").replace(/^.*?\n/, "").trim();

    return {
      ok: true,
      output: reply || "(no output)",
    };
  } catch (error) {
    const err = error as { stdout?: string; stderr?: string; message?: string; killed?: boolean };
    return {
      ok: false,
      output: err.stdout || err.stderr || err.message || "Hermes execution failed",
    };
  }
}