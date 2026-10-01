/**
 * lib/brain/agentOrchestrator.ts
 * 
 * Main orchestrator that routes tasks to the appropriate agent:
 * - Hermes (default): general tasks, tool execution
 * - Claude Code: coding tasks, refactoring, PR review
 * - OpenCode: alternative coding agent
 * 
 * The orchestrator decides which agent to use based on task type
 * and available capabilities.
 */

import { runClaudeCode, checkClaudeCodeStatus } from "./agents/claudeCode";
import { runOpenCode, checkOpenCodeStatus } from "./agents/opencode";
import { hermesExecute } from "./hermesExecute";

export type AgentType = "hermes" | "claude-code" | "opencode";
export type TaskCategory = "general" | "coding" | "refactor" | "review" | "debug" | "test";

export interface OrchestrationResult {
  agent: AgentType;
  ok: boolean;
  output: string;
  metadata?: {
    model?: string;
    rounds?: number;
    costUsd?: number;
    sessionId?: string;
  };
}

export interface OrchestrationOptions {
  task: string;
  preferredAgent?: AgentType;
  category?: TaskCategory;
  workdir?: string;
  maxTurns?: number;
}

/**
 * Determine which agent should handle a task
 */
function classifyTask(task: string): TaskCategory {
  const lower = task.toLowerCase();
  
  if (
    lower.includes("code") || 
    lower.includes("implement") || 
    lower.includes("function") ||
    lower.includes("class") ||
    lower.includes("component") ||
    lower.includes("write ") ||
    lower.includes("fix ") ||
    lower.includes("add ")
  ) {
    return "coding";
  }
  
  if (
    lower.includes("refactor") ||
    lower.includes("restructure") ||
    lower.includes("clean up")
  ) {
    return "refactor";
  }
  
  if (
    lower.includes("review") ||
    lower.includes("pr ") ||
    lower.includes("check ") ||
    lower.includes("audit")
  ) {
    return "review";
  }
  
  if (
    lower.includes("debug") ||
    lower.includes("fix bug") ||
    lower.includes("error") ||
    lower.includes("issue")
  ) {
    return "debug";
  }
  
  if (
    lower.includes("test") ||
    lower.includes("unit test") ||
    lower.includes("integration")
  ) {
    return "test";
  }
  
  return "general";
}

/**
 * Get available agents and their status
 */
export async function getAvailableAgents() {
  const [claudeStatus, opencodeStatus] = await Promise.all([
    checkClaudeCodeStatus(),
    checkOpenCodeStatus(),
  ]);
  
  return {
    hermes: { available: true, name: "Hermes" },
    claudeCode: claudeStatus,
    opencode: opencodeStatus,
  };
}

/**
 * Route a task to the appropriate agent
 */
export async function orchestrateTask(options: OrchestrationOptions): Promise<OrchestrationResult> {
  const {
    task,
    preferredAgent,
    category: providedCategory,
    workdir,
    maxTurns = 10,
  } = options;

  const category = providedCategory || classifyTask(task);
  
  // Decision logic for agent selection
  let agent: AgentType;
  
  if (preferredAgent) {
    agent = preferredAgent;
  } else if (category === "coding" || category === "refactor" || category === "review" || category === "debug") {
    // Coding tasks prefer Claude Code
    agent = "claude-code";
  } else {
    // Default to Hermes for general tasks
    agent = "hermes";
  }

  // Execute based on selected agent
  switch (agent) {
    case "claude-code": {
      if (! (await checkClaudeCodeStatus()).available) {
        // Fallback to Hermes if Claude Code unavailable
        return orchestrateTask({ ...options, preferredAgent: "hermes" });
      }
      
      const result = await runClaudeCode({
        task,
        maxTurns,
        workdir,
        allowedTools: category === "review" ? ["Read", "Bash"] : undefined,
      });
      
      return {
        agent: "claude-code",
        ok: result.ok,
        output: result.output,
        metadata: {
          model: result.model,
          rounds: result.rounds,
          costUsd: result.costUsd,
          sessionId: result.sessionId,
        },
      };
    }
    
    case "opencode": {
      if (! (await checkOpenCodeStatus()).available) {
        return orchestrateTask({ ...options, preferredAgent: "hermes" });
      }
      
      const result = await runOpenCode({
        task,
        workdir,
      });
      
      return {
        agent: "opencode",
        ok: result.ok,
        output: result.output,
        metadata: {
          model: result.model,
        },
      };
    }
    
    case "hermes":
    default: {
      const result = await hermesExecute({
        message: task,
        maxTurns,
      });
      
      return {
        agent: "hermes",
        ok: result.ok,
        output: result.output,
      };
    }
  }
}

/**
 * Quick task executor that auto-selects the best agent
 */
export async function executeTask(options: OrchestrationOptions): Promise<OrchestrationResult> {
  return orchestrateTask(options);
}
