/**
 * Rox Brain — Main Entry Point
 *
 * `createBrain(config?)` returns a self-contained agent brain that wraps:
 *   • the agent loop (multi-round tool calling)
 *   • tools (registered tool definitions + runners)
 *   • skills (info metadata)
 *   • providers (LLM failover chain)
 *   • streaming (SSE event helpers)
 *
 * Usage:
 * ```ts
 * import { createBrain } from "@/lib/brain";
 *
 * const brain = createBrain({ temperature: 0.3 });
 *
 * // Synchronous-ish chat (runs the full agent loop, returns once):
 * const result = await brain.chat("search for next.js 15", []);
 * console.log(result.reply, result.toolCalls);
 *
 * // Streaming chat (returns a ReadableStream for SSE):
 * const stream = brain.chatStream("search for next.js 15", []);
 * return new Response(stream, {
 *   headers: { "Content-Type": "text/event-stream" },
 * });
 * ```
 */

import type {
  BrainConfig,
  AgentMessage,
  AgentResult,
  CognitiveState,
  ProviderName,
  SkillInfo,
  ToolCall,
  ToolDefinition,
} from "./types";

import {
  createSSEStream,
  type SSEStreamController,
} from "./streaming";
import { TOOL_DEFINITIONS, runTool as runBrainTool, openAIToolSchema } from "./tools";
import { getAllSkills, findRelevantSkills } from "./skills";

// Re-export everything consumers need from the brain package.
export type {
  BrainConfig,
  AgentMessage,
  AgentResult,
  CognitiveState,
  ProviderName,
  SkillInfo,
  ToolCall,
  ToolDefinition,
  SSEEvent,
  SSEMetaEvent,
  SSEChunkEvent,
  SSEToolCallEvent,
  SSEToolResultEvent,
  SSEDoneEvent,
} from "./types";

export {
  sseEvent,
  sseEventBytes,
  metaEvent,
  chunkEvent,
  toolCallEvent,
  toolResultEvent,
  doneEvent,
  SSECoder,
  createSSEStream,
} from "./streaming";

export type { SSEStreamController } from "./streaming";

// ─── Defaults ───────────────────────────────────────────────────────────────

const DEFAULT_MAX_ROUNDS = 4;
const DEFAULT_TEMPERATURE = 0.3;

// ─── Tool & Skill Registry (imported from dedicated modules) ────────────────

/** Full tool definitions with schemas AND execution functions. */
const ALL_TOOLS = TOOL_DEFINITIONS;

/** Helper to get tool schema for LLM function calling. */
export function getToolSchemas(): Array<{ type: "function"; function: { name: string; description: string; parameters: object } }> {
  return openAIToolSchema();
}

// ─── Brain Interface ────────────────────────────────────────────────────────

/** The public interface returned by createBrain(). */
export interface Brain {
  /**
   * Run the full agent loop (tool calling + LLM) and return a complete
   * {@link AgentResult} once the agent produces a final text reply.
   */
  chat(message: string, history: AgentMessage[]): Promise<AgentResult>;

  /**
   * Like `chat()`, but returns a `ReadableStream<Uint8Array>` that emits
   * SSE events as the agent reasons and calls tools.  Suitable for
   * piping directly into a `Response` body.
   */
  chatStream(
    message: string,
    history: AgentMessage[],
  ): Promise<ReadableStream<Uint8Array>>;

  /** Return all registered tool definitions. */
  getTools(): ToolDefinition[];

  /** Return info about all loaded skills. */
  getSkills(): SkillInfo[];
}

// ─── Provider Chain ─────────────────────────────────────────────────────────

interface ProviderEndpoint {
  name: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  priority: number;
}

/**
 * Build the ordered provider chain from environment variables.
 * Matches the existing convention in lib/assistant.ts.
 */
