// Rox → YouTube Automation Agent bridge
// Reads status from the agent, triggers tasks via its API

const YT_AGENT_BASE = "http://127.0.0.1:3457";
const HEADERS = { "Content-Type": "application/json" };

export type YTStatus = {
  status: string;
  initialized: boolean;
  setupRequired: boolean;
  agents: string[];
  uptime: number;
  timestamp: string;
};

export type YTProduction = {
  id: string;
  title?: string;
  status: string;
  createdAt: string;
};

export type YTAIStatus = {
  textProvider: string | null;
  imageProvider: string | null;
  videoProvider: string | null;
};

export type YTCommandResult = {
  command: string;
  success: boolean;
  data?: unknown;
  error?: string;
  provider: "youtube-agent";
};

export async function getAgentStatus(): Promise<YTStatus> {
  const res = await fetch(`${YT_AGENT_BASE}/health`, { cache: "no-store" });
  if (!res.ok) throw new Error(`YouTube agent unreachable (HTTP ${res.status})`);
  return res.json() as Promise<YTStatus>;
}

export async function getAgentDashboard(): Promise<unknown> {
  const res = await fetch(`${YT_AGENT_BASE}/api/dashboard`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Dashboard request failed (HTTP ${res.status})`);
  return res.json();
}

export async function getAnalytics(): Promise<unknown> {
  const res = await fetch(`${YT_AGENT_BASE}/analytics`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Analytics request failed (HTTP ${res.status})`);
  return res.json();
}

export async function getSchedule(): Promise<unknown> {
  const res = await fetch(`${YT_AGENT_BASE}/schedule`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Schedule request failed (HTTP ${res.status})`);
  return res.json();
}

export async function startProductionRun(topic?: string): Promise<YTCommandResult> {
  const body: Record<string, unknown> = {
    topic: topic || "",
    priority: "normal",
  };
  if (!topic) delete body.topic;

  const res = await fetch(`${YT_AGENT_BASE}/generate`, {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { command: "start-production", success: false, error: data.error || `HTTP ${res.status}`, provider: "youtube-agent" };
  }
  return { command: "start-production", success: true, data, provider: "youtube-agent" };
}

export async function cancelJob(jobId: string): Promise<YTCommandResult> {
  const res = await fetch(`${YT_AGENT_BASE}/api/jobs/${encodeURIComponent(jobId)}/cancel`, {
    method: "POST",
    headers: HEADERS,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { command: "cancel-job", success: false, error: data.error || `HTTP ${res.status}`, provider: "youtube-agent" };
  }
  return { command: "cancel-job", success: true, data, provider: "youtube-agent" };
}

export async function startOperator(): Promise<YTCommandResult> {
  const res = await fetch(`${YT_AGENT_BASE}/api/operator/start`, {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify({}),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { command: "start-operator", success: false, error: data.error || `HTTP ${res.status}`, provider: "youtube-agent" };
  }
  return { command: "start-operator", success: true, data, provider: "youtube-agent" };
}

export async function pauseOperator(): Promise<YTCommandResult> {
  const res = await fetch(`${YT_AGENT_BASE}/api/operator/pause`, {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify({}),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { command: "pause-operator", success: false, error: data.error || `HTTP ${res.status}`, provider: "youtube-agent" };
  }
  return { command: "pause-operator", success: true, data, provider: "youtube-agent" };
}

export async function openAgentDashboard(): Promise<YTCommandResult> {
  const url = `${YT_AGENT_BASE}`;
  try {
    await (await import("@/lib/automation")).openUrl(url);
    return { command: "open-dashboard", success: true, data: { url }, provider: "youtube-agent" };
  } catch (e) {
    return { command: "open-dashboard", success: false, error: String(e), provider: "youtube-agent" };
  }
}
