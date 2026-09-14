/**
 * YouTube Agent control layer for Rox.
 *
 * Rox is the front door (http://localhost:3456). The YouTube Automation
 * Agent runs on its own private port (3457 by default) and exposes a
 * dashboard + HTTP API. This module gives Rox's assistant intent router
 * (lib/assistant.ts) and the Rox UI hard handles into that API.
 *
 * Everything here runs server-side (Next.js route handlers / Node), so
 * there is no CORS and no API key leakage to the browser.
 *
 * If `API_KEY` is set in the YouTube agent's .env, mutating routes require
 * the `x-api-key` header — Rox forwards it automatically via
 * YOUTUBE_AGENT_API_KEY (defaults to the value of the agent's own API_KEY,
 * see lib/youtube/env).
 */

export type YouTubeAgentInfo = {
  ok: boolean;
  url: string;
  reachable: boolean;
  health?: {
    status: string;
    initialized: boolean;
    setupRequired: boolean;
    agents: string[];
    uptime: number;
    timestamp: string;
  };
  error?: string;
  dashboardUrl?: string;
};

export type YouTubeControlCommand =
  | { command: "status" }
  | { command: "generate"; topic?: string; style?: string; length?: "short" | "medium" | "long" }
  | { command: "job"; jobId: string }
  | { command: "jobs" }
  | { command: "publish"; contentId: string }
  | { command: "publishable"; contentId: string }
  | { command: "approve"; contentId: string }
  | { command: "reject"; contentId: string }
  | { command: "operator"; action: "start" | "pause" }
  | { command: "ideas" }
  | { command: "analytics" }
  | { command: "strategy" }
  | { command: "schedule" }
  | { command: "dashboard" };

export type YouTubeControlResult = {
  ok: boolean;
  reply: string;
  data?: unknown;
  error?: string;
};

/** Base URL of the YouTube Automation Agent (overridable via env). */
export function youtubeAgentUrl(): string {
  return (process.env.YOUTUBE_AGENT_URL || "http://127.0.0.1:3457").replace(/\/$/, "");
}

/** API key for the YouTube agent's mutating routes (mirrors its API_KEY). */
export function youtubeAgentApiKey(): string | undefined {
  return process.env.YOUTUBE_AGENT_API_KEY || undefined;
}

function headers(extra?: Record<string, string>): Record<string, string> {
  const result: Record<string, string> = {
    "Content-Type": "application/json",
    ...extra,
  };
  const key = youtubeAgentApiKey();
  if (key) result["x-api-key"] = key;
  return result;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${youtubeAgentUrl()}${path}`, {
    ...init,
    headers: headers(init?.headers as Record<string, string> | undefined),
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`YouTube agent returned ${response.status}${body ? `: ${body.slice(0, 200)}` : ""}`);
  }
  return (await response.json()) as T;
}

/** Lightweight reachability probe used by the Rox status strip. */
export async function youtubeAgentInfo(): Promise<YouTubeAgentInfo> {
  const url = youtubeAgentUrl();
  try {
    const response = await fetch(`${url}/health`, { signal: AbortSignal.timeout(3_000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const health = (await response.json()) as YouTubeAgentInfo["health"];
    return { ok: true, url, reachable: true, health, dashboardUrl: `${url}/` };
  } catch (error) {
    return {
      ok: false,
      url,
      reachable: false,
      error: error instanceof Error ? error.message : "unreachable",
    };
  }
}

/** Queue a video generation job on the YouTube agent. */
export async function generateVideo(input: { topic?: string; style?: string; length?: "short" | "medium" | "long" }): Promise<YouTubeControlResult> {
  const info = await youtubeAgentInfo();
  if (!info.reachable) {
    return { ok: false, reply: "The YouTube agent is not running. Start it, then ask me again.", error: info.error };
  }
  if (info.health?.setupRequired) {
    return {
      ok: false,
      reply: "The YouTube agent is in setup mode — it needs YouTube credentials before it can generate. Run `npm run walkthrough` in the agent directory.",
      error: "setup_required",
    };
  }

  try {
    const { ok, result } = await request<{ ok: boolean; result: { job: { id: string; topic: string; status: string } } }>("/generate", {
      method: "POST",
      body: JSON.stringify({
        topic: input.topic ?? null,
        style: input.style ?? null,
        length: input.length ?? "medium",
      }),
    });
    if (!ok || !result?.job) throw new Error("Job was not accepted");
    const job = result.job;
    return {
      ok: true,
      reply: `Generation job started (${job.id}) for "${job.topic}". It runs in the background — I'll keep an eye on it.`,
      data: { job },
    };
  } catch (error) {
    return { ok: false, reply: `Could not start generation: ${error instanceof Error ? error.message : "unknown error"}.`, error: String(error) };
  }
}

