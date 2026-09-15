import {
  runYouTubeControl,
  youtubeAgentInfo,
  type YouTubeControlCommand,
} from "@/lib/youtubeControl";
import { runLocalYTCommand, type LocalYTCommand } from "@/lib/youtubeCommands";

const LOCAL_COMMANDS = [
  "yt_script",
  "yt_title",
  "yt_description",
  "yt_tags",
  "yt_seo",
  "yt_thumbnail",
  "yt_ideas",
  "yt_calendar",
  "yt_hook",
  "yt_chapters",
  "yt_hashtags",
  "yt_caption",
  "yt_outline",
  "yt_research",
  "yt_compete",
  "yt_plan",
  "yt_help",
];

export async function GET() {
  const info = await youtubeAgentInfo();
  return Response.json(
    {
      name: "Rox YouTube Agent Bridge",
      status: info.reachable ? "online" : "offline",
      agentUrl: info.url,
      dashboardUrl: `/api/youtube/proxy`,
      commands: [
        "status",
        "generate {topic?} {style?} {length?}",
        "job {jobId}",
        "jobs",
        "publish {contentId}",
        "publishable {contentId}",
        "approve {contentId}",
        "reject {contentId}",
        "operator {start|pause}",
        "ideas",
        "analytics",
        "strategy",
        "schedule",
        "dashboard",
      ],
      localCommands: LOCAL_COMMANDS,
      health: info.health ?? { reachable: false, error: info.error },
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { ok: false, error: "Request body must be valid JSON." },
      { status: 400 },
    );
  }

  const command = (body as { command?: string })?.command;
  if (!command || typeof command !== "string") {
    return Response.json(
      { ok: false, error: "A command is required." },
      { status: 400 },
    );
  }

  const payload = body as Record<string, unknown>;

  // Local YouTube commands (no agent/API required) — handle first
  if (LOCAL_COMMANDS.includes(command)) {
    const localCmd = buildLocalCommand(command, payload);
    if (!localCmd) {
      return Response.json(
        { ok: false, error: `Invalid arguments for ${command}.` },
        { status: 400 },
      );
    }
    const result = await runLocalYTCommand(localCmd);
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  }

  let parsed: YouTubeControlCommand;

  switch (command) {
    case "status":
    case "jobs":
    case "ideas":
    case "analytics":
    case "strategy":
    case "schedule":
    case "dashboard":
      parsed = { command };
      break;
    case "generate":
      parsed = {
        command: "generate",
        topic: typeof payload.topic === "string" ? payload.topic : undefined,
        style: typeof payload.style === "string" ? payload.style : undefined,
        length:
          payload.length === "short" ||
          payload.length === "long" ||
          payload.length === "medium"
            ? payload.length
            : undefined,
      };
      break;
    case "job":
    case "publish":
    case "publishable":
    case "approve":
    case "reject": {
      const contentId = String(payload.contentId ?? payload.jobId ?? "");
      if (!contentId)
        return Response.json(
          { ok: false, error: `${command} requires a contentId.` },
          { status: 400 },
        );
      parsed = { command, contentId } as YouTubeControlCommand;
      break;
    }
    case "operator":
      parsed = {
        command: "operator",
        action: payload.action === "pause" ? "pause" : "start",
      };
      break;
    default:
      return Response.json(
        { ok: false, error: `Unknown command: ${command}` },
        { status: 400 },
      );
  }

  const result = await runYouTubeControl(parsed);
  return Response.json(result, { headers: { "Cache-Control": "no-store" } });
}

function buildLocalCommand(
  command: string,
  payload: Record<string, unknown>,
): LocalYTCommand | null {
  const topic = typeof payload.topic === "string" ? payload.topic.trim() : "";
  const niche = typeof payload.niche === "string" ? payload.niche.trim() : "";
  const style =
    typeof payload.style === "string" ? payload.style.trim() : undefined;
  const length =
    typeof payload.length === "string" ? payload.length.trim() : undefined;
  const count = typeof payload.count === "number" ? payload.count : undefined;
  const duration =
    typeof payload.duration === "string" ? payload.duration.trim() : undefined;
  const platform =
    typeof payload.platform === "string" ? payload.platform.trim() : undefined;

  switch (command) {
    case "yt_script":
      return { command: "yt_script", topic: topic || "general", style, length };
    case "yt_title":
      return { command: "yt_title", topic: topic || "general" };
    case "yt_description":
      return { command: "yt_description", topic: topic || "general" };
    case "yt_tags":
      return { command: "yt_tags", topic: topic || "general" };
    case "yt_seo":
      return { command: "yt_seo", topic: topic || "general" };
    case "yt_thumbnail":
      return { command: "yt_thumbnail", topic: topic || "general" };
    case "yt_ideas":
      return { command: "yt_ideas", niche: niche || undefined };
    case "yt_calendar":
      return { command: "yt_calendar", niche: niche || "general", count };
    case "yt_hook":
      return { command: "yt_hook", topic: topic || "general" };
    case "yt_chapters":
      return { command: "yt_chapters", topic: topic || "general", duration };
    case "yt_hashtags":
      return { command: "yt_hashtags", topic: topic || "general" };
    case "yt_caption":
      return { command: "yt_caption", topic: topic || "general", platform };
    case "yt_outline":
      return { command: "yt_outline", topic: topic || "general" };
    case "yt_research":
      return { command: "yt_research", topic: topic || "general" };
    case "yt_compete":
      return { command: "yt_compete", topic: topic || "general" };
    case "yt_plan":
      return { command: "yt_plan", niche: niche || "general", count };
    case "yt_help":
      return { command: "yt_help" };
    default:
      return null;
  }
}
