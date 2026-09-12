import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

function isHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export async function searchWeb(query: string) {
  const { stdout } = await execFileAsync(
    "mcporter",
    ["call", "exa.web_search_exa", `query=${query}`, "numResults=5"],
    { timeout: 20_000, maxBuffer: 200_000 },
  );
  return stdout.trim().slice(0, 8_000);
}

export async function readWebpage(url: string) {
  if (!isHttpUrl(url)) throw new Error("Only http and https URLs are supported.");
  const response = await fetch(`https://r.jina.ai/${url}`, {
    signal: AbortSignal.timeout(20_000),
    headers: { Accept: "text/plain" },
  });
  if (!response.ok) throw new Error(`Webpage reader returned ${response.status}.`);
  return (await response.text()).slice(0, 8_000);
}

export function capabilityReport() {
  return [
    "Online skills available: web search via Exa, webpage reading via Jina Reader, RSS feeds, YouTube transcripts, and GitHub CLI.",
    "Browser-session skills are installed through OpenCLI but require its Chrome extension and an explicitly logged-in browser session.",
  ].join(" ");
}