async function getJob(jobId: string): Promise<YouTubeControlResult> {
  try {
    const data = await request<Record<string, unknown>>(`/api/jobs/${encodeURIComponent(jobId)}`);
    const job = (data.job ?? data) as { id?: string; status?: string; topic?: string; stage?: string; progress?: number; error?: string | null };
    if (!job?.id) return { ok: false, reply: "That job was not found on the YouTube agent.", error: "not_found" };
    const progress = typeof job.progress === "number" ? `${job.progress}%` : "—";
    const error = job.error ? ` (${job.error})` : "";
    return {
      ok: true,
      reply: `Job ${job.id} is ${job.status} — topic "${job.topic || "auto"}", stage ${job.stage || "—"}, progress ${progress}${error}.`,
      data: job,
    };
  } catch (error) {
    return { ok: false, reply: `Could not read job: ${error instanceof Error ? error.message : "unknown error"}.`, error: String(error) };
  }
}

async function listJobs(): Promise<YouTubeControlResult> {
  try {
    const data = await request<{ jobs?: Array<{ id: string; status: string; topic: string }> }>("/api/dashboard");
    const jobs = data.jobs ?? [];
    if (!jobs.length) return { ok: true, reply: "There are no generation jobs on the YouTube agent yet." };
    const summary = jobs
      .slice(0, 10)
      .map((job) => `• ${job.id} — ${job.status} — ${job.topic || "auto topic"}`)
      .join("\n");
    return { ok: true, reply: `Recent jobs:\n${summary}`, data: jobs };
  } catch (error) {
    return { ok: false, reply: `Could not list jobs: ${error instanceof Error ? error.message : "unknown error"}.`, error: String(error) };
  }
}

async function publishContent(contentId: string): Promise<YouTubeControlResult> {
  try {
    const data = await request<{ success: boolean; result?: { status?: string; message?: string }; error?: string }>(
      `/publish/${encodeURIComponent(contentId)}`,
      { method: "POST", body: JSON.stringify({}) },
    );
    if (!data.success) throw new Error(data.error || "publish rejected");
    return {
      ok: true,
      reply: `Content ${contentId} has been published${data.result?.status ? ` (${data.result.status})` : ""}.`,
      data: data.result,
    };
  } catch (error) {
    return { ok: false, reply: `Could not publish: ${error instanceof Error ? error.message : "unknown error"}.`, error: String(error) };
  }
}

async function inspectPublishable(contentId: string): Promise<YouTubeControlResult> {
  try {
    const data = await request<{ success: boolean; result: { id: string; status: string; review_status?: string | null; title?: string } }>(
      `/api/content/${encodeURIComponent(contentId)}`,
    );
    const bundle = data.result ?? {};
    return {
      ok: true,
      reply: `Content ${bundle.id} is status "${bundle.status}"${bundle.review_status ? `, review "${bundle.review_status}"` : ""}${bundle.title ? ` — "${bundle.title}"` : ""}.`,
      data: bundle,
    };
  } catch (error) {
    return { ok: false, reply: `Could not read content: ${error instanceof Error ? error.message : "unknown error"}.`, error: String(error) };
  }
}

async function approveContent(contentId: string): Promise<YouTubeControlResult> {
  try {
    const data = await request<{ success: boolean; result?: unknown; error?: string }>(`/api/content/${encodeURIComponent(contentId)}/approve`, {
      method: "POST",
      body: JSON.stringify({}),
    });
    if (!data.success) throw new Error(data.error || "approve rejected");
    return { ok: true, reply: `Content ${contentId} was approved. It is now eligible for publishing.`, data: data.result };
  } catch (error) {
    return { ok: false, reply: `Could not approve: ${error instanceof Error ? error.message : "unknown error"}.`, error: String(error) };
  }
}

