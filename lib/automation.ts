import os from "node:os";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export type SystemSnapshot = {
  platform: string;
  uptimeSeconds: number;
  cpuCores: number;
  loadAverage: number[];
  memoryTotalBytes: number;
  memoryFreeBytes: number;
  memoryUsedPercent: number;
  capturedAt: string;
};

export function systemSnapshot(): SystemSnapshot {
  const total = os.totalmem();
  const free = os.freemem();
  return {
    platform: `${process.platform} ${os.arch()}`,
    uptimeSeconds: Math.round(os.uptime()),
    cpuCores: os.cpus().length,
    loadAverage: os.loadavg().map((value) => Number(value.toFixed(2))),
    memoryTotalBytes: total,
    memoryFreeBytes: free,
    memoryUsedPercent: Number((((total - free) / total) * 100).toFixed(1)),
    capturedAt: new Date().toISOString(),
  };
}

function ensureUrl(value: string) {
  const url = new URL(value);
  if (!["http:", "https:"].includes(url.protocol))
    throw new Error("Only web URLs can be opened.");
  return url.toString();
}

export async function openUrl(value: string) {
  const url = ensureUrl(value);
  if (process.platform !== "darwin")
    throw new Error("Browser automation currently requires macOS.");
  await execFileAsync("open", [url], { timeout: 8_000 });
  return url;
}

export async function openApp(name: string) {
  const appName = name.trim().replace(/[^a-zA-Z0-9 ._-]/g, "");
  if (!appName || appName.length > 80)
    throw new Error("Invalid application name.");
  if (process.platform !== "darwin")
    throw new Error("App automation currently requires macOS.");
  await execFileAsync("open", ["-a", appName], { timeout: 8_000 });
  return appName;
}

export function searchUrl(service: "youtube" | "spotify", query: string) {
  const encoded = encodeURIComponent(query.trim());
  if (!encoded) throw new Error("A search query is required.");
  return service === "youtube"
    ? `https://www.youtube.com/results?search_query=${encoded}`
    : `https://open.spotify.com/search/${encoded}`;
}
