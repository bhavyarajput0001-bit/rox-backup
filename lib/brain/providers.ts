/**
 * lib/brain/providers.ts
 *
 * Multi-provider LLM chain for Rox.
 *
 * Every provider in the chain speaks the OpenAI wire format
 * (`POST {baseUrl}/chat/completions`), so a single code path drives all of
 * them, including Anthropic via its OpenAI-compatibility endpoint.
 *
 * Order (first healthy provider wins):
 *   1. OMNIROUTE        — local router with its own upstream failover
 *   2. FREELLM          — local free-model router
 *   3. OPENAI_API_KEY   — direct OpenAI
 *   4. ANTHROPIC_API_KEY— direct Anthropic (OpenAI-compatible surface)
 *   5. legacy AI_*      — backwards compatibility with older Rox deploys
 *
 * Failover rules:
 *   - Non-streaming: any failure (network, timeout, non-2xx, malformed body)
 *     moves on to the next provider.
 *   - Streaming: failover happens only *before* the first byte is handed to
 *     the caller. Once a stream is live we cannot transparently restart it,
 *     so the error surfaces instead of duplicating output.
 */

export type ProviderId =
  | "omniroute"
  | "freellm"
  | "openai"
  | "anthropic"
  | "legacy";

export type ProviderConfig = {
  id: ProviderId;
  /** Human readable label for UI chips / logs. */
  label: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  /** Extra headers some providers require (e.g. anthropic-version). */
  headers?: Record<string, string>;
  /** Per-request budget. Defaults to DEFAULT_TIMEOUT_MS (30s). */
  timeoutMs: number;
  /** Lower number = tried first. */
  priority: number;
};

export type ToolCall = {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
};

export type ChatMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  /** Present on assistant messages that requested tools. */
  tool_calls?: ToolCall[];
  /** Present on tool result messages. */
  tool_call_id?: string;
  name?: string;
};

export type ToolDefinition = {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
};

export type Usage = {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
};

export type ChatRequest = {
  messages: ChatMessage[];
  tools?: ToolDefinition[];
  toolChoice?: "auto" | "none" | "required";
  temperature?: number;
  maxTokens?: number;
  /** Force one provider (skips the chain) — useful for pinning in tests/UI. */
  providerId?: ProviderId;
  /** Force a specific model for whichever provider is used. */
  model?: string;
  /** Caller supplied cancellation (combined with the timeout). */
  signal?: AbortSignal;
  timeoutMs?: number;
};

export type ChatResult = {
  content: string;
  toolCalls: ToolCall[];
  finishReason: string | null;
  provider: ProviderConfig;
  model: string;
  usage?: Usage;
};

/** Emitted by the streaming chain. */
export type StreamEvent =
  | { type: "text"; text: string }
  | { type: "tool_call"; call: ToolCall }
  | { type: "finish"; reason: string | null; usage?: Usage };

export type StreamEventWithProvider = StreamEvent & { provider: ProviderConfig };

export type ProviderAttempt = {
  provider: ProviderConfig;
  error: string;
  ms: number;
};

export class ProviderChainError extends Error {
  readonly attempts: ProviderAttempt[];

  constructor(attempts: ProviderAttempt[], context: string) {
    const detail = attempts
      .map((a) => `${a.provider.label}(${a.provider.model}): ${a.error}`)
      .join(" | ");
    super(
      attempts.length
        ? `All LLM providers failed for ${context} — ${detail}`
        : `No LLM providers are configured for ${context}.`,
    );
    this.name = "ProviderChainError";
    this.attempts = attempts;
  }
}

export const DEFAULT_TIMEOUT_MS = 30_000;

/* -------------------------------------------------------------------------- */
/* Chain resolution                                                            */
/* -------------------------------------------------------------------------- */

/** Local router defaults preserved from the pre-brain Rox implementation. */
const FALLBACK_OMNIROUTE_BASE = "http://127.0.0.1:20128/v1";
const FALLBACK_OMNIROUTE_KEY = "sk-omniroute-local";
const FALLBACK_FREELLM_BASE = "http://127.0.0.1:31415/v1";
const FALLBACK_FREELLM_KEY =
  "freellmapi-c6d846374855a302d3b1450673db04d7f34e4546abf036c9";

function env(name: string): string {
  const value = process.env[name];
  return typeof value === "string" ? value.trim() : "";
}

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, "");
}

/**
 * Resolve the ordered provider chain from the environment.
 * Providers without credentials are skipped (local routers keep their
 * built-in fallback keys so a stock Rox install still works).
 */