async function rejectContent(contentId: string): Promise<YouTubeControlResult> {
  try {
    const data = await request<{ success: boolean; result?: unknown; error?: string }>(`/api/content/${encodeURIComponent(contentId)}/reject`, {
      method: "POST",
      body: JSON.stringify({}),
    });
    if (!data.success) throw new Error(data.error || "reject rejected");
    return { ok: true, reply: `Content ${contentId} was rejected and will not be published.`, data: data.result };
  } catch (error) {
    return { ok: false, reply: `Could not reject: ${error instanceof Error ? error.message : "unknown error"}.`, error: String(error) };
  }
}

async function operatorStart(): Promise<YouTubeControlResult> {
  try {
    const data = await request<{ success: boolean; result?: { run?: { id: string; status: string } }; error?: string }>("/api/operator/start", {
      method: "POST",
      body: JSON.stringify({}),
    });
    if (!data.success) throw new Error(data.error || "operator start rejected");
    const run = data.result?.run ?? data.result;
    return { ok: true, reply: `Autonomous operator started${run && "id" in run ? ` (run ${run.id})` : ""}. It will research, plan, and produce videos on its own.`, data: data.result };
  } catch (error) {
    return {
      ok: false,
      reply: `Could not start the autonomous operator: ${error instanceof Error ? error.message : "unknown error"}. Make sure a channel strategy is saved and active.`,
      error: String(error),
    };
  }
}

async function operatorPause(): Promise<YouTubeControlResult> {
  try {
    const data = await request<{ success: boolean; result?: unknown; error?: string }>("/api/operator/pause", {
      method: "POST",
      body: JSON.stringify({}),
    });
    if (!data.success) throw new Error(data.error || "operator pause rejected");
    return { ok: true, reply: "Autonomous operator paused. Scheduled automation is stopped until you resume it.", data: data.result };
  } catch (error) {
    return { ok: false, reply: `Could not pause: ${error instanceof Error ? error.message : "unknown error"}.`, error: String(error) };
  }
}

async function listIdeas(): Promise<YouTubeControlResult> {
  try {
    const data = await request<{ ideas?: Array<{ id: string; topic: string; status: string; angle?: string }> }>("/api/dashboard");
    const ideas = data.ideas ?? [];
    if (!ideas.length) return { ok: true, reply: "There are no content ideas on the agent yet — ask me to research some, or start the operator." };
    const summary = ideas
      .slice(0, 8)
      .map((idea) => `• ${idea.id} — ${idea.status} — ${idea.topic}${idea.angle ? ` (${idea.angle})` : ""}`)
      .join("\n");
    return { ok: true, reply: `Content ideas:\n${summary}`, data: ideas };
  } catch (error) {
    return { ok: false, reply: `Could not list ideas: ${error instanceof Error ? error.message : "unknown error"}.`, error: String(error) };
  }
}

async function analyticsReport(): Promise<YouTubeControlResult> {
  try {
    const data = await request<{ totalVideos?: number; averagePerformanceScore?: number; topPerformers?: Array<Record<string, unknown>>; insights?: string[] }>(
      "/analytics",
    );
    const total = data.totalVideos ?? 0;
    const average = data.averagePerformanceScore ?? 0;
    const insights = (data.insights ?? []).slice(0, 3);
    const reply = [
      `Analytics: ${total} videos, average performance score ${average}.`,
      insights.length ? `Insights:\n${insights.map((item) => `• ${item}`).join("\n")}` : "No insights yet.",
    ].join("\n");
    return { ok: true, reply, data };
  } catch (error) {
    return { ok: false, reply: `Could not fetch analytics: ${error instanceof Error ? error.message : "unknown error"}.`, error: String(error) };
  }
}

