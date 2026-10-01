/**
 * Unified Agent Orchestration Layer
 *
 * Ties together:
 * - Multi-agent department system
 * - ECC 68 specialized agents
 * - DeepSeek fallback
 * - Memory sync
 * - Self-learning loop
 */

import {
  executeTask,
  getSystemStatus,
  recallAcrossDepartments,
} from "./agents/multiAgent";
import {
  loadECCAgents,
  routeToECCAgent,
  executeECCAgent,
  getECCStats,
} from "./eccAgents";
import { callDeepSeek, deepSeekHealthCheck } from "./deepseek";
import { syncMemory, getCrossAgentRecall } from "./memorySync";
import type { TaskResult } from "./agents/multiAgent";

export type OrchestrationRequest = {
  message: string;
  preferredDept?: string;
  preferECC?: boolean;
  preferDeepSeek?: boolean;
};

export type OrchestrationResult = {
  success: boolean;
  reply: string;
  assignedDepartment: string;
  eccAgent?: string;
  provider: string;
  latencyMs: number;
  lessonsLearned: number;
  crossAgentRecall: Array<{ source: string; content: string }>;
};

/**
 * Main orchestration function
 * Routes tasks through the optimal path:
 * 1. Try ECC agents first (if preferred)
 * 2. Route through multi-agent departments
 * 3. Fallback to DeepSeek or LLM
 */
export async function orchestrateTask(
  request: OrchestrationRequest,
): Promise<OrchestrationResult> {
  const startTime = Date.now();

  // Sync memory from all sources
  try {
    await syncMemory();
  } catch {
    // Ignore sync errors
  }

  // Get cross-agent recall
  let crossAgentRecall: Array<{ source: string; content: string }> = [];
  try {
    crossAgentRecall = await getCrossAgentRecall(request.message);
  } catch {}

  // Phase 1: Try ECC agents
  if (request.preferECC) {
    const eccRoute = await routeToECCAgent(request.message);
    if (eccRoute.agent && eccRoute.confidence > 0.5) {
      const eccResult = await executeECCAgent(eccRoute.agent, request.message);
      if (eccResult.success) {
        return {
          success: true,
          reply: eccResult.output,
          assignedDepartment: "ecc",
          eccAgent: eccRoute.agent.name,
          provider: "ecc",
          latencyMs: Date.now() - startTime,
          lessonsLearned: 0,
          crossAgentRecall: crossAgentRecall.slice(0, 3),
        };
      }
    }
  }

  // Phase 2: Multi-agent department routing
  const deptResult = await executeTask(request.message, request.preferredDept);

  // Sync result to shared memory
  try {
    await syncToSharedMemory(
      request.message,
      deptResult.result.output,
      deptResult.result.success,
    );
  } catch {}

  // Phase 3: DeepSeek fallback for heavy reasoning
  let provider = "multi-agent";
  if (deptResult.result.latencyMs > 25000 || !deptResult.result.success) {
    const dsHealth = await deepSeekHealthCheck();
    if (dsHealth.available && request.preferDeepSeek) {
      const dsResult = await callDeepSeek([
        {
          role: "system",
          content: "You are Rox, a helpful AI assistant with access to tools.",
        },
        { role: "user", content: request.message },
      ]);
      if (dsResult.success) {
        provider = "deepseek";
        return {
          success: true,
          reply: dsResult.reply,
          assignedDepartment: deptResult.assignedDepartment,
          provider,
          latencyMs: Date.now() - startTime,
          lessonsLearned: deptResult.newLessons,
          crossAgentRecall: crossAgentRecall.slice(0, 3),
        };
      }
    }
  }

  return {
    success: deptResult.result.success,
    reply: deptResult.result.output,
    assignedDepartment: deptResult.assignedDepartment,
    provider,
    latencyMs: Date.now() - startTime,
    lessonsLearned: deptResult.newLessons,
    crossAgentRecall: crossAgentRecall.slice(0, 3),
  };
}

/**
 * Get comprehensive system status
 */
export async function getFullSystemStatus(): Promise<{
  multiAgent: Awaited<ReturnType<typeof getSystemStatus>>;
  ecc: Awaited<ReturnType<typeof getECCStats>>;
  deepSeek: Awaited<ReturnType<typeof deepSeekHealthCheck>>;
  lastSync: string;
}> {
  const [multiAgent, ecc, deepSeek] = await Promise.all([
    getSystemStatus(),
    getECCStats(),
    deepSeekHealthCheck(),
  ]);

  return {
    multiAgent,
    ecc,
    deepSeek,
    lastSync: new Date().toISOString(),
  };
}

async function syncToSharedMemory(
  task: string,
  result: string,
  success: boolean,
): Promise<void> {
  // Already handled by memorySync
  void task;
  void result;
  void success;
}
