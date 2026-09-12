import { calculate, capabilityReport, getNews, getWeather, readWebpage, searchWeb } from "@/lib/onlineTools";
import { openApp, openUrl, searchUrl, systemSnapshot } from "@/lib/automation";
import { remember } from "@/lib/memory";

export type AssistantAction =
  | { type: "palette"; value: "original" | "lava" }
  | { type: "reset" }
  | { type: "zoom"; value: "in" | "out" }
  | { type: "gestures" };

export type AssistantResult = {
  reply: string;
  action?: AssistantAction;
  provider: "local" | "model" | "online";
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

function localIntent(message: string): AssistantResult | null {
  const normalized = message.toLowerCase().trim();

  if (normalized.includes("red lava") || normalized.includes("lava")) {
    return { reply: "Red lava palette engaged.", action: { type: "palette", value: "lava" }, provider: "local" };
  }
  if (normalized.includes("original") || normalized.includes("amber")) {
    return { reply: "Original palette restored.", action: { type: "palette", value: "original" }, provider: "local" };
  }
  if (normalized.includes("reset")) {
    return { reply: "Orb view reset.", action: { type: "reset" }, provider: "local" };
  }
  if (normalized.includes("zoom in") || normalized.includes("closer")) {
    return { reply: "Zooming in.", action: { type: "zoom", value: "in" }, provider: "local" };
  }
  if (normalized.includes("zoom out") || normalized.includes("away")) {
    return { reply: "Zooming out.", action: { type: "zoom", value: "out" }, provider: "local" };
  }
  if (normalized.includes("gesture")) {
    return { reply: "Gesture control toggled.", action: { type: "gestures" }, provider: "local" };
  }
  if (normalized.includes("what can you do") || normalized === "help") {
    return {
      reply: "I can control the orb, change palettes, zoom, reset the view, and toggle gesture control. Connect a model to give me broader reasoning.",
      provider: "local",
    };
  }
  if (normalized.includes("status") || normalized.includes("how are you")) {
    return { reply: "Rox is online. The orb interface is ready and the local command system is active.", provider: "local" };
  }
  if (normalized.includes("time")) {
    return { reply: `It is ${new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}.`, provider: "local" };
  }

  return null;
}

function providerCandidates() {
  return [
    process.env.OMNIROUTE_API_KEY && {
      baseUrl: (process.env.OMNIROUTE_BASE_URL || "http://127.0.0.1:20128/v1").replace(/\/$/, ""),
      apiKey: process.env.OMNIROUTE_API_KEY,
      model: process.env.OMNIROUTE_MODEL || "auto",
    },
    process.env.AI_API_KEY && {
      baseUrl: (process.env.AI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, ""),
      apiKey: process.env.AI_API_KEY,
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

  const online = await onlineIntent(message);
  if (online) return online;

  const automation = await automationIntent(message);
  if (automation) return automation;

  const model = await modelReply(message, history.slice(-8));
  if (model) return model;

  return {
    reply: "I heard you, but my reasoning model is not connected yet. I can still control the orb locally.",
    provider: "local",
  };
}

function sseEvent(payload: unknown) {
  return `data: ${JSON.stringify(payload)}\n\n`;
}

export async function streamAssistant(message: string, history: AssistantTurn[] = []) {
  const local = localIntent(message);
  const online = local ? null : await onlineIntent(message);
  const immediate = local ?? online;
  const encoder = new TextEncoder();

  if (immediate) {
    return new ReadableStream<Uint8Array>({
      async start(controller) {
        controller.enqueue(encoder.encode(sseEvent({ type: "meta", provider: immediate.provider })));
        for (const word of immediate.reply.split(/(?<=\s)/)) {
          controller.enqueue(encoder.encode(sseEvent({ type: "chunk", text: word })));
        }
        controller.enqueue(encoder.encode(sseEvent({ type: "done", ...immediate })));
        await remember([{ role: "user", content: message }, { role: "rox", content: immediate.reply }]);
        controller.close();
      },
    });
  }

  const provider = providerCandidates()[0];
  if (!provider) {
    const fallback = await runAssistant(message, history);
    return new ReadableStream<Uint8Array>({
      async start(controller) {
        controller.enqueue(encoder.encode(sseEvent({ type: "chunk", text: fallback.reply })));
        controller.enqueue(encoder.encode(sseEvent({ type: "done", ...fallback })));
        await remember([{ role: "user", content: message }, { role: "rox", content: fallback.reply }]);
        controller.close();
      },
    });
  }

  let response: Response;
  try {
    response = await fetch(`${provider.baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${provider.apiKey}` },
      body: JSON.stringify({
        model: provider.model,
        stream: true,
        temperature: 0.4,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...history.slice(-8).map((turn) => ({ role: turn.role === "rox" ? ("assistant" as const) : ("user" as const), content: turn.content })),
          { role: "user", content: message },
        ],
      }),
      signal: AbortSignal.timeout(30_000),
    });
  } catch {
    const fallback = await runAssistant(message, history);
    return streamAssistantResult(fallback, message, encoder);
  }
  if (!response.ok || !response.body) {
    const fallback = await runAssistant(message, history);
    return streamAssistantResult(fallback, message, encoder);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let reply = "";
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      controller.enqueue(encoder.encode(sseEvent({ type: "meta", provider: "model" })));
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        buffer += decoder.decode(value ?? new Uint8Array(), { stream: !done });
        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";
        for (const event of events) {
          const data = event.split("\n").find((line) => line.startsWith("data: "))?.slice(6);
          if (!data || data === "[DONE]") continue;
          const delta = (JSON.parse(data) as { choices?: Array<{ delta?: { content?: string } }> }).choices?.[0]?.delta?.content;
          if (delta) {
            reply += delta;
            controller.enqueue(encoder.encode(sseEvent({ type: "chunk", text: delta })));
          }
        }
        if (done) break;
      }
      const result: AssistantResult = { reply: reply.trim(), provider: "model" };
      controller.enqueue(encoder.encode(sseEvent({ type: "done", ...result })));
      await remember([{ role: "user", content: message }, { role: "rox", content: result.reply }]);
      controller.close();
    },
  });
}

function streamAssistantResult(result: AssistantResult, message: string, encoder: TextEncoder) {
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      controller.enqueue(encoder.encode(sseEvent({ type: "meta", provider: result.provider })));
      controller.enqueue(encoder.encode(sseEvent({ type: "chunk", text: result.reply })));
      controller.enqueue(encoder.encode(sseEvent({ type: "done", ...result })));
      await remember([{ role: "user", content: message }, { role: "rox", content: result.reply }]);
      controller.close();
    },
  });
}