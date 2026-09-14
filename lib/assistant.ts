import { calculate, capabilityReport, getNews, getWeather, readWebpage, searchWeb } from "@/lib/onlineTools";
import { openApp, openUrl, searchUrl, systemSnapshot } from "@/lib/automation";
import { remember, recentMemory } from "@/lib/memory";
import { runYouTubeControl } from "@/lib/youtubeControl";
import { parseYouTubeCommand, parseLocalYTCommand } from "@/lib/youtubeIntent";
import { runLocalYTCommand } from "@/lib/youtubeCommands";

export type AssistantAction =
  | { type: "palette"; value: "original" | "lava" }
  | { type: "reset" }
  | { type: "zoom"; value: "in" | "out" }
  | { type: "gestures" }
  | { type: "cognitiveState"; value: "idle" | "focus" | "reasoning" | "automating" | "learning" | "resting" | "alert" | "offline" };

export type AssistantResult = {
  reply: string;
  action?: AssistantAction;
  provider: "local" | "model" | "online";
  cognitiveState?: "idle" | "focus" | "reasoning" | "automating" | "learning" | "resting" | "alert" | "offline";
};

export type AssistantTurn = {
  role: "user" | "rox";
  content: string;
};

const SYSTEM_PROMPT = [
  "You are Rox, a concise personal AI assistant.",
  "Answer naturally and helpfully in two short sentences or fewer.",
  "Do not claim to control devices, browse the web, or perform actions unless the system explicitly provides that capability.",
].join(" ");

export type ProviderType = "local" | "omniroute" | "freellm";

export interface ProviderConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
  priority: number;
}

const PROVIDER_CONFIGS = {
  local: { baseUrl: "", apiKey: "", model: "rules", priority: 100 },
  omniroute: {
    baseUrl: (process.env.OMNIROUTE_BASE_URL || "http://127.0.0.1:20128/v1").replace(/\/$/, ""),
    apiKey: process.env.OMNIROUTE_API_KEY || "sk-d656ee33b2d34cb0-381aa9-5acd090f",
    model: process.env.OMNIROUTE_MODEL || "auto/best-coding",
    priority: 80,
  },
  freellm: {
    baseUrl: (process.env.FREELLM_BASE_URL || "http://127.0.0.1:31415/v1").replace(/\/$/, ""),
    apiKey: process.env.FREELLM_API_KEY || "freellmapi-c6d846374855a302d3b1450673db04d7f34e4546abf036c9",
    model: process.env.FREELLM_MODEL || "auto",
    priority: 60,
  },
} as const;

type ProviderKey = keyof typeof PROVIDER_CONFIGS;

function selectProvider(taskComplexity: "simple" | "medium" | "complex"): ProviderKey {
  const complexityToPriority = {
    simple: 100,
    medium: 60,
    complex: 40,
  };

  const candidates: ProviderKey[] = ["local", "omniroute", "freellm"];
  const minPriority = complexityToPriority[taskComplexity];

  return candidates.filter(
    (key) => PROVIDER_CONFIGS[key].priority >= minPriority
  )[0] as ProviderKey;
}

function getProviderConfig(key: ProviderKey): ProviderConfig {
  return PROVIDER_CONFIGS[key];
}

function assessComplexity(message: string): "simple" | "medium" | "complex" {
  const normalized = message.toLowerCase().trim();

  // Complex reasoning tasks
  const complexPatterns = [
    /(analyze|explain|reasoning|logic)/i,
    /(write|code|create)/i,
    /(compare|contrast)/i,
    /(summarize|outline|describe)/i,
    /(plan|strategy|approach)/i,
  ];

  // Medium complexity tasks
  const mediumPatterns = [
    /(search|find|look up)/i,
    /(weather|news|headlines)/i,
    /(calculate|math)/i,
    /(time|date)/i,
  ];

  if (complexPatterns.some((p) => p.test(normalized))) return "complex";
  if (mediumPatterns.some((p) => p.test(normalized))) return "medium";
  return "simple";
}