function buildProviderChain(modelOverride?: string): ProviderEndpoint[] {
  const chain: ProviderEndpoint[] = [];

  const omniKey = process.env.OMNIROUTE_API_KEY;
  if (omniKey) {
    chain.push({
      name: "omniroute",
      baseUrl: (
        process.env.OMNIROUTE_BASE_URL || "http://127.0.0.1:20128/v1"
      ).replace(/\/$/, ""),
      apiKey: omniKey,
      model: modelOverride || process.env.OMNIROUTE_MODEL || "auto/best-coding",
      priority: 80,
    });
  }

  const freeKey = process.env.FREELLM_API_KEY;
  if (freeKey) {
    chain.push({
      name: "freellm",
      baseUrl: (
        process.env.FREELLM_BASE_URL || "http://127.0.0.1:31415/v1"
      ).replace(/\/$/, ""),
      apiKey: freeKey,
      model: modelOverride || process.env.FREELLM_MODEL || "auto",
      priority: 60,
    });
  }

  const legacyKey = process.env.AI_API_KEY;
  if (legacyKey) {
    chain.push({
      name: "legacy",
      baseUrl: (
        process.env.AI_BASE_URL || "https://api.openai.com/v1"
      ).replace(/\/$/, ""),
      apiKey: legacyKey,
      model: modelOverride || process.env.AI_MODEL || "gpt-4o-mini",
      priority: 40,
    });
  }

  return chain.sort((a, b) => b.priority - a.priority);
}

// ─── Tool Registry ──────────────────────────────────────────────────────────

/**
 * Default tool definitions that the brain exposes.
 *
 * Tool *runners* (the functions that actually execute) are kept separate
 * here so the index module stays focused on orchestration.  A real
 * implementation would import them from the existing lib/executor,
 * lib/onlineTools, etc.  For now we declare the schemas and a runner
 * dispatch table that delegates to the appropriate module.
 */

const DEFAULT_TOOLS: ToolDefinition[] = ALL_TOOLS.map((t) => ({
  name: t.name,
  description: t.description,
  parameters: {
    type: "object",
    properties: Object.fromEntries(
      Object.entries(t.parameters.properties).map(([k, v]) => [k, { type: v.type as string, description: v.description ?? "" }])
    ),
    required: t.parameters.required,
  },
})) as ToolDefinition[];

// ─── Provider Calling ───────────────────────────────────────────────────────

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

const SYSTEM_PROMPT = [
  "You are Rox, a concise personal AI assistant.",
  "Answer naturally and helpfully in two short sentences or fewer.",
  "Do not claim to control devices, browse the web, or perform actions unless the system explicitly provides that capability.",
].join(" ");

/**
 * Call the first available LLM provider.
 * Returns `{ reply, provider }` or `null` if all fail.
 */
async function callProvider(
  messages: ChatMessage[],
  chain: ProviderEndpoint[],
  temperature: number,
): Promise<{ reply: string; provider: string } | null> {
  for (const ep of chain) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20_000);
    try {
      const res = await fetch(`${ep.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${ep.apiKey}`,
        },
        body: JSON.stringify({
          model: ep.model,
          temperature,
          messages,
        }),
        signal: controller.signal,
      });
      if (!res.ok) continue;
      const data = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const reply = data.choices?.[0]?.message?.content?.trim();
      if (reply) return { reply, provider: ep.name };
    } catch {
      continue;
    } finally {
      clearTimeout(timeout);
    }
  }
  return null;
}

/**
 * Call an LLM provider with streaming enabled.
 * Returns the raw Response so the caller can pipe its body.
 */
async function callProviderStream(
  messages: ChatMessage[],
  chain: ProviderEndpoint[],
  temperature: number,
): Promise<{ response: Response; provider: string } | null> {
  for (const ep of chain) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);
    try {
      const res = await fetch(`${ep.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${ep.apiKey}`,
        },
        body: JSON.stringify({
          model: ep.model,
          temperature,
          stream: true,
          messages,
        }),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) continue;
      return { response: res, provider: ep.name };
    } catch {
      continue;
    } finally {
      clearTimeout(timeout);
    }
  }
  return null;
}

// ─── Agent Loop ─────────────────────────────────────────────────────────────

/**
 * Run the multi-round agent loop:
 *   1. Send messages + tool schemas to the LLM.
 *   2. If the LLM returns tool_calls, execute them and loop.
 *   3. Once the LLM returns plain text (no tool_calls), that's the final reply.
 *
 * Returns the assembled AgentResult.
 */
