import { capabilityReport, readWebpage, searchWeb } from "@/lib/onlineTools";

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

async function modelReply(message: string): Promise<AssistantResult | null> {
  const apiKey = process.env.AI_API_KEY;
  if (!apiKey) return null;

  const baseUrl = (process.env.AI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
  const model = process.env.AI_MODEL || "gpt-4o-mini";
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.4,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: message },
        ],
      }),
      signal: controller.signal,
    });
    if (!response.ok) return null;

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const reply = data.choices?.[0]?.message?.content?.trim();
    return reply ? { reply, provider: "model" } : null;
  } finally {
    clearTimeout(timeout);
  }
}

async function onlineIntent(message: string): Promise<AssistantResult | null> {
  const normalized = message.toLowerCase().trim();

  if (normalized.includes("online skills") || normalized.includes("what skills do you have")) {
    return { reply: capabilityReport(), provider: "local" };
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

export async function runAssistant(message: string): Promise<AssistantResult> {
  const local = localIntent(message);
  if (local) return local;

  const online = await onlineIntent(message);
  if (online) return online;

  const model = await modelReply(message);
  if (model) return model;

  return {
    reply: "I heard you, but my reasoning model is not connected yet. I can still control the orb locally.",
    provider: "local",
  };
}