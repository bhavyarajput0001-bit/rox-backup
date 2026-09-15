/**
 * Rox Brain — SSE Streaming Helpers
 *
 * Utilities for building Server-Sent Event streams from agent responses.
 * Exports:
 *   • sseEvent()        — encode a single SSE payload as a string
 *   • createSSEStream() — create a ReadableStream<Uint8Array> backed by
 *                          an internal controller you push events into
 *   • SSECoder           — thin wrapper that encodes SSEEvent → Uint8Array
 */

import type {
  SSEEvent,
  SSEMetaEvent,
  SSEChunkEvent,
  SSEToolCallEvent,
  SSEToolResultEvent,
  SSEDoneEvent,
  CognitiveState,
  ProviderName,
  ToolCall,
} from "./types";

// ─── Raw SSE Helpers ────────────────────────────────────────────────────────

/**
 * Encode a payload as a single SSE `data:` frame.
 *
 * Format:
 *   data: <JSON>\n\n
 *
 * @example
 *   sseEvent({ type: "chunk", text: "Hello" })
 *   // → 'data: {"type":"chunk","text":"Hello"}\n\n'
 */
export function sseEvent(payload: unknown): string {
  return `data: ${JSON.stringify(payload)}\n\n`;
}

/**
 * Encode a payload as `Uint8Array` (UTF-8) — the shape ReadableStream expects.
 */
export function sseEventBytes(payload: unknown): Uint8Array {
  return new TextEncoder().encode(sseEvent(payload));
}

// ─── Typed Factory Helpers ──────────────────────────────────────────────────

/** Build a `meta` SSE event. */
export function metaEvent(
  provider?: ProviderName,
  cognitiveState?: CognitiveState,
): SSEMetaEvent {
  const ev: SSEMetaEvent = { type: "meta" };
  if (provider !== undefined) ev.provider = provider;
  if (cognitiveState !== undefined) ev.cognitiveState = cognitiveState;
  return ev;
}

/** Build a `chunk` SSE event. */
export function chunkEvent(text: string): SSEChunkEvent {
  return { type: "chunk", text };
}

/** Build a `tool_call` SSE event. */
export function toolCallEvent(
  name: string,
  args: Record<string, unknown>,
): SSEToolCallEvent {
  return { type: "tool_call", name, args };
}

/** Build a `tool_result` SSE event. */
export function toolResultEvent(
  name: string,
  ok: boolean,
  output: string,
): SSEToolResultEvent {
  return { type: "tool_result", name, ok, output };
}

/** Build a `done` SSE event. */
export function doneEvent(
  reply: string,
  toolCalls: ToolCall[],
  provider: ProviderName,
  cognitiveState: CognitiveState,
): SSEDoneEvent {
  return { type: "done", reply, toolCalls, provider, cognitiveState };
}

// ─── SSECoder ───────────────────────────────────────────────────────────────

/** Encodes typed SSE events into UTF-8 byte chunks. */
export class SSECoder {
  private encoder = new TextEncoder();

  /** Encode any SSEEvent → Uint8Array. */
  encode(event: SSEEvent): Uint8Array {
    return this.encoder.encode(sseEvent(event));
  }

  /** Encode raw JSON → Uint8Array (for backwards-compat with ad-hoc payloads). */
  encodeRaw(payload: unknown): Uint8Array {
    return this.encoder.encode(sseEvent(payload));
  }
}

// ─── SSE Stream Factory ─────────────────────────────────────────────────────

/**
 * Options for the internal stream controller returned by createSSEStream().
 *
 * The caller pushes events via `send()` / `sendMeta()` / `sendChunk()` etc.
 * and calls `close()` when done.  The `stream` property is the
 * ReadableStream<Uint8Array> to return to the HTTP response.
 */
export interface SSEStreamController {
  /** The ReadableStream to return as the HTTP response body. */
  stream: ReadableStream<Uint8Array>;

  /** Push any typed SSE event into the stream. */
  send(event: SSEEvent): void;

  /** Push a `meta` event. */
  sendMeta(provider?: ProviderName, cognitiveState?: CognitiveState): void;

  /** Push a `chunk` event with incremental text. */
  sendChunk(text: string): void;

  /** Push a `tool_call` event. */
  sendToolCall(name: string, args: Record<string, unknown>): void;

  /** Push a `tool_result` event. */
  sendToolResult(name: string, ok: boolean, output: string): void;

  /** Push the final `done` event and close the stream. */
  finish(
    reply: string,
    toolCalls: ToolCall[],
    provider: ProviderName,
    cognitiveState: CognitiveState,
  ): void;

  /** Close the stream without a done event (error / abort path). */
  close(): void;

  /** Abort the underlying stream controller. */
  abort(reason?: string): void;
}

/**
 * Create an SSE-backed ReadableStream<Uint8Array>.
 *
 * Returns an {@link SSEStreamController} whose `.stream` property is the
 * `ReadableStream` to hand to the Next.js `Response` body.
 *
 * @example
 * ```ts
 * const { stream, sendMeta, sendChunk, finish } = createSSEStream();
 * sendMeta("model", "reasoning");
 * sendChunk("Hello ");
 * sendChunk("world!");
 * finish("Hello world!", [], "model", "reasoning");
 * return new Response(stream, {
 *   headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
 * });
 * ```
 */
export function createSSEStream(): SSEStreamController {
  const coder = new SSECoder();
  let ctrl: ReadableStreamDefaultController<Uint8Array> | null = null;
  let closed = false;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      ctrl = controller;
    },
    cancel() {
      closed = true;
      ctrl = null;
    },
  });

  function enqueue(data: Uint8Array) {
    if (closed || !ctrl) return;
    try {
      ctrl.enqueue(data);
    } catch {
      // Stream already closed — silently ignore.
      closed = true;
    }
  }

  return {
    stream,

    send(event: SSEEvent) {
      enqueue(coder.encode(event));
    },

    sendMeta(provider?, cognitiveState?) {
      enqueue(coder.encode(metaEvent(provider, cognitiveState)));
    },

    sendChunk(text) {
      enqueue(coder.encode(chunkEvent(text)));
    },

    sendToolCall(name, args) {
      enqueue(coder.encode(toolCallEvent(name, args)));
    },

    sendToolResult(name, ok, output) {
      enqueue(coder.encode(toolResultEvent(name, ok, output)));
    },

    finish(reply, toolCalls, provider, cognitiveState) {
      enqueue(coder.encode(doneEvent(reply, toolCalls, provider, cognitiveState)));
      this.close();
    },

    close() {
      if (closed) return;
      closed = true;
      try {
        ctrl?.close();
      } catch {
        // Already closed.
      }
      ctrl = null;
    },

    abort(reason) {
      if (closed) return;
      closed = true;
      try {
        ctrl?.error(new Error(reason ?? "Stream aborted"));
      } catch {
        // Already errored.
      }
      ctrl = null;
    },
  };
}