async function agentLoop(
  message: string,
  history: AgentMessage[],
  config: BrainConfig,
  providerChain: ProviderEndpoint[],
  tools: ToolDefinition[],
  skills: SkillInfo[],
): Promise<AgentResult> {
  const maxRounds = config.maxRounds ?? DEFAULT_MAX_ROUNDS;
  const temperature = config.temperature ?? DEFAULT_TEMPERATURE;
  const collectedToolCalls: ToolCall[] = [];

  // Build the initial messages array.
  const messages: ChatMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...history.slice(-8).map((h) => ({
      role: (h.role === "rox" || h.role === "assistant"
        ? "assistant"
        : "user") as "assistant" | "user",
      content: h.content,
    })),
    { role: "user", content: message },
  ];

  // Prepare tool schemas for function calling.
  const fnTools = tools.map((t) => ({
    type: "function" as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    },
  }));

  let finalReply = "";
  let cognitiveState: CognitiveState = "focus";
  let providerName: ProviderName = "local";

  for (let round = 0; round < maxRounds; round++) {
    // Call the LLM with tool schemas.
    for (const ep of providerChain) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 45_000);
      try {
        const res = await fetch(`${ep.baseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${ep.apiKey}`,
          },
          body: JSON.stringify({
            model: config.model || ep.model,
            temperature,
            max_tokens: 1_500,
            messages,
            tools: fnTools,
          }),
          signal: controller.signal,
        });
        if (!res.ok) continue;

        const data = (await res.json()) as {
          choices?: Array<{
            message?: {
              content?: string;
              tool_calls?: Array<{
                id: string;
                function: { name: string; arguments: string };
              }>;
            };
          }>;
        };
        const choice = data.choices?.[0]?.message;

        // Structured tool_calls from the LLM.
        const llmToolCalls = choice?.tool_calls;
        if (llmToolCalls?.length) {
          const tc = llmToolCalls[0];
          const toolName = tc.function.name;
          let toolArgs: Record<string, unknown> = {};
          try {
            toolArgs = JSON.parse(tc.function.arguments);
          } catch {
            toolArgs = {};
          }

          // Execute the tool via the runner dispatch table.
          const result = await runBrainTool(toolName, toolArgs);
          collectedToolCalls.push({
            name: toolName,
            args: toolArgs,
            ok: result.ok,
            output: result.output,
          });

          // Append assistant + tool messages and loop.
          messages.push({
            role: "assistant",
            content: choice?.content ?? "",
          });
          messages.push({
            role: "user",
            content: `Tool "${toolName}" result (ok=${result.ok}):\n${result.output.slice(0, 1_800)}`,
          });

          cognitiveState = "automating";
          providerName = "model";
          break; // Move to next round.
        }

        // No tool calls — this is the final text reply.
        const content = choice?.content?.trim() ?? "";
        if (content) {
          finalReply = content;
          providerName = "model";
          break;
        }
      } catch {
        continue;
      } finally {
        clearTimeout(timeout);
      }
    }

    // If we got a final reply, break the round loop.
    if (finalReply) break;
  }

  // If after all rounds we still have no reply, synthesise one.
  if (!finalReply) {
    if (collectedToolCalls.length > 0) {
      const last = collectedToolCalls[collectedToolCalls.length - 1];
      finalReply = last.ok
        ? `Done. ${last.output.slice(0, 500)}`
        : `I tried ${last.name} but it failed: ${last.output.slice(0, 300)}`;
    } else {
      finalReply =
        "I heard you, but my reasoning model is not connected yet. I can still control the orb locally.";
      cognitiveState = "offline";
      providerName = "local";
    }
  }

  return {
    reply: finalReply,
    toolCalls: collectedToolCalls,
    provider: providerName,
    cognitiveState,
    skills,
  };
}

// ─── Tool Runner Dispatch ───────────────────────────────────────────────────

/**
 * Execute a tool by name.  This is a lightweight dispatch table that
 * wraps the existing lib modules.  If the tool name doesn't match any
 * registered runner, it returns a synthetic error.
 */
async function runTool(
  name: string,
  args: Record<string, unknown>,
): Promise<{ ok: boolean; output: string }> {
  try {
    // Dynamic imports so the brain module stays tree-shakeable and
    // doesn't pull in every lib module at bundle time.
    switch (name) {
      case "shell": {
        const { runShell } = await import("../executor");
        return runShell(String(args.command ?? ""), 15_000);
      }
      case "read_file": {
        const { readFileTool } = await import("../executor");
        return readFileTool(String(args.file_path ?? ""));
      }
      case "write_file": {
        const { writeFileTool } = await import("../executor");
        return writeFileTool(
          String(args.file_path ?? ""),
          String(args.content ?? ""),
        );
      }
      case "web_search": {
        const { searchWeb } = await import("../onlineTools");
        const raw = await searchWeb(String(args.query ?? ""));
        return { ok: true, output: raw };
      }
      case "weather": {
        const { getWeather } = await import("../onlineTools");
        const text = await getWeather(String(args.location ?? ""));
        return { ok: true, output: text };
      }
      case "calculate": {
        const { calculate } = await import("../onlineTools");
        try {
          return {
            ok: true,
            output: `= ${calculate(String(args.expression ?? ""))}`,
          };
        } catch (err) {
          return {
            ok: false,
            output: err instanceof Error ? err.message : "Invalid calculation.",
          };
        }
      }
      default:
        return { ok: false, output: `Unknown tool: "${name}"` };
    }
  } catch (err) {
    return {
      ok: false,
      output: err instanceof Error ? err.message : "Tool execution failed.",
    };
  }
}

