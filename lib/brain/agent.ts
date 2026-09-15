/**
 * lib/brain/agent.ts
 *
 * Rox's core agent brain: a ReAct-style loop over native OpenAI function
 * calling with streaming SSE support and multi-model failover.
 *
 * Loop shape (bounded at MAX_ROUNDS = 8):
 *   user message → system prompt → LLM(tools) → tool_calls?
 *     ↳ yes: execute each call, append tool results, repeat
 *     ↳ no : that content is the final reply → done
 *
 * Tool calls use the model's structured `tool_calls` channel — never JSON
 * scraped out of prose.
 *
 * Two entry points:
 *   - runAgent()        → awaited result (non-streaming)
 *   - streamAgent()     → ReadableStream of SSE bytes
 *   - streamAgentEvents()→ the raw event generator, if you want to wrap it
 *
 * SSE events: meta | chunk | tool_call | tool_result | done (+ error)
 */

import {
  chatCompletion,
  chatCompletionStream,
  describeProviderChain,
  hasProvider,
  ProviderChainError,
  type ChatMessage,
  type ChatResult,
  type ProviderConfig,
  type ProviderId,
  type ToolCall,
  type ToolDefinition,
  type Usage,
} from "./providers";
import {
  buildSystemPromptFromDisk,
  capabilitySummary,
  ROX_WORKSPACE,
  type MemoryContext,
  type SkillSummary,
} from "./systemPrompt";
import {
  runShell,
  readFileTool,
  writeFileTool,
  listDirTool,
  openAppTool,
  openUrlTool,
  type ExecResult,
} from "@/lib/executor";
import {
  searchWeb,
  readWebpage,
  summarizeUrl,
  getWeather,
  getNews,
  calculate,
} from "@/lib/onlineTools";
import { recallLessons, rememberLesson } from "@/lib/memory";
import { parseLocalYTCommand, parseYouTubeCommand } from "@/lib/youtubeIntent";
import { runLocalYTCommand } from "@/lib/youtubeCommands";
import { runYouTubeControl } from "@/lib/youtubeControl";

/* -------------------------------------------------------------------------- */
/* Constants & types                                                           */
/* -------------------------------------------------------------------------- */

/** Hard cap on reasoning rounds. Round = one LLM exchange. */
export const MAX_ROUNDS = 8;

/** Default output budget per LLM call. */
export const DEFAULT_MAX_TOKENS = 2_048;
export const DEFAULT_TEMPERATURE = 0.2;

/** Per-tool execution budget. */
export const TOOL_TIMEOUT_MS = 30_000;

/** Max characters of a tool result handed back to the model. */
const TOOL_OUTPUT_LIMIT = 6_000;

export type AgentHistoryTurn = {
  role: "user" | "assistant" | "rox";
  content: string;
};

export type ToolContext = {
  /** The user request driving this run. */
  request: string;
  /** 1-based round number. */
  round: number;
  signal?: AbortSignal;
};

export type ToolRunResult = { ok: boolean; output: string };

export type AgentTool = {
  name: string;
  description: string;
  /** JSON Schema for the arguments object. */
  parameters: Record<string, unknown>;
  run: (args: Record<string, unknown>, ctx: ToolContext) => Promise<ToolRunResult>;
  /**
   * Optional gate: return true when this specific invocation is destructive,
   * irreversible, or touches sensitive data and should be confirmed first.
   */
  requiresConfirmation?: (args: Record<string, unknown>) => boolean | string;
};

export type ToolRegistry = Map<string, AgentTool>;

export type ToolCallRecord = {
  id: string;
  name: string;
  args: Record<string, unknown>;
  ok: boolean;
  output: string;
  ms: number;
  /** True when execution was skipped pending user confirmation. */
  skipped?: boolean;
};

export type AgentResult = {
  reply: string;
  toolCalls: ToolCallRecord[];
  rounds: number;
  /** Rounds where the model actually asked for tools. */
  toolRounds: number;
  provider: ProviderId | null;
  providerLabel: string | null;
  model: string | null;
  usage?: Usage;
  /** Tool calls that were gated behind confirmation. */
  pendingConfirmations: Array<{ id: string; name: string; args: unknown; reason: string }>;
  systemPromptSections: string[];
  truncated: boolean;
};