async function strategyReport(): Promise<YouTubeControlResult> {
  try {
    const data = await request<{ strategy?: Record<string, unknown>; error?: string }>("/api/dashboard");
    const strategy = data.strategy ?? (data as unknown as { channelStrategy?: Record<string, unknown> }).channelStrategy;
    if (!strategy || typeof strategy !== "object" || Object.keys(strategy).length === 0) {
      return { ok: false, reply: "No channel strategy is saved yet. Ask me to research and plan one, or set it in the agent dashboard.", error: "no_strategy" };
    }
    const { objective, audience, content_pillars, cadence_per_week } = strategy as Record<string, unknown>;
    return {
      ok: true,
      reply: `Channel strategy — objective: ${String(objective ?? "—")}. Audience: ${String(audience ?? "—")}. Pillars: ${Array.isArray(content_pillars) ? (content_pillars as string[]).join(", ") : "—"}. Cadence: ${String(cadence_per_week ?? "—")}/week.`,
      data: strategy,
    };
  } catch (error) {
    return { ok: false, reply: `Could not fetch strategy: ${error instanceof Error ? error.message : "unknown error"}.`, error: String(error) };
  }
}

async function scheduleReport(): Promise<YouTubeControlResult> {
  try {
    const data = await request<Array<{ id?: string; title?: string; publish_at?: string; status?: string }>>("/schedule");
    const items = Array.isArray(data) ? data : [];
    if (!items.length) return { ok: true, reply: "Nothing is scheduled right now." };
    const summary = items
      .slice(0, 8)
      .map((item) => `• ${item.title || item.id} — ${item.publish_at || "no time"} — ${item.status || "—"}`)
      .join("\n");
    return { ok: true, reply: `Upcoming schedule:\n${summary}`, data: items };
  } catch (error) {
    return { ok: false, reply: `Could not fetch schedule: ${error instanceof Error ? error.message : "unknown error"}.`, error: String(error) };
  }
}

async function dashboardLink(): Promise<YouTubeControlResult> {
  const info = await youtubeAgentInfo();
  if (!info.reachable) {
    return { ok: false, reply: "The YouTube agent is not running, so I can't show its dashboard.", error: info.error };
  }
  return {
    ok: true,
    reply: `Opening the YouTube agent dashboard for you.`,
    data: { dashboardUrl: `${youtubeAgentUrl()}/` },
  };
}

/**
 * Route a single YouTube-control intent to the agent.
 * Returns a human-friendly reply plus optional structured data so the Rox
 * UI can offer quick actions (open dashboard, follow a job, etc.).
 */
export async function runYouTubeControl(command: YouTubeControlCommand): Promise<YouTubeControlResult> {
  switch (command.command) {
    case "status":
      return statusResult(await youtubeAgentInfo());
    case "generate":
      return generateVideo(command);
    case "job":
      return getJob(command.jobId);
    case "jobs":
      return listJobs();
    case "publish":
      return publishContent(command.contentId);
    case "publishable":
      return inspectPublishable(command.contentId);
    case "approve":
      return approveContent(command.contentId);
    case "reject":
      return rejectContent(command.contentId);
    case "operator":
      return command.action === "start" ? operatorStart() : operatorPause();
    case "ideas":
      return listIdeas();
    case "analytics":
      return analyticsReport();
    case "strategy":
      return strategyReport();
    case "schedule":
      return scheduleReport();
    case "dashboard":
      return dashboardLink();
    default:
      return { ok: false, reply: "I don't know that YouTube command yet." };
  }
}

function statusResult(info: YouTubeAgentInfo): YouTubeControlResult {
  if (!info.reachable || !info.health) {
    return {
      ok: false,
      reply: `The YouTube agent at ${info.url} is not reachable${info.error ? ` (${info.error})` : ""}. Start it and I'll have full control over it.`,
      error: info.error,
    };
  }
  const { health, dashboardUrl } = info;
  const setup = health.setupRequired ? " (setup mode — needs YouTube credentials)" : "";
  const agentList = health.agents?.length ? health.agents.join(", ") : "none";
  return {
    ok: true,
    reply: `YouTube agent is online: status "${health.status}"${setup}, uptime ${Math.round(health.uptime)}s. Agents: ${agentList}. Dashboard: ${dashboardUrl}`,
    data: { health, dashboardUrl },
  };
}