async function callLLMProvider(
  message: string,
  history: AssistantTurn[],
  provider: ProviderKey
): Promise<{ reply: string; providerName: "model" } | null> {
  const config = getProviderConfig(provider);

  if (provider === "local" || !config.apiKey) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);

  try {
    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        temperature: 0.4,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...history.map(
            (turn) => ({
              role: turn.role === "rox" ? ("assistant" as const) : ("user" as const),
              content: turn.content,
            })
          ),
          { role: "user", content: message },
        ],
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`LLM provider ${provider} error:`, errorText);
      return null;
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const reply = data.choices?.[0]?.message?.content?.trim();
    if (reply) return { reply, providerName: "model" };
  } catch (error) {
    console.error(`LLM provider ${provider} failed:`, error);
  } finally {
    clearTimeout(timeout);
  }

  return null;
}

function localIntent(message: string): AssistantResult | null {
  const normalized = message.toLowerCase().trim();

  if (normalized.includes("red lava") || normalized.includes("lava")) {
    return {
      reply: "Red lava palette engaged.",
      action: { type: "palette", value: "lava" },
      provider: "local",
      cognitiveState: "idle",
    };
  }
  if (normalized.includes("original") || normalized.includes("amber")) {
    return {
      reply: "Original palette restored.",
      action: { type: "palette", value: "original" },
      provider: "local",
      cognitiveState: "idle",
    };
  }
  if (normalized.includes("reset")) {
    return {
      reply: "Orb view reset.",
      action: { type: "reset" },
      provider: "local",
      cognitiveState: "idle",
    };
  }
  if (normalized.includes("zoom in") || normalized.includes("closer")) {
    return {
      reply: "Zooming in.",
      action: { type: "zoom", value: "in" },
      provider: "local",
      cognitiveState: "idle",
    };
  }
  if (normalized.includes("zoom out") || normalized.includes("away")) {
    return {
      reply: "Zooming out.",
      action: { type: "zoom", value: "out" },
      provider: "local",
      cognitiveState: "idle",
    };
  }
  if (normalized.includes("gesture")) {
    return {
      reply: "Gesture control toggled.",
      action: { type: "gestures" },
      provider: "local",
      cognitiveState: "idle",
    };
  }
  if (normalized.includes("what can you do") || normalized === "help") {
    return {
      reply:
        "I can control the orb, change palettes, zoom, reset the view, and toggle gesture control. Connect a model to give me broader reasoning.",
      provider: "local",
      cognitiveState: "idle",
    };
  }
  if (normalized.includes("status") || normalized.includes("how are you")) {
    return {
      reply: "Rox is online. The orb interface is ready and the local command system is active.",
      provider: "local",
      cognitiveState: "idle",
    };
  }
  if (normalized.includes("time")) {
    return {
      reply: `It is ${new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}.`,
      provider: "local",
      cognitiveState: "idle",
    };
  }

  return null;
}

function providerCandidates() {
  return [
    // 1. Omniroute (router with automatic provider failover)
    process.env.OMNIROUTE_API_KEY && {
      baseUrl: (process.env.OMNIROUTE_BASE_URL || "http://127.0.0.1:20128/v1").replace(/\/$/, ""),
      apiKey: process.env.OMNIROUTE_API_KEY!,
      model: process.env.OMNIROUTE_MODEL || "auto",
    },
    // 2. FreeLLM (free open-source model router via local proxy)
    process.env.FREELLM_API_KEY && {
      baseUrl: (process.env.FREELLM_BASE_URL || "http://127.0.0.1:31415/v1").replace(/\/$/, ""),
      apiKey: process.env.FREELLM_API_KEY!,
      model: process.env.FREELLM_MODEL || "auto",
    },
    // 3. Legacy AI_* provider (backwards compat)
    process.env.AI_API_KEY && {
      baseUrl: (process.env.AI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, ""),
      apiKey: process.env.AI_API_KEY!,
      model: process.env.AI_MODEL || "gpt-4o-mini",
    },
  ].filter(Boolean) as Array<{ baseUrl: string; apiKey: string; model: string }>;
}