export type AgentEvent =
  | {
      type: "meta";
      request: string;
      maxRounds: number;
      tools: string[];
      providers: Array<{ id: ProviderId; label: string; model: string }>;
      systemPromptSections: string[];
      startedAt: string;
    }
  | { type: "chunk"; text: string; round: number }
  | { type: "tool_call"; id: string; name: string; args: unknown; round: number }
  | {
      type: "tool_result";
      id: string;
      name: string;
      ok: boolean;
      output: string;
      ms: number;
      round: number;
      skipped?: boolean;
    }
  | {
      type: "done";
      reply: string;
      rounds: number;
      provider: ProviderId | null;
      providerLabel: string | null;
      model: string | null;
      toolCalls: ToolCallRecord[];
      usage?: Usage;
      truncated: boolean;
    }
  | { type: "error"; message: string; attempts?: unknown };

export type RunAgentOptions = {
  /** The user's message. */
  message: string;
  /** Prior conversation, oldest first. */
  history?: AgentHistoryTurn[];
  /** Tool registry. Defaults to createDefaultToolRegistry(). */
  tools?: ToolRegistry;
  /** Extra memory blocks merged into the system prompt. */
  memory?: MemoryContext;
  /** Extra skills listed in the system prompt. */
  skills?: SkillSummary[];
  /** Extra environment facts shown in the system prompt. */
  environment?: Record<string, string>;
  /** Prebuilt system prompt — skips disk loading and prompt assembly. */
  systemPrompt?: string;
  /** Pin one provider instead of walking the failover chain. */
  providerId?: ProviderId;
  /** Override the model. */
  model?: string;
  maxRounds?: number;
  maxTokens?: number;
  temperature?: number;
  /** Called before a gated (destructive) tool runs. Return true to allow. */
  confirm?: (
    call: { id: string; name: string; args: Record<string, unknown>; reason: string },
  ) => boolean | Promise<boolean>;
  /** Names of tool calls the caller has already approved (by id). */
  approvedToolCallIds?: string[];
  signal?: AbortSignal;
  /** Observe events even in the non-streaming path. */
  onEvent?: (event: AgentEvent) => void;
};

/* -------------------------------------------------------------------------- */
/* Default tool registry                                                       */
/* -------------------------------------------------------------------------- */

function jsonSchema(
  properties: Record<string, { type: string; description: string }>,
  required: string[] = [],
): Record<string, unknown> {
  return { type: "object", properties, required };
}

/** Shell commands that should never run silently. */
const DESTRUCTIVE_COMMAND =
  /\b(rm|rmdir|mv|dd|truncate|shred|kill|killall|pkill|git\s+push\s+--force|git\s+reset\s+--hard|git\s+clean\s+-[a-z]*f|npm\s+publish|chmod|chown)\b/;

function shellRequiresConfirmation(args: Record<string, unknown>): boolean | string {
  const command = String(args.command ?? "");
  if (DESTRUCTIVE_COMMAND.test(command)) {
    return `command looks destructive: ${command.slice(0, 120)}`;
  }
  return false;
}

function writeRequiresConfirmation(
  args: Record<string, unknown>,
): boolean | string {
  const target = String(args.file_path ?? "");
  if (/(^|\/)\.env(\.|$)|\.pem$|id_rsa|credentials|\.ssh\//i.test(target)) {
    return `target may hold secrets/credentials: ${target}`;
  }
  return false;
}

/**
 * The default Rox tool set — the same capabilities the legacy
 * `lib/roxAgent.ts` exposed, re-expressed as a registry the brain drives.
 */
