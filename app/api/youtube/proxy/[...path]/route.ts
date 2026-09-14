import { youtubeAgentUrl, youtubeAgentApiKey } from "@/lib/youtubeControl";

/**
 * Reverse proxy that surfaces the YouTube Automation Agent through Rox:
 *
 *   Rox front door:   http://localhost:3456
 *   Embedded agent:   http://localhost:3456/api/youtube/proxy  (dashboard)
 *   Agent's own API:  the same proxy path maps 1:1 to the agent's routes
 *
 * The agent's dashboard HTML calls its own API at absolute paths
 * ("/api/dashboard", "/generate", ...) and loads static assets from "/".
 * When served through the proxy those would hit Rox, so we rewrite every
 * root-relative reference to go through the proxy prefix instead. This is
 * a UI convenience — the real control path is /api/youtube/control which
 * talks to the agent directly from the server.
 */

const PROXY_PREFIX = "/api/youtube/proxy";

function stripPrefix(url: string): string {
  if (url === PROXY_PREFIX) return "/";
  if (url.startsWith(PROXY_PREFIX + "/")) return url.slice(PROXY_PREFIX.length);
  return url;
}

export async function GET(request: Request) {
  return proxy(request);
}

export async function POST(request: Request) {
  return proxy(request);
}

async function proxy(request: Request): Promise<Response> {
  const agentUrl = youtubeAgentUrl();
  const url = new URL(request.url);
  const agentPath = stripPrefix(url.pathname) || "/";
  const query = url.search;

  const headers: Record<string, string> = {};
  const apiKey = youtubeAgentApiKey();
  if (apiKey) headers["x-api-key"] = apiKey;
  for (const name of ["content-type", "accept"]) {
    const value = request.headers.get(name);
    if (value) headers[name] = value;
  }

  const body = request.method === "POST" || request.method === "PUT" ? await request.arrayBuffer() : null;

  let response: Response;
  try {
    response = await fetch(`${agentUrl}${agentPath}${query}`, {
      method: request.method,
      headers,
      body,
      signal: AbortSignal.timeout(15_000),
      redirect: "manual",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "agent unreachable";
    return Response.json({ ok: false, error: message }, { status: 502 });
  }

  const contentType = response.headers.get("content-type") || "";

  // HTML / JS / CSS: rewrite root-relative references to the agent so they
  // route back through this proxy when the dashboard runs inside Rox.
  if (contentType.includes("text/html") || contentType.includes("javascript") || contentType.includes("text/css")) {
    const text = await response.text();

    // 1. Absolute references to the agent's own host → proxy prefix
    let rewritten = text.replace(new RegExp(`https?://[^"'\\s]*(?:localhost|\\.local)[^"'\\s]*`, "g"), (match) => {
      try {
        const u = new URL(match);
        if (u.port === new URL(agentUrl).port || u.hostname === "localhost" || u.hostname.endsWith(".local")) {
          return PROXY_PREFIX;
        }
      } catch {
        // Not a URL — leave as-is
      }
      return match;
    });

    // 2. Root-relative paths (/api/..., /app.js, /styles.css) → proxy prefix
    rewritten = rewritten.replace(/(["'`])(\/)(?!(api\/youtube\/proxy|api\/youtube\/control))/g, (match, quote: string) => {
      return `${quote}${PROXY_PREFIX}/`;
    });

    // 3. JS fetch/axios/XHR/XDomainRequest calls with "/..." → proxy prefix
    rewritten = rewritten.replace(
      /((?:fetch|axios|\.get|\.post|\.put|\.delete|XDomainRequest|XMLHttpRequest)\s*\(\s*["'`])\//g,
      `$1${PROXY_PREFIX}/`,
    );

    // 4. Form actions
    rewritten = rewritten.replace(/(<form[^>]*action=["'`])\//g, `$1${PROXY_PREFIX}/`);

    return new Response(rewritten, {
      status: response.status,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "no-store",
      },
    });
  }

  // JSON / binary: pass through untouched.
  return new Response(response.body, {
    status: response.status,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "no-store",
    },
  });
}

export const dynamic = "force-dynamic";