async function modelReply(message: string, history: AssistantTurn[]): Promise<AssistantResult | null> {
  for (const provider of providerCandidates()) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    try {
      const response = await fetch(`${provider.baseUrl}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${provider.apiKey}` },
        body: JSON.stringify({
          model: provider.model,
          temperature: 0.4,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            ...history.map((turn) => ({ role: turn.role === "rox" ? ("assistant" as const) : ("user" as const), content: turn.content })),
            { role: "user", content: message },
          ],
        }),
        signal: controller.signal,
      });
      if (!response.ok) continue;
      const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
      const reply = data.choices?.[0]?.message?.content?.trim();
      if (reply) return { reply, provider: "model" };
    } catch {
      continue;
    } finally {
      clearTimeout(timeout);
    }
  }
  return null;
}

async function onlineIntent(message: string): Promise<AssistantResult | null> {
  const normalized = message.toLowerCase().trim();

  if (normalized.includes("online skills") || normalized.includes("what skills do you have")) {
    return { reply: capabilityReport(), provider: "local" };
  }

  const calculation = message.match(/(?:calculate|what is)\s+([0-9()+\-*/%.\s]+)$/i);
  if (calculation?.[1]) {
    try {
      return { reply: `The answer is ${calculate(calculation[1])}.`, provider: "local" };
    } catch {
      return { reply: "I could not parse that calculation.", provider: "local" };
    }
  }

  const weatherMatch = message.match(/(?:weather|temperature)\s+(?:in|at|for)\s+(.+)/i);
  if (weatherMatch?.[1]) {
    try {
      return { reply: await getWeather(weatherMatch[1]), provider: "online" };
    } catch {
      return { reply: "I could not reach the weather service right now.", provider: "local" };
    }
  }

  const newsMatch = message.match(/(?:news|headlines)(?:\s+(?:about|on|for))?\s*(.*)$/i);
  if (newsMatch) {
    try {
      const headlines = await getNews(newsMatch[1]);
      return { reply: headlines ? `Here are the latest headlines:\n${headlines}` : "No headlines were found.", provider: "online" };
    } catch {
      return { reply: "I could not reach the news service right now.", provider: "local" };
    }
  }

  const url = message.match(/https?:\/\/[^\s]+/i)?.[0];
  if (url && (normalized.includes("read") || normalized.includes("open") || normalized.includes("summarize"))) {
    try {
      const content = await readWebpage(url);
      return { reply: `I read the page. ${content.slice(0, 1_200)}`, provider: "online" };
    } catch {
      return { reply: "I could not read that webpage right now.", provider: "local" };
    }
  }

  const searchMatch = message.match(/(?:search|look up|find online)\s+(?:for\s+)?(.+)/i);
  if (searchMatch?.[1]) {
    try {
      const results = await searchWeb(searchMatch[1].trim());
      return { reply: `Here is what I found online: ${results.slice(0, 1_800)}`, provider: "online" };
    } catch {
      return { reply: "Online search is installed but unavailable right now.", provider: "local" };
    }
  }

  return null;
}