export function createDefaultToolRegistry(): ToolRegistry {
  const tools: AgentTool[] = [
    {
      name: "shell",
      description:
        "Run an allow-listed shell command in the Rox workspace (~/Downloads/Rox). Allowed binaries include cat, ls, find, grep, node, npm, npx, python3, git, curl, open, osascript, pmset, screencapture. Destructive commands (sudo, shutdown, mkfs, dd, rm -rf /) are blocked.",
      parameters: jsonSchema(
        {
          command: { type: "string", description: "Shell command to execute" },
          cwd: {
            type: "string",
            description: "Optional absolute working directory",
          },
        },
        ["command"],
      ),
      requiresConfirmation: shellRequiresConfirmation,
      run: async (args, ctx) => {
        const command = String(args.command ?? "");
        const cwd = typeof args.cwd === "string" ? args.cwd : "";
        const result = cwd
          ? await runShell(`cd ${JSON.stringify(cwd)} && ${command}`, TOOL_TIMEOUT_MS)
          : await runShell(command, TOOL_TIMEOUT_MS);
        void ctx;
        return result;
      },
    },
    {
      name: "read_file",
      description:
        "Read a UTF-8 text file from disk. Pass an absolute path. Returns up to 20 KB.",
      parameters: jsonSchema(
        { file_path: { type: "string", description: "Absolute file path" } },
        ["file_path"],
      ),
      run: (args) => readFileTool(String(args.file_path ?? "")),
    },
    {
      name: "write_file",
      description:
        "Write text to a file, creating parent directories. Pass an absolute path.",
      parameters: jsonSchema(
        {
          file_path: { type: "string", description: "Absolute file path" },
          content: { type: "string", description: "Content to write" },
        },
        ["file_path", "content"],
      ),
      requiresConfirmation: writeRequiresConfirmation,
      run: (args) =>
        writeFileTool(String(args.file_path ?? ""), String(args.content ?? "")),
    },
    {
      name: "list_dir",
      description: "List directory entries. Pass an absolute path.",
      parameters: jsonSchema(
        { path: { type: "string", description: "Absolute directory path" } },
        ["path"],
      ),
      run: (args) => listDirTool(String(args.path ?? "")),
    },
    {
      name: "open_app",
      description:
        "Launch a macOS application by name (e.g. 'Notes', 'Safari', 'Terminal').",
      parameters: jsonSchema(
        { app: { type: "string", description: "Application name" } },
        ["app"],
      ),
      run: (args) => openAppTool(String(args.app ?? "")),
    },
    {
      name: "open_url",
      description: "Open an http(s) URL in the user's default browser.",
      parameters: jsonSchema(
        { url: { type: "string", description: "Full http(s) URL" } },
        ["url"],
      ),
      run: (args) => openUrlTool(String(args.url ?? "")),
    },
    {
      name: "web_search",
      description:
        "Search the web (Exa). Returns up to 5 results with titles and summaries.",
      parameters: jsonSchema(
        { query: { type: "string", description: "Search query" } },
        ["query"],
      ),
      run: async (args) => {
        try {
          return { ok: true, output: await searchWeb(String(args.query ?? "")) };
        } catch (error) {
          return {
            ok: false,
            output: `Search failed: ${error instanceof Error ? error.message : "unknown"}`,
          };
        }
      },
    },
    {
      name: "read_webpage",
      description: "Fetch and read the text content of a web page (Jina reader).",
      parameters: jsonSchema(
        { url: { type: "string", description: "Webpage URL" } },
        ["url"],
      ),
      run: async (args) => {
        try {
          return { ok: true, output: await readWebpage(String(args.url ?? "")) };
        } catch (error) {
          return {
            ok: false,
            output: `Could not read page: ${error instanceof Error ? error.message : "unknown"}`,
          };
        }
      },
    },
    {
      name: "summarize_url",
      description: "Fetch a page and return a longer clean-text extract for summarizing.",
      parameters: jsonSchema(
        { url: { type: "string", description: "Webpage URL" } },
        ["url"],
      ),
      run: async (args) => {
        try {
          return { ok: true, output: await summarizeUrl(String(args.url ?? "")) };
        } catch (error) {
          return {
            ok: false,
            output: `Could not summarize page: ${error instanceof Error ? error.message : "unknown"}`,
          };
        }
      },
    },
    {
      name: "weather",
      description: "Get the current weather for a location.",
      parameters: jsonSchema(
        { location: { type: "string", description: "City or location name" } },
        ["location"],
      ),
      run: async (args) => {
        try {
          return { ok: true, output: await getWeather(String(args.location ?? "")) };
        } catch (error) {
          return {
            ok: false,
            output: `Weather lookup failed: ${error instanceof Error ? error.message : "unknown"}`,
          };
        }
      },
    },
    {
      name: "news",
      description: "Get the latest news headlines, optionally on a topic.",
      parameters: jsonSchema({
        topic: { type: "string", description: "News topic (optional)" },
      }),
      run: async (args) => {
        try {
          return { ok: true, output: await getNews(String(args.topic ?? "")) };
        } catch (error) {
          return {
            ok: false,
            output: `News lookup failed: ${error instanceof Error ? error.message : "unknown"}`,
          };
        }
      },
    },
    {
      name: "calculate",
      description: "Evaluate a math expression safely (e.g. '6 * 7').",
      parameters: jsonSchema(
        { expression: { type: "string", description: "Math expression" } },
        ["expression"],
      ),
      run: (args) => {
        try {
          const value = calculate(String(args.expression ?? ""));
          return Promise.resolve({ ok: true, output: `${args.expression} = ${value}` });
        } catch (error) {
          return Promise.resolve({
            ok: false,
            output: `Invalid calculation: ${error instanceof Error ? error.message : "unknown"}`,
          });
        }
      },
    },
    {
      name: "recall_memory",
      description:
        "Search Rox's durable memory of past tasks (what was asked, what was done, what happened). Use before repeating work that may have been done before.",
      parameters: jsonSchema(
        {
          query: { type: "string", description: "What to recall" },
          limit: { type: "string", description: "Max hits (default 3)" },
        },
        ["query"],
      ),
      run: async (args) => {
        try {
          const limit = Number(args.limit) || 3;
          const hits = await recallLessons(String(args.query ?? ""), limit);
          if (!hits.length) return { ok: true, output: "No matching past work found." };
          return {
            ok: true,
            output: hits
              .map(
                (hit) =>
                  `- [${hit.lesson.runs}x score=${hit.score}] ${hit.lesson.task} → ${hit.lesson.action} :: ${hit.lesson.result}`,
              )
              .join("\n"),
          };
        } catch (error) {
          return {
            ok: false,
            output: `Recall failed: ${error instanceof Error ? error.message : "unknown"}`,
          };
        }
      },
    },
    {
      name: "youtube",
      description:
        "Relay a command to the YouTube automation agent (port 3457). Commands: status, jobs, dashboard, generate <topic>, upload, etc.",
      parameters: jsonSchema(
        { command: { type: "string", description: "YouTube command" } },
        ["command"],
      ),
      run: async (args) => {
        const command = String(args.command ?? "");
        const local = parseLocalYTCommand(command);
        if (local) {
          const result = await runLocalYTCommand(local);
          return { ok: true, output: result.reply };
        }
        const parsed = parseYouTubeCommand(command);
        if (!parsed) {
          return { ok: false, output: "No YouTube command intent recognized." };
        }
        try {
          const result = await runYouTubeControl(parsed);
          return { ok: true, output: result.reply };
        } catch (error) {
          return {
            ok: false,
            output: `Could not reach the YouTube agent: ${error instanceof Error ? error.message : "unknown"}`,
          };
        }
      },
    },
    {
      name: "graft_improve",
      description:
        "Run the Graft CLI to build/update the codebase graph powering self-improvement. No arguments.",
      parameters: jsonSchema({}),
      run: async () => runShell("graft build", 120_000),
    },
  ];

  return new Map(tools.map((tool) => [tool.name, tool]));
}

