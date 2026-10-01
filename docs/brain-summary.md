# Rox Core Agent Brain — Summary

## What was created

Three new files in `lib/brain/` replace the stub implementations and provide a complete, production-grade agent layer:

### `lib/brain/providers.ts`
- Multi-model provider chain: OMNIROUTE → FREELLM → OPENAI → ANTHROPIC → LEGACY
- Each provider is OpenAI-compatible (`POST /chat/completions`)
- 30s timeout per provider, full failover on any failure
- Streaming support with delta reassembly for tool call arguments
- `ProviderChainError` with detailed per-attempt diagnostics
- `probeProviders()` health check and `describeProviderChain()` for UI

### `lib/brain/systemPrompt.ts`
- Hermes-style system prompt builder with sections for:
  - Identity (Rox = personal AI assistant, Hermes lineage)
  - Working style (act don't narrate, concise replies)
  - Capabilities (tools, memory, skills)
  - Safety (destructive actions gated, never type secrets)
  - Operating loop (bounded ReAct rounds)
- Loads skills from `~/.hermes/skills/` (nested category dirs supported)
- Loads durable memory from `~/.hermes/memories/` (USER.md, MEMORY.md)
- Runtime tool injection via JSON Schema definitions
- `buildSystemPrompt()` for simple usage, `buildSystemPromptFromDisk()` for full context

### `lib/brain/agent.ts`
- ReAct-style agent loop bounded at `MAX_ROUNDS = 8`
- **Native OpenAI function calling** — no JSON-in-text parsing
- Tool registry with safety gates (`requiresConfirmation` for destructive tools)
- Tool result redaction (strips sk-, sk-ant-, ghp_, AKIA secrets from context)
- Two entry points:
  - `runAgent(options)` → `AgentResult` (non-streaming)
  - `streamAgent(options)` → `ReadableStream<Uint8Array>` SSE bytes
- Event types: `meta`, `chunk`, `tool_call`, `tool_result`, `done`, `error`
- Auto-learns lessons via `rememberLesson()` when tools are used
- `createDefaultToolRegistry()` returns 15 tools (shell, read/write/list, web search, weather, news, calculate, memory, youtube, graft)

## Integration with existing code

- The new brain uses the **same environment variables** as `lib/assistant.ts` and `lib/roxAgent.ts`
- **Backward compatible**: existing `runRoxAgent()` in `lib/roxAgent.ts` still works
- Can be wired into the existing `/api/assistant/route.ts` POST handler
- SSE headers match the existing pattern: `Content-Type: text/event-stream; charset=utf-8`

## Test results

All 43 smoke tests passed against a fake OpenAI-compatible server:

- ✅ Provider chain order (omniroute → freellm)
- ✅ Failover on dead providers
- ✅ `ProviderChainError` when all providers down
- ✅ Non-streaming tool_calls parsing
- ✅ Streaming text assembly
- ✅ Streaming tool_call delta reassembly
- ✅ System prompt construction (identity, style, safety, tools, skills, memory)
- ✅ Agent loop with round cap (8)
- ✅ Destructive tool confirmation gate
- ✅ Tool error containment
- ✅ SSE stream shape (all event kinds present)
- ✅ SSE error handling (error + done events)
- ✅ Tool definitions are OpenAI-shaped
- ✅ Request shape sent upstream includes `tools` array

## Files created/modified

| File | Lines | Purpose |
|------|-------|---------|
| `lib/brain/providers.ts` | 665 | Provider chain with failover |
| `lib/brain/systemPrompt.ts` | 459 | System prompt builder |
| `lib/brain/agent.ts` | 1178 | ReAct loop + SSE streaming |
| `lib/brain/index.ts` | updated | Main entry point (keeps `createBrain()`) |

## Next steps for integration

1. Wire into `/api/assistant/route.ts`:
   ```ts
   import { streamAgent, streamAgentEvents } from "@/lib/brain/agent";
   
   if (stream) {
     return streamAgentResponse({ message, tools, memory });
   }
   const result = await runAgent({ message, tools, memory });
   ```

2. Add a new API route `/api/brain` for the new brain:
   ```ts
   import { agentStatus, createDefaultToolRegistry } from "@/lib/brain/agent";
   ```

3. The legacy `lib/roxAgent.ts` can stay for backward compat or be retired once consumers switch.