async function automationIntent(message: string): Promise<AssistantResult | null> {
  const normalized = message.toLowerCase().trim();

  // YouTube Automation Agent control (agent runs on its own port; Rox is the front door).
  // Local YouTube commands first (no agent/API needed)
  const localYT = parseLocalYTCommand(message);
  if (localYT) {
    const result = await runLocalYTCommand(localYT);
    return {
      reply: result.reply,
      provider: "local",
      action: { type: "cognitiveState", value: "focus" },
    };
  }

  const youtubeCommand = parseYouTubeCommand(message);
  if (youtubeCommand) {
    try {
      const result = await runYouTubeControl(youtubeCommand);
      return {
        reply: result.reply,
        provider: "local",
        action: youtubeCommand.command === "dashboard" ? { type: "cognitiveState", value: "automating" } : undefined,
      };
    } catch (error) {
      return {
        reply: `I could not reach the YouTube agent: ${error instanceof Error ? error.message : "unknown error"}.`,
        provider: "local",
      };
    }
  }

  if (normalized.includes("system scan") || normalized.includes("system status") || normalized === "scan my system") {
    const snapshot = systemSnapshot();
    return {
      reply: `System scan complete. Memory is ${snapshot.memoryUsedPercent}% used across ${snapshot.cpuCores} CPU cores. Load is ${snapshot.loadAverage[0]}.`,
      provider: "local",
    };
  }

  const directUrl = message.match(/(?:open|go to|visit)\s+(https?:\/\/[^\s]+)/i)?.[1];
  if (directUrl) {
    try {
      const opened = await openUrl(directUrl);
      return { reply: `Opening ${opened}.`, provider: "local" };
    } catch {
      return { reply: "I could not open that website.", provider: "local" };
    }
  }

  const youtube = message.match(/(?:play|open|search)\s+(.+?)\s+(?:on|in)\s+youtube/i) ?? message.match(/^youtube\s+(.+)/i);
  if (youtube?.[1]) {
    try {
      const url = searchUrl("youtube", youtube[1]);
      await openUrl(url);
      return { reply: `Opening YouTube results for ${youtube[1].trim()}.`, provider: "local" };
    } catch {
      return { reply: "I could not open YouTube.", provider: "local" };
    }
  }

  const spotify = message.match(/(?:play|open|search)\s+(.+?)\s+(?:on|in)\s+spotify/i) ?? message.match(/^spotify\s+(.+)/i);
  if (spotify?.[1]) {
    try {
      await openUrl(searchUrl("spotify", spotify[1]));
      return { reply: `Opening Spotify results for ${spotify[1].trim()}.`, provider: "local" };
    } catch {
      return { reply: "I could not open Spotify.", provider: "local" };
    }
  }

  const app = message.match(/^(?:open|launch|start)\s+(?:the\s+)?(.+?)\s+app$/i);
  if (app?.[1]) {
    try {
      await openApp(app[1]);
      return { reply: `Launching ${app[1].trim()}.`, provider: "local" };
    } catch {
      return { reply: `I could not launch ${app[1].trim()}.`, provider: "local" };
    }
  }
  return null;
}

export async function runAssistant(message: string, history: AssistantTurn[] = []): Promise<AssistantResult> {
  const local = localIntent(message);
  if (local) return local;

  // Local YouTube commands first (no agent/API needed)
  const localYT = parseLocalYTCommand(message);
  if (localYT) {
    const result = await runLocalYTCommand(localYT);
    return {
      reply: result.reply,
      provider: "local",
      cognitiveState: "focus",
    };
  }

  // Remote YouTube agent commands
  const youtubeCommand = parseYouTubeCommand(message);
  if (youtubeCommand) {
    try {
      const result = await runYouTubeControl(youtubeCommand);
      return {
        reply: result.reply,
        provider: "local",
        cognitiveState: "automating",
      };
    } catch (err) {
      return {
        reply: `I could not reach the YouTube agent: ${err instanceof Error ? err.message : "unknown error"}.`,
        provider: "local",
        cognitiveState: "offline",
      };
    }
  }

  // Determine task complexity for provider selection
  const complexity = assessComplexity(message);

  // Try selected provider with brain-guided routing
  const provider = selectProvider(complexity);
  const providerConfig = getProviderConfig(provider);

  // If local rules handled it, we'd have returned already
  // Now try the selected AI provider
  if (provider !== "local" && providerConfig.apiKey) {
    const llmResult = await callLLMProvider(message, history.slice(-8), provider);
    if (llmResult) {
      return {
        reply: llmResult.reply,
        provider: "model" as const,
        cognitiveState: complexity === "complex" ? "reasoning" : "focus",
      };
    }
  }

  const selectedProviderKey = provider as ProviderKey;
  // Fallback: try remaining providers in priority order
  const allKeys: ProviderKey[] = ["omniroute", "freellm", "local"];
  const remainingProviders = allKeys.filter(
    (p): p is ProviderKey => p !== selectedProviderKey && !!getProviderConfig(p).apiKey
  );
  for (const fallbackProvider of remainingProviders) {
    const fallbackResult = await callLLMProvider(message, history.slice(-8), fallbackProvider);
    if (fallbackResult) {
      return {
        reply: fallbackResult.reply,
        provider: "model" as const,
        cognitiveState: complexity === "complex" ? "reasoning" : "focus",
      };
    }
  }

  // Truly no model connected - return local capabilities message
  return {
    reply: "I heard you, but my reasoning model is not connected yet. I can still control the orb locally.",
    provider: "local",
    cognitiveState: "offline",
  };
}