export function toToolDefinitions(registry: ToolRegistry): ToolDefinition[] {
  return [...registry.values()].map((tool) => ({
    type: "function" as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    },
  }));
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

function normalizeHistory(history: AgentHistoryTurn[] = []): ChatMessage[] {
  return history
    .filter(
      (turn) =>
        turn &&
        typeof turn.content === "string" &&
        (turn.role === "user" || turn.role === "assistant" || turn.role === "rox"),
    )
    .slice(-12)
    .map((turn) => ({
      role: turn.role === "user" ? ("user" as const) : ("assistant" as const),
      content: turn.content.slice(0, 4_000),
    }));
}

function safeParseArgs(raw: string, name: string): Record<string, unknown> {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) return {};
  try {
    const parsed = JSON.parse(trimmed);
    return parsed && typeof parsed === "object"
      ? (parsed as Record<string, unknown>)
      : { value: parsed };
  } catch {
    console.error(`[brain/agent] ${name}: unparseable tool arguments:`, trimmed.slice(0, 200));
    return {};
  }
}

function truncateOutput(output: string): string {
  if (output.length <= TOOL_OUTPUT_LIMIT) return output;
  return `${output.slice(0, TOOL_OUTPUT_LIMIT)}\n…[truncated ${output.length - TOOL_OUTPUT_LIMIT} chars]`;
}