export function resolveProviders(): ProviderConfig[] {
  const candidates: ProviderConfig[] = [];

  const omnirouteKey = env("OMNIROUTE_API_KEY") || FALLBACK_OMNIROUTE_KEY;
  candidates.push({
    id: "omniroute",
    label: "Omniroute",
    baseUrl: normalizeBaseUrl(
      env("OMNIROUTE_BASE_URL") || FALLBACK_OMNIROUTE_BASE,
    ),
    apiKey: omnirouteKey,
    model: env("OMNIROUTE_MODEL") || "auto/best-coding",
    timeoutMs: DEFAULT_TIMEOUT_MS,
    priority: 10,
  });

  const freeLlmKey = env("FREELLM_API_KEY") || FALLBACK_FREELLM_KEY;
  candidates.push({
    id: "freellm",
    label: "FreeLLM",
    baseUrl: normalizeBaseUrl(env("FREELLM_BASE_URL") || FALLBACK_FREELLM_BASE),
    apiKey: freeLlmKey,
    model: env("FREELLM_MODEL") || "auto",
    timeoutMs: DEFAULT_TIMEOUT_MS,
    priority: 20,
  });

  const openAiKey = env("OPENAI_API_KEY");
  if (openAiKey) {
    candidates.push({
      id: "openai",
      label: "OpenAI",
      baseUrl: normalizeBaseUrl(
        env("OPENAI_BASE_URL") || "https://api.openai.com/v1",
      ),
      apiKey: openAiKey,
      model: env("OPENAI_MODEL") || "gpt-4o-mini",
      timeoutMs: DEFAULT_TIMEOUT_MS,
      priority: 30,
    });
  }

  const anthropicKey = env("ANTHROPIC_API_KEY");
  if (anthropicKey) {
    candidates.push({
      id: "anthropic",
      label: "Anthropic",
      // Anthropic exposes an OpenAI-compatible /chat/completions surface.
      baseUrl: normalizeBaseUrl(
        env("ANTHROPIC_BASE_URL") || "https://api.anthropic.com/v1",
      ),
      apiKey: anthropicKey,
      model: env("ANTHROPIC_MODEL") || "claude-3-5-sonnet-latest",
      headers: { "anthropic-version": env("ANTHROPIC_VERSION") || "2023-06-01" },
      timeoutMs: DEFAULT_TIMEOUT_MS,
      priority: 40,
    });
  }

  const legacyKey = env("AI_API_KEY") || env("LOCAL_MODEL_API_KEY");
  if (legacyKey) {
    candidates.push({
      id: "legacy",
      label: "Legacy AI_*",
      baseUrl: normalizeBaseUrl(
        env("AI_BASE_URL") || "https://api.openai.com/v1",
      ),
      apiKey: legacyKey,
      model: env("AI_MODEL") || "gpt-4o-mini",
      timeoutMs: DEFAULT_TIMEOUT_MS,
      priority: 50,
    });
  }

  // Dedupe identical endpoints so we never hammer the same target twice.
  const seen = new Set<string>();
  return candidates
    .sort((a, b) => a.priority - b.priority)
    .filter((provider) => {
      if (!provider.apiKey || !provider.baseUrl) return false;
      const key = `${provider.baseUrl}|${provider.model}|${provider.apiKey}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

/** Public view of the chain (safe to return over HTTP — no secrets). */
export function describeProviderChain(): Array<{
  id: ProviderId;
  label: string;
  model: string;
  baseUrl: string;
  priority: number;
}> {
  return resolveProviders().map((p) => ({
    id: p.id,
    label: p.label,
    model: p.model,
    baseUrl: p.baseUrl,
    priority: p.priority,
  }));
}

export function getProvider(id: ProviderId): ProviderConfig | undefined {
  return resolveProviders().find((provider) => provider.id === id);
}

/* -------------------------------------------------------------------------- */
/* Internals                                                                   */
/* -------------------------------------------------------------------------- */

type TimeoutHandle = { signal: AbortSignal; cleanup: () => void };

function withTimeout(parent: AbortSignal | undefined, ms: number): TimeoutHandle {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error("timeout")), ms);
  const onAbort = () => controller.abort(parent?.reason);
  if (parent) {
    if (parent.aborted) controller.abort(parent.reason);
    else parent.addEventListener("abort", onAbort, { once: true });
  }
  return {
    signal: controller.signal,
    cleanup: () => {
      clearTimeout(timer);
      parent?.removeEventListener("abort", onAbort);
    },
  };
}

function describeError(error: unknown): string {
  if (error instanceof Error) {
    if (error.name === "AbortError") return "aborted (timeout or cancelled)";
    return error.message;
  }
  return String(error);
}

function headersFor(provider: ProviderConfig): Record<string, string> {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${provider.apiKey}`,
    ...(provider.headers ?? {}),
  };
}

function normalizeToolCalls(raw: unknown): ToolCall[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item, index) => {
      const call = item as {
        id?: string;
        function?: { name?: string; arguments?: string };
        name?: string;
        arguments?: string;
      };
      const name = call.function?.name ?? call.name ?? "";
      if (!name) return null;
      const args = call.function?.arguments ?? call.arguments ?? "{}";
      return {
        id: call.id || `call_${index}_${Date.now().toString(36)}`,
        type: "function" as const,
        function: {
          name,
          arguments: typeof args === "string" ? args : JSON.stringify(args),
        },
      };
    })
    .filter((call): call is ToolCall => call !== null);
}

/* -------------------------------------------------------------------------- */
/* Non-streaming call                                                          */
/* -------------------------------------------------------------------------- */

async function fetchChatCompletion(
  provider: ProviderConfig,
  request: ChatRequest,
): Promise<{
  content: string;
  toolCalls: ToolCall[];
  finishReason: string | null;
  usage?: Usage;
  model: string;
}> {
  const timeout = withTimeout(request.signal, request.timeoutMs ?? provider.timeoutMs);
  try {
    const body: Record<string, unknown> = {
      model: request.model || provider.model,
      messages: request.messages,
      temperature: request.temperature ?? 0.2,
      max_tokens: request.maxTokens ?? 2_048,
      stream: false,
    };
    if (request.tools?.length) {
      body.tools = request.tools;
      body.tool_choice = request.toolChoice ?? "auto";
    }

    const response = await fetch(`${provider.baseUrl}/chat/completions`, {
      method: "POST",
      headers: headersFor(provider),
      body: JSON.stringify(body),
      signal: timeout.signal,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(
        `HTTP ${response.status} ${response.statusText}${text ? ` — ${text.slice(0, 300)}` : ""}`,
      );
    }

    const data = (await response.json()) as {
      model?: string;
      choices?: Array<{
        message?: {
          content?: string | null;
          tool_calls?: unknown;
          reasoning_content?: string;
        };
        finish_reason?: string;
      }>;
      usage?: Usage;
    };

    const choice = data.choices?.[0];
    if (!choice) throw new Error("response contained no choices");

    const content = (choice.message?.content ?? "").toString();
    const toolCalls = normalizeToolCalls(choice.message?.tool_calls);
    if (!content.trim() && toolCalls.length === 0) {
      throw new Error("response contained neither content nor tool_calls");
    }

    return {
      content,
      toolCalls,
      finishReason: choice.finish_reason ?? null,
      usage: data.usage,
      model: data.model || request.model || provider.model,
    };
  } finally {
    timeout.cleanup();
  }
}

/**
 * Run a chat completion through the provider chain.
 * Throws `ProviderChainError` when every provider fails.
 */
export async function chatCompletion(request: ChatRequest): Promise<ChatResult> {
  const chain = request.providerId
    ? resolveProviders().filter((p) => p.id === request.providerId)
    : resolveProviders();

  const attempts: ProviderAttempt[] = [];

  for (const provider of chain) {
    const started = Date.now();
    try {
      const result = await fetchChatCompletion(provider, request);
      return { ...result, provider };
    } catch (error) {
      attempts.push({
        provider,
        error: describeError(error),
        ms: Date.now() - started,
      });
    }
  }

  throw new ProviderChainError(attempts, "chat completion");
}

/** Non-throwing variant — returns null when the whole chain is down. */
export async function chatCompletionSafe(
  request: ChatRequest,
): Promise<ChatResult | null> {
  try {
    return await chatCompletion(request);
  } catch (error) {
    console.error("[brain/providers] chain exhausted:", describeError(error));
    return null;
  }
}

/* -------------------------------------------------------------------------- */
/* Streaming call                                                              */
/* -------------------------------------------------------------------------- */

/** Parse an OpenAI-style SSE byte stream into text + assembled tool calls. */
async function* parseOpenAiStream(
  body: ReadableStream<Uint8Array>,
): AsyncGenerator<StreamEvent> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  // Held in an object because it is assigned inside the closure below —
  // a plain `let` gets narrowed to `never` after the loop by TypeScript.
  const state: { finish: { reason: string | null; usage?: Usage } | null } = {
    finish: null,
  };
  const partials = new Map<number, { id: string; name: string; args: string }>();

  const handlePayload = (payload: string): StreamEvent[] => {
    if (!payload || payload === "[DONE]") return [];
    let parsed: {
      choices?: Array<{
        delta?: {
          content?: string | null;
          tool_calls?: Array<{
            index?: number;
            id?: string;
            function?: { name?: string; arguments?: string };
          }>;
        };
        finish_reason?: string | null;
      }>;
      usage?: Usage;
    };
    try {
      parsed = JSON.parse(payload);
    } catch {
      return [];
    }

    const out: StreamEvent[] = [];
    const choice = parsed.choices?.[0];
    const text = choice?.delta?.content;
    if (text) out.push({ type: "text", text });

    for (const delta of choice?.delta?.tool_calls ?? []) {
      const index = typeof delta.index === "number" ? delta.index : 0;
      const current =
        partials.get(index) ?? { id: "", name: "", args: "" };
      if (delta.id) current.id = delta.id;
      if (delta.function?.name) current.name = delta.function.name;
      if (delta.function?.arguments)
        current.args += delta.function.arguments;
      partials.set(index, current);
    }

    if (choice?.finish_reason) {
      state.finish = { reason: choice.finish_reason, usage: parsed.usage };
    }
    return out;
  };

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let boundary = buffer.indexOf("\n");
      while (boundary !== -1) {
        const line = buffer.slice(0, boundary).trim();
        buffer = buffer.slice(boundary + 1);
        boundary = buffer.indexOf("\n");
        if (!line.startsWith("data:")) continue;
        for (const event of handlePayload(line.slice(5).trim())) yield event;
      }
    }
    // Flush whatever is left (some servers omit the trailing newline).
    const tail = (buffer + decoder.decode()).trim();
    if (tail.startsWith("data:")) {
      for (const event of handlePayload(tail.slice(5).trim())) yield event;
    }
  } finally {
    reader.releaseLock();
  }

  // Emit assembled tool calls in index order once the stream is complete.
  const calls = [...partials.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([index, partial]) => ({
      id: partial.id || `call_${index}_${Date.now().toString(36)}`,
      type: "function" as const,
      function: { name: partial.name, arguments: partial.args || "{}" },
    }))
    .filter((call) => call.function.name);

  for (const call of calls) {
    yield { type: "tool_call", call };
  }

  yield {
    type: "finish",
    reason: state.finish?.reason ?? (calls.length ? "tool_calls" : "stop"),
    usage: state.finish?.usage,
  };
}

/**
 * Stream a chat completion through the provider chain.
 *
 * Yields `text` deltas as they arrive, then assembled `tool_call` events, then
 * a single `finish`. Failover to the next provider only happens while nothing
 * has been emitted yet for the current provider.
 */
export async function* chatCompletionStream(
  request: ChatRequest,
): AsyncGenerator<StreamEventWithProvider> {
  const chain = request.providerId
    ? resolveProviders().filter((p) => p.id === request.providerId)
    : resolveProviders();

  const attempts: ProviderAttempt[] = [];

  for (const provider of chain) {
    const started = Date.now();
    let emitted = false;
    const timeout = withTimeout(
      request.signal,
      request.timeoutMs ?? provider.timeoutMs,
    );
    try {
      const body: Record<string, unknown> = {
        model: request.model || provider.model,
        messages: request.messages,
        temperature: request.temperature ?? 0.2,
        max_tokens: request.maxTokens ?? 2_048,
        stream: true,
        stream_options: { include_usage: true },
      };
      if (request.tools?.length) {
        body.tools = request.tools;
        body.tool_choice = request.toolChoice ?? "auto";
      }

      const response = await fetch(`${provider.baseUrl}/chat/completions`, {
        method: "POST",
        headers: headersFor(provider),
        body: JSON.stringify(body),
        signal: timeout.signal,
      });

      if (!response.ok || !response.body) {
        const text = await response.text().catch(() => "");
        throw new Error(
          `HTTP ${response.status} ${response.statusText}${text ? ` — ${text.slice(0, 300)}` : ""}`,
        );
      }

      for await (const event of parseOpenAiStream(response.body)) {
        emitted = true;
        yield { ...event, provider };
      }
      timeout.cleanup();
      return;
    } catch (error) {
      timeout.cleanup();
      attempts.push({
        provider,
        error: describeError(error),
        ms: Date.now() - started,
      });
      // Already delivered bytes downstream — restarting on another provider
      // would duplicate output, so surface the failure.
      if (emitted) throw error;
    }
  }

  throw new ProviderChainError(attempts, "streaming chat completion");
}

/** True when at least one provider in the chain is configured. */
export function hasProvider(): boolean {
  return resolveProviders().length > 0;
}

/**
 * Lightweight health probe: sends a 1-token completion through the chain and
 * reports which provider answered.
 */
export async function probeProviders(): Promise<
  Array<{ id: ProviderId; label: string; model: string; ok: boolean; error?: string }>
> {
  const results = [];
  for (const provider of resolveProviders()) {
    try {
      await fetchChatCompletion(provider, {
        messages: [{ role: "user", content: "ping" }],
        maxTokens: 4,
        temperature: 0,
      });
      results.push({
        id: provider.id,
        label: provider.label,
        model: provider.model,
        ok: true,
      });
    } catch (error) {
      results.push({
        id: provider.id,
        label: provider.label,
        model: provider.model,
        ok: false,
        error: describeError(error),
      });
    }
  }
  return results;
}