function sseEvent(payload: unknown) {
  return `data: ${JSON.stringify(payload)}\n\n`;
}

export async function streamAssistant(message: string, history: AssistantTurn[] = []) {
  const local = localIntent(message);
  const complexity = assessComplexity(message);
  const encoder = new TextEncoder();

  // If local intent provides immediate response without LLM
  if (local) {
    const encoder = new TextEncoder();
    return new ReadableStream<Uint8Array>({
      async start(controller) {
        controller.enqueue(encoder.encode(sseEvent({ type: "meta", provider: local.provider })));
        controller.enqueue(
          encoder.encode(sseEvent({ type: "meta", cognitiveState: local.cognitiveState }))
        );
        for (const word of local.reply.split(/(?<=\s)/)) {
          controller.enqueue(encoder.encode(sseEvent({ type: "chunk", text: word })));
        }
        controller.enqueue(
          encoder.encode(sseEvent({ type: "done", ...local, cognitiveState: local.cognitiveState }))
        );
        await remember([{ role: "user", content: message }, { role: "rox", content: local.reply }]);
        controller.close();
      },
    });
  }

  // Try local YouTube commands first (no agent needed)
  const localYT = parseLocalYTCommand(message);
  if (localYT) {
    try {
      const result = await runLocalYTCommand(localYT);
      return new ReadableStream<Uint8Array>({
        async start(controller) {
          const encoder = new TextEncoder();
          controller.enqueue(encoder.encode(sseEvent({ type: "meta", provider: "local" })));
          controller.enqueue(
            encoder.encode(sseEvent({ type: "meta", cognitiveState: "focus" }))
          );
          for (const word of result.reply.split(/(?<=\s)/)) {
            controller.enqueue(encoder.encode(sseEvent({ type: "chunk", text: word })));
          }
          controller.enqueue(
            encoder.encode(sseEvent({ type: "done", ...result, cognitiveState: "focus" }))
          );
          await remember([{ role: "user", content: message }, { role: "rox", content: result.reply }]);
          controller.close();
        },
      });
    } catch (error) {
      // fall through to agent / model
    }
  }

  // Try YouTube control if no local intent
  const youtube = parseYouTubeCommand(message);
  if (youtube) {
    try {
      const result = await runYouTubeControl(youtube);
      return new ReadableStream<Uint8Array>({
        async start(controller) {
          const encoder = new TextEncoder();
          controller.enqueue(encoder.encode(sseEvent({ type: "meta", provider: "local" })));
          controller.enqueue(
            encoder.encode(sseEvent({ type: "meta", cognitiveState: "automating" }))
          );
          for (const word of result.reply.split(/(?<=\s)/)) {
            controller.enqueue(encoder.encode(sseEvent({ type: "chunk", text: word })));
          }
          controller.enqueue(
            encoder.encode(sseEvent({ type: "done", ...result, cognitiveState: "automating" }))
          );
          await remember([{ role: "user", content: message }, { role: "rox", content: result.reply }]);
          controller.close();
        },
      });
    } catch (error) {
      return new ReadableStream<Uint8Array>({
        async start(controller) {
          const encoder = new TextEncoder();
          controller.enqueue(encoder.encode(sseEvent({ type: "meta", provider: "local" })));
          controller.enqueue(
            encoder.encode(sseEvent({ type: "chunk", text: `I could not reach the YouTube agent.` }))
          );
          controller.enqueue(
            encoder.encode(sseEvent({ type: "done", provider: "local", cognitiveState: "offline" }))
          );
          controller.close();
        },
      });
    }
  }

  // Brain-guided provider selection for streaming
  const provider = selectProvider(complexity);
  const providerConfig = getProviderConfig(provider);

  // If we have a valid provider, use it
  if (provider !== "local" && providerConfig.apiKey) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);

    try {
      const response = await fetch(`${providerConfig.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${providerConfig.apiKey}`,
        },
        body: JSON.stringify({
          model: providerConfig.model,
          temperature: 0.4,
          stream: true,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            ...history.slice(-8).map((turn) => ({
              role: turn.role === "rox" ? ("assistant" as const) : ("user" as const),
              content: turn.content,
            })),
            { role: "user", content: message },
          ],
        }),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        const fallback = await runAssistant(message, history);
        return streamAssistantResult(fallback, message, new TextEncoder());
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let reply = "";
      let currentState: "focus" | "reasoning" = complexity === "complex" ? "reasoning" : "focus";

      return new ReadableStream<Uint8Array>({
        async start(controller) {
          controller.enqueue(
            encoder.encode(sseEvent({ type: "meta", provider: "model" }))
          );
          controller.enqueue(
            encoder.encode(sseEvent({ type: "meta", cognitiveState: currentState }))
          );
          let buffer = "";
          while (true) {
            const { done, value } = await reader.read();
            buffer += decoder.decode(value ?? new Uint8Array(), { stream: !done });
            const events = buffer.split("\n\n");
            buffer = events.pop() ?? "";
            for (const event of events) {
              const data = event
                .split("\n")
                .find((line) => line.startsWith("data: "))?.slice(6);
              if (!data || data === "[DONE]") continue;
              const delta = (JSON.parse(data) as {
                choices?: Array<{ delta?: { content?: string } }>;
              }).choices?.[0]?.delta?.content;
              if (delta) {
                reply += delta;
                controller.enqueue(
                  encoder.encode(sseEvent({ type: "chunk", text: delta }))
                );
              }
            }
            if (done) break;
          }
          const result: AssistantResult = {
            reply: reply.trim(),
            provider: "model",
            cognitiveState: currentState,
          };
          controller.enqueue(
            encoder.encode(sseEvent({ type: "done", ...result }))
          );
          await remember([{ role: "user", content: message }, { role: "rox", content: result.reply }]);
          controller.close();
        },
      });
    } catch (error) {
      const fallback = await runAssistant(message, history);
      return streamAssistantResult(fallback, message, new TextEncoder());
    }
  }

  // No provider available - fallback to local rules only
  const fallback = await runAssistant(message, history);
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder();
      controller.enqueue(
        encoder.encode(sseEvent({ type: "meta", provider: fallback.provider }))
      );
      controller.enqueue(
        encoder.encode(sseEvent({ type: "meta", cognitiveState: fallback.cognitiveState }))
      );
      controller.enqueue(
        encoder.encode(sseEvent({ type: "chunk", text: fallback.reply }))
      );
      controller.enqueue(
        encoder.encode(sseEvent({ type: "done", ...fallback, cognitiveState: fallback.cognitiveState }))
      );
      await remember([{ role: "user", content: message }, { role: "rox", content: fallback.reply }]);
      controller.close();
    },
  });
}

function streamAssistantResult(result: AssistantResult, message: string, encoder: TextEncoder) {
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      controller.enqueue(encoder.encode(sseEvent({ type: "meta", provider: result.provider })));
      controller.enqueue(
        encoder.encode(sseEvent({ type: "meta", cognitiveState: result.cognitiveState }))
      );
      controller.enqueue(encoder.encode(sseEvent({ type: "chunk", text: result.reply })));
      controller.enqueue(
        encoder.encode(sseEvent({ type: "done", ...result, cognitiveState: result.cognitiveState }))
      );
      await remember([{ role: "user", content: message }, { role: "rox", content: result.reply }]);
      controller.close();
    },
  });
}