async function withToolTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label: string,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(`${label} timed out after ${ms}ms`)),
          ms,
        );
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/** Execute one tool call, never throwing — failures come back as results. */
export async function executeToolCall(
  call: { id: string; name: string; args: Record<string, unknown> },
  registry: ToolRegistry,
  ctx: ToolContext,
  confirm?: RunAgentOptions["confirm"],
  approved?: Set<string>,
): Promise<ToolCallRecord> {
  const started = Date.now();
  const tool = registry.get(call.name);

  if (!tool) {
    return {
      id: call.id,
      name: call.name,
      args: call.args,
      ok: false,
      output: `Unknown tool "${call.name}". Available: ${[...registry.keys()].join(", ")}.`,
      ms: Date.now() - started,
    };
  }

  // Safety gate: destructive invocations must be confirmed.
  const gate = tool.requiresConfirmation?.(call.args);
  if (gate) {
    const reason = typeof gate === "string" ? gate : "this action is destructive";
    let allowed = approved?.has(call.id) ?? false;
    if (!allowed && confirm) {
      allowed = await confirm({ id: call.id, name: call.name, args: call.args, reason });
    }
    if (!allowed) {
      return {
        id: call.id,
        name: call.name,
        args: call.args,
        ok: false,
        skipped: true,
        output:
          `NOT EXECUTED — requires user confirmation (${reason}). ` +
          `Ask the user to confirm this exact action before retrying; do not route around the gate.`,
        ms: Date.now() - started,
      };
    }
  }

  try {
    const result = await withToolTimeout(
      tool.run(call.args, ctx),
      TOOL_TIMEOUT_MS,
      call.name,
    );
    return {
      id: call.id,
      name: call.name,
      args: call.args,
      ok: result.ok,
      output: truncateOutput(result.output || "(no output)"),
      ms: Date.now() - started,
    };
  } catch (error) {
    return {
      id: call.id,
      name: call.name,
      args: call.args,
      ok: false,
      output: `Tool error: ${error instanceof Error ? error.message : String(error)}`,
      ms: Date.now() - started,
    };
  }
}

function toolResultMessage(call: ToolCallRecord): ChatMessage {
  return {
    role: "tool",
    tool_call_id: call.id,
    name: call.name,
    content: truncateOutput(call.output),
  };
}

function buildMessages(
  systemPrompt: string,
  history: ChatMessage[],
  message: string,
): ChatMessage[] {
  return [
    { role: "system", content: systemPrompt },
    ...history,
    { role: "user", content: message },
  ];
}

function trimReply(reply: string): string {
  const stripped = reply
    .replace(/^\s*FINAL:\s*/i, "")
    .replace(/^\s*assistant:\s*/i, "")
    .trim();
  return stripped.slice(0, 6_000);
}

/** Resolve the system prompt, avoiding disk I/O when one was supplied. */
async function resolveSystemPrompt(
  options: RunAgentOptions,
  toolDefs: ToolDefinition[],
): Promise<{ prompt: string; sections: string[] }> {
  if (options.systemPrompt) {
    return { prompt: options.systemPrompt, sections: ["provided"] };
  }
  const built = await buildSystemPromptFromDisk({
    request: options.message,
    tools: toolDefs,
    memory: options.memory,
    skills: options.skills,
    environment: options.environment,
    workspace: ROX_WORKSPACE,
  });
  return { prompt: built.prompt, sections: built.sections };
}

/* -------------------------------------------------------------------------- */
/* Non-streaming run                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Run the ReAct loop to completion and return the final answer plus a full
 * record of every tool call made.
 */
