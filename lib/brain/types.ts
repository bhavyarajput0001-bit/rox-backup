/**
 * Rox Brain — Shared Types
 *
 * Central type definitions for the brain module.
 * Imported via relative paths within brain/ and by consumers as @/lib/brain.
 */

// ─── Messages ───────────────────────────────────────────────────────────────

/** A single conversation turn. */
export interface AgentMessage {
  role: string;
  content: string;
}

// ─── Tool Calls ─────────────────────────────────────────────────────────────

/** A recorded tool invocation and its outcome. */
export interface ToolCall {
  /** Tool name, e.g. "shell", "web_search", "read_file". */
  name: string;
  /** Arguments passed to the tool (arbitrary JSON-safe object). */
  args: Record<string, unknown>;
  /** Whether the tool executed without throwing. */
  ok: boolean;
  /** Truncated text output from the tool. */
  output: string;
}

// ─── Tool Definitions (schema for LLM function calling) ─────────────────────

/** JSON Schema property shape used inside tool parameters. */
export interface ToolSchemaProperty {
  type: string;
  description: string;
  enum?: string[];
  /** Nested properties for objects / arrays. */
  properties?: Record<string, ToolSchemaProperty>;
  items?: ToolSchemaProperty;
}

/** Full JSON Schema for a tool's parameters object. */
export interface ToolParametersSchema {
  type: "object";
  properties: Record<string, ToolSchemaProperty>;
  required?: string[];
}

/** A tool definition fed to LLMs for function calling. */
export interface ToolDefinition {
  name: string;
  description: string;
  parameters: ToolParametersSchema;
}

// ─── Skills ─────────────────────────────────────────────────────────────────

/** Metadata about a loaded skill available to the brain. */
export interface SkillInfo {
  /** Unique skill identifier, e.g. "web_search", "shell_exec". */
  name: string;
  /** Human-readable description shown to the LLM. */
  description: string;
  /** Keywords that trigger this skill. */
  triggers?: string[];
}

// ─── Cognitive State ────────────────────────────────────────────────────────

export type CognitiveState =
  | "idle"
  | "focus"
  | "reasoning"
  | "automating"
  | "learning"
  | "resting"
  | "alert"
  | "offline";

// ─── Provider ───────────────────────────────────────────────────────────────

export type ProviderName = "local" | "model" | "online";

// ─── Brain Result ───────────────────────────────────────────────────────────

/** Final result returned by the brain's synchronous chat method. */
export interface AgentResult {
  /** The assistant's text reply. */
  reply: string;
  /** Tool calls executed during this turn. */
  toolCalls: ToolCall[];
  /** Which provider served the response. */
  provider: ProviderName;
  /** Cognitive state to signal to the UI. */
  cognitiveState: CognitiveState;
  /** Skills that were active / consulted during this turn. */
  skills: SkillInfo[];
}

// ─── Brain Configuration ────────────────────────────────────────────────────

/** Configuration for createBrain(). All fields are optional. */
export interface BrainConfig {
  /** Max tool-calling rounds before the agent must produce a final reply. */
  maxRounds?: number;
  /** Sampling temperature for the LLM. */
  temperature?: number;
  /** Model identifier to use (overrides env defaults). */
  model?: string;
}

// ─── SSE Event Types ────────────────────────────────────────────────────────

/** Metadata event: emitted at the start of a stream. */
export interface SSEMetaEvent {
  type: "meta";
  provider?: ProviderName;
  cognitiveState?: CognitiveState;
}

/** Text chunk event: incremental reply text. */
export interface SSEChunkEvent {
  type: "chunk";
  text: string;
}

/** Tool call event: a tool is about to be invoked. */
export interface SSEToolCallEvent {
  type: "tool_call";
  name: string;
  args: Record<string, unknown>;
}

/** Tool result event: outcome of a tool invocation. */
export interface SSEToolResultEvent {
  type: "tool_result";
  name: string;
  ok: boolean;
  output: string;
}

/** Done event: the stream is complete. */
export interface SSEDoneEvent {
  type: "done";
  reply: string;
  toolCalls: ToolCall[];
  provider: ProviderName;
  cognitiveState: CognitiveState;
}

/** Discriminated union of all SSE events. */
export type SSEEvent =
  | SSEMetaEvent
  | SSEChunkEvent
  | SSEToolCallEvent
  | SSEToolResultEvent
  | SSEDoneEvent;