// ─── Brain Factory ──────────────────────────────────────────────────────────

/**
 * Create a Rox brain instance.
 *
 * @param config - Optional configuration overrides.
 * @returns A {@link Brain} object with `chat`, `chatStream`, `getTools`,
 *          and `getSkills` methods.
 */
export function createBrain(config?: BrainConfig): Brain {
  const mergedConfig: BrainConfig = {
    maxRounds: config?.maxRounds ?? DEFAULT_MAX_ROUNDS,
    temperature: config?.temperature ?? DEFAULT_TEMPERATURE,
    model: config?.model,
  };

  const providerChain = buildProviderChain(mergedConfig.model);
  const tools: ToolDefinition[] = [...DEFAULT_TOOLS];
  const skills: SkillInfo[] = [];

  return {
    async chat(
      message: string,
      history: AgentMessage[],
    ): Promise<AgentResult> {
      return agentLoop(message, history, mergedConfig, providerChain, tools, skills);
    },

    async chatStream(
      message: string,
      history: AgentMessage[],
    ): Promise<ReadableStream<Uint8Array>> {
      const sse = createSSEStream();
      const cognitiveState: CognitiveState = "reasoning";

      // Fire-and-forget the agent loop; push events as they happen.
      (async () => {
        try {
          sse.sendMeta("model", cognitiveState);

          // Attempt a streaming LLM call first.
          const messages: Array<{
            role: "system" | "user" | "assistant";
            content: string;
          }> = [
            { role: "system", content: SYSTEM_PROMPT },
            ...history.slice(-8).map((h) => ({
              role: (h.role === "rox" || h.role === "assistant"
                ? "assistant"
                : "user") as "assistant" | "user",
              content: h.content,
            })),
            { role: "user", content: message },
          ];

          const streaming = await callProviderStream(
            messages,
            providerChain,
            mergedConfig.temperature!,
          );

          if (streaming) {
            const reader = streaming.response.body!.getReader();
            const decoder = new TextDecoder();
            let reply = "";

            let buffer = "";
            while (true) {
              const { done, value } = await reader.read();
              buffer += decoder.decode(value ?? new Uint8Array(), {
                stream: !done,
              });
              const events = buffer.split("\n\n");
              buffer = events.pop() ?? "";
              for (const evt of events) {
                const data = evt
                  .split("\n")
                  .find((l) => l.startsWith("data: "))
                  ?.slice(6);
                if (!data || data === "[DONE]") continue;
                const delta = (
                  JSON.parse(data) as {
                    choices?: Array<{ delta?: { content?: string } }>;
                  }
                ).choices?.[0]?.delta?.content;
                if (delta) {
                  reply += delta;
                  sse.sendChunk(delta);
                }
              }
              if (done) break;
            }

            sse.finish(reply.trim(), [], "model", cognitiveState);
            return;
          }

          // Fallback: non-streaming agent loop.
          const result = await agentLoop(
            message,
            history,
            mergedConfig,
            providerChain,
            tools,
            skills,
          );

          // Replay tool calls as SSE events so the client sees them.
          for (const tc of result.toolCalls) {
            sse.sendToolCall(tc.name, tc.args);
            sse.sendToolResult(tc.name, tc.ok, tc.output);
          }

          // Emit the reply as a single chunk (already fully computed).
          sse.sendChunk(result.reply);

          sse.finish(
            result.reply,
            result.toolCalls,
            result.provider,
            result.cognitiveState,
          );
        } catch (err) {
          sse.sendChunk(
            "Something went wrong while processing your request.",
          );
          sse.finish(
            "Something went wrong while processing your request.",
            [],
            "local",
            "offline",
          );
        }
      })();

      return sse.stream;
    },

    getTools(): ToolDefinition[] {
      return [...tools];
    },

    getSkills(): SkillInfo[] {
      return [...skills];
    },
  };
}