export async function runAgent(options: RunAgentOptions): Promise<AgentResult> {
  const registry = options.tools ?? createDefaultToolRegistry();
  const toolDefs = toToolDefinitions(registry);
  const maxRounds = Math.max(1, Math.min(options.maxRounds ?? MAX_ROUNDS, MAX_ROUNDS));
  const emit = options.onEvent ?? (() => {});
  const approved = new Set(options.approvedToolCallIds ?? []);

  const { prompt: systemPrompt, sections } = await resolveSystemPrompt(
    options,
    toolDefs,
  );

  emit({
    type: "meta",
    request: options.message.slice(0, 500),
    maxRounds,
    tools: [...registry.keys()],
    providers: describeProviderChain().map((p) => ({
      id: p.id,
      label: p.label,
      model: p.model,
    })),
    systemPromptSections: sections,
    startedAt: new Date().toISOString(),
  });

  const messages = buildMessages(
    systemPrompt,
    normalizeHistory(options.history),
    options.message,
  );

  const toolCalls: ToolCallRecord[] = [];
  const pendingConfirmations: AgentResult["pendingConfirmations"] = [];
  let rounds = 0;
  let toolRounds = 0;
  let lastProvider: ProviderConfig | undefined;
  let lastModel: string | null = null;
  let usage: Usage | undefined;
  let reply = "";
  let truncated = false;

  for (let round = 1; round <= maxRounds; round += 1) {
    rounds = round;
    const isLastRound = round === maxRounds;

    let result: ChatResult;
    try {
      result = await chatCompletion({
        messages,
        // On the final round, forbid tools so the model must answer in prose.
        tools: isLastRound ? undefined : toolDefs,
        toolChoice: "auto",
        temperature: options.temperature ?? DEFAULT_TEMPERATURE,
        maxTokens: options.maxTokens ?? DEFAULT_MAX_TOKENS,
        providerId: options.providerId,
        model: options.model,
        signal: options.signal,
      });
    } catch (error) {
      if (isLastRound) throw error;
      // Give the model one more shot with the chain's failover already applied.
      throw error;
    }

    lastProvider = result.provider;
    lastModel = result.model;
    if (result.usage) usage = result.usage;
    if (result.finishReason === "length") truncated = true;

    const content = result.content ?? "";
    const calls = result.toolCalls ?? [];

    // Always append the assistant turn so the tool results have a parent.
    messages.push({
      role: "assistant",
      content: content || null,
      ...(calls.length ? { tool_calls: calls } : {}),
    });

    if (!calls.length) {
      reply = trimReply(content);
      break;
    }

    toolRounds += 1;
    if (content.trim()) emit({ type: "chunk", text: content, round });

    for (const call of calls) {
      const args = safeParseArgs(call.function.arguments, call.function.name);
      emit({
        type: "tool_call",
        id: call.id,
        name: call.function.name,
        args,
        round,
      });

      const record = await executeToolCall(
        { id: call.id, name: call.function.name, args },
        registry,
        { request: options.message, round, signal: options.signal },
        options.confirm,
        approved,
      );
      toolCalls.push(record);

      if (record.skipped) {
        pendingConfirmations.push({
          id: record.id,
          name: record.name,
          args: record.args,
          reason: record.output,
        });
      }

      emit({
        type: "tool_result",
        id: record.id,
        name: record.name,
        ok: record.ok,
        output: record.output,
        ms: record.ms,
        round,
        ...(record.skipped ? { skipped: true } : {}),
      });
      messages.push(toolResultMessage(record));
    }

    if (isLastRound) truncated = true;
  }

  if (!reply) {
    // Either we ran out of rounds or the model answered with tool calls only.
    const fallback = toolCalls.length
      ? `I ran ${toolCalls.length} tool${toolCalls.length === 1 ? "" : "s"} but stopped after ${rounds} rounds without a written answer. Latest result: ${toolCalls.at(-1)?.output.slice(0, 300) ?? "none"}`
      : "I don't have a response for that yet.";
    reply = trimReply(fallback);
  }

  const result: AgentResult = {
    reply,
    toolCalls,
    rounds,
    toolRounds,
    provider: lastProvider?.id ?? null,
    providerLabel: lastProvider?.label ?? null,
    model: lastModel,
    usage,
    pendingConfirmations,
    systemPromptSections: sections,
    truncated,
  };

  // Learn from execution: persist a reusable lesson when tools were used.
  if (toolCalls.some((call) => !call.skipped)) {
    try {
      await rememberLesson({
        task: options.message,
        action: toolCalls
          .map((call) => `${call.name}(${JSON.stringify(call.args).slice(0, 120)})`)
          .join(" -> "),
        result:
          toolCalls
            .map((call) => `${call.name}: ${call.output.slice(0, 140)}`)
            .join(" | ") || reply,
      });
    } catch (error) {
      console.error("[brain/agent] failed to persist lesson:", error);
    }
  }

  emit({
    type: "done",
    reply,
    rounds,
    provider: result.provider,
    providerLabel: result.providerLabel,
    model: result.model,
    toolCalls,
    usage,
    truncated,
  });

  return result;
}

/* -------------------------------------------------------------------------- */
/* Streaming run                                                               */
/* -------------------------------------------------------------------------- */

/**
 * The streaming ReAct loop as an async generator of `AgentEvent`s.
 *
 * Text deltas are forwarded as they arrive. Tool calls are executed between
 * rounds; each call and result is emitted as its own event. A single `done`
 * event closes the run (its payload mirrors `runAgent`).
 */
export async function* streamAgentEvents(
  options: RunAgentOptions,
): AsyncGenerator<AgentEvent> {
  const registry = options.tools ?? createDefaultToolRegistry();
  const toolDefs = toToolDefinitions(registry);
  const maxRounds = Math.max(1, Math.min(options.maxRounds ?? MAX_ROUNDS, MAX_ROUNDS));
  const approved = new Set(options.approvedToolCallIds ?? []);

  const { prompt: systemPrompt, sections } = await resolveSystemPrompt(
    options,
    toolDefs,
  );

  yield {
    type: "meta",
    request: options.message.slice(0, 500),
    maxRounds,
    tools: [...registry.keys()],
    providers: describeProviderChain().map((p) => ({
      id: p.id,
      label: p.label,
      model: p.model,
    })),
    systemPromptSections: sections,
    startedAt: new Date().toISOString(),
  };

  const messages = buildMessages(
    systemPrompt,
    normalizeHistory(options.history),
    options.message,
  );

  const toolCalls: ToolCallRecord[] = [];
  let rounds = 0;
  let provider: ProviderConfig | undefined;
  let model: string | null = null;
  let usage: Usage | undefined;
  let reply = "";
  let truncated = false;

  for (let round = 1; round <= maxRounds; round += 1) {
    rounds = round;
    const isLastRound = round === maxRounds;

    let content = "";
    const calls: ToolCall[] = [];
    let finishReason: string | null = null;

    for await (const event of chatCompletionStream({
      messages,
      tools: isLastRound ? undefined : toolDefs,
      toolChoice: "auto",
      temperature: options.temperature ?? DEFAULT_TEMPERATURE,
      maxTokens: options.maxTokens ?? DEFAULT_MAX_TOKENS,
      providerId: options.providerId,
      model: options.model,
      signal: options.signal,
    })) {
      provider = event.provider;
      model = event.provider.model;
      if (event.type === "text") {
        content += event.text;
        yield { type: "chunk", text: event.text, round };
      } else if (event.type === "tool_call") {
        calls.push(event.call);
      } else if (event.type === "finish") {
        finishReason = event.reason;
        if (event.usage) usage = event.usage;
      }
    }

    if (finishReason === "length") truncated = true;

    messages.push({
      role: "assistant",
      content: content || null,
      ...(calls.length ? { tool_calls: calls } : {}),
    });

    if (!calls.length) {
      reply = trimReply(content);
      break;
    }

    for (const call of calls) {
      const args = safeParseArgs(call.function.arguments, call.function.name);
      yield {
        type: "tool_call",
        id: call.id,
        name: call.function.name,
        args,
        round,
      };

      const record = await executeToolCall(
        { id: call.id, name: call.function.name, args },
        registry,
        { request: options.message, round, signal: options.signal },
        options.confirm,
        approved,
      );
      toolCalls.push(record);

      yield {
        type: "tool_result",
        id: record.id,
        name: record.name,
        ok: record.ok,
        output: record.output,
        ms: record.ms,
        round,
        ...(record.skipped ? { skipped: true } : {}),
      };
      messages.push(toolResultMessage(record));
    }

    if (isLastRound) truncated = true;
  }

  if (!reply) {
    reply = trimReply(
      toolCalls.length
        ? `I ran ${toolCalls.length} tool${toolCalls.length === 1 ? "" : "s"} but stopped after ${rounds} rounds without a written answer. Latest result: ${toolCalls.at(-1)?.output.slice(0, 300) ?? "none"}`
        : "I don't have a response for that yet.",
    );
  }

  if (toolCalls.some((call) => !call.skipped)) {
    try {
      await rememberLesson({
        task: options.message,
        action: toolCalls
          .map((call) => `${call.name}(${JSON.stringify(call.args).slice(0, 120)})`)
          .join(" -> "),
        result:
          toolCalls
            .map((call) => `${call.name}: ${call.output.slice(0, 140)}`)
            .join(" | ") || reply,
      });
    } catch (error) {
      console.error("[brain/agent] failed to persist lesson:", error);
    }
  }

  yield {
    type: "done",
    reply,
    rounds,
    provider: provider?.id ?? null,
    providerLabel: provider?.label ?? null,
    model,
    toolCalls,
    usage,
    truncated,
  };
}

/* -------------------------------------------------------------------------- */
/* SSE plumbing                                                                */
/* -------------------------------------------------------------------------- */

/** Serialize one event as an SSE frame. */
export function sseEncode(event: AgentEvent): string {
  return `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
}

/** SSE comment used as a keep-alive. */
export const SSE_HEARTBEAT = ": ping\n\n";

export const SSE_HEADERS: Record<string, string> = {
  "Content-Type": "text/event-stream; charset=utf-8",
  "Cache-Control": "no-cache, no-transform",
  Connection: "keep-alive",
  "X-Accel-Buffering": "no",
};

/**
 * Stream a full agent run as SSE bytes.
 *
 * Always terminates the stream cleanly, even when the provider chain dies:
 * failures are delivered as an `error` event followed by `done`.
 */
export function streamAgent(
  options: RunAgentOptions,
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: AgentEvent) => {
        try {
          controller.enqueue(encoder.encode(sseEncode(event)));
        } catch {
          /* consumer went away */
        }
      };

      try {
        for await (const event of streamAgentEvents(options)) {
          send(event);
        }
      } catch (error) {
        const message =
          error instanceof ProviderChainError
            ? error.message
            : error instanceof Error
              ? error.message
              : "Unknown agent error";
        send({
          type: "error",
          message,
          ...(error instanceof ProviderChainError ? { attempts: error.attempts } : {}),
        });
        send({
          type: "done",
          reply: "",
          rounds: 0,
          provider: null,
          providerLabel: null,
          model: null,
          toolCalls: [],
          truncated: false,
        });
      } finally {
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      }
    },
  });
}

/** Ready-to-return streaming Response with correct SSE headers. */
export function streamAgentResponse(options: RunAgentOptions): Response {
  return new Response(streamAgent(options), { headers: SSE_HEADERS });
}

/* -------------------------------------------------------------------------- */
/* Introspection                                                               */
/* -------------------------------------------------------------------------- */

export type AgentStatus = {
  online: boolean;
  providers: Array<{ id: ProviderId; label: string; model: string; baseUrl: string }>;
  tools: string[];
  maxRounds: number;
  workspace: string;
};

/** Cheap, no-network description of the brain's wiring (for /api/brain GET). */
export function agentStatus(tools?: ToolRegistry): AgentStatus {
  const registry = tools ?? createDefaultToolRegistry();
  return {
    online: hasProvider(),
    providers: describeProviderChain(),
    tools: [...registry.keys()],
    maxRounds: MAX_ROUNDS,
    workspace: ROX_WORKSPACE,
  };
}

/** Human-readable capability line for the UI, derived from the registry. */
export function describeCapabilities(tools?: ToolRegistry): string {
  const registry = tools ?? createDefaultToolRegistry();
  return capabilitySummary([...registry.keys()]);
}

export type { ExecResult };
