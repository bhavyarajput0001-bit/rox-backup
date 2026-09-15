/**
 * Parse a natural-language message into YouTube commands.
 *
 * Two layers:
 *   1. Remote commands → YouTube Automation Agent (requires agent running)
 *   2. Local commands → FreeLLM-powered content generation (no API needed)
 *
 * Returns null when the message is not a YouTube request.
 */

import type { YouTubeControlCommand } from "@/lib/youtubeControl";
import type { LocalYTCommand } from "@/lib/youtubeCommands";

// ── Local command parser (no API needed) ─────────────────────────

export function parseLocalYTCommand(message: string): LocalYTCommand | null {
  const normalized = message.toLowerCase().trim();

  // Match patterns: "yt script", "youtube script", "yt script about X"
  const ytMatch = normalized.match(/^(?:yt|youtube)\s+(.+)$/);
  if (!ytMatch) {
    // Also match: "make a youtube script about X", "generate youtube title for X"
    const genMatch = normalized.match(
      /(?:make|generate|create|write|design|build)\s+(?:a\s+)?(?:youtube\s+)?(script|title|description|tags|seo|thumbnail|ideas|calendar|hook|chapters|hashtags|caption|outline|research|compete|plan)\s+(?:about|on|for|of)\s+(.+)/,
    );
    if (genMatch) {
      const subCmd = genMatch[1];
      const topic = genMatch[2].trim();
      return buildCommand(subCmd, topic);
    }
    return null;
  }

  const rest = ytMatch[1].trim();
  // Split: first word is sub-command, rest is topic
  const parts = rest.split(/\s+/);
  const subCmd = parts[0];
  const topic = parts.slice(1).join(" ").trim();

  return buildCommand(subCmd, topic);
}

function buildCommand(subCmd: string, topic: string): LocalYTCommand | null {
  switch (subCmd) {
    case "script":
      return { command: "yt_script", topic: topic || "general" };
    case "title":
      return { command: "yt_title", topic: topic || "general" };
    case "description":
    case "desc":
      return { command: "yt_description", topic: topic || "general" };
    case "tags":
      return { command: "yt_tags", topic: topic || "general" };
    case "seo":
      return { command: "yt_seo", topic: topic || "general" };
    case "thumbnail":
      return { command: "yt_thumbnail", topic: topic || "general" };
    case "ideas":
      return { command: "yt_ideas", niche: topic || undefined };
    case "calendar":
      return { command: "yt_calendar", niche: topic || "general" };
    case "hook":
    case "hooks":
      return { command: "yt_hook", topic: topic || "general" };
    case "chapters":
      return { command: "yt_chapters", topic: topic || "general" };
    case "hashtags":
      return { command: "yt_hashtags", topic: topic || "general" };
    case "caption":
    case "captions":
      return { command: "yt_caption", topic: topic || "general" };
    case "outline":
      return { command: "yt_outline", topic: topic || "general" };
    case "research":
      return { command: "yt_research", topic: topic || "general" };
    case "compete":
    case "competition":
      return { command: "yt_compete", topic: topic || "general" };
    case "plan":
      return { command: "yt_plan", niche: topic || "general" };
    case "help":
      return { command: "yt_help" };
    default:
      return null;
  }
}

// ── Remote command parser (requires YouTube agent running) ────────

export function parseYouTubeCommand(
  message: string,
): YouTubeControlCommand | null {
  const normalized = message.toLowerCase().trim();
  if (!normalized.includes("youtube")) return null;

  const has = (needle: string) => normalized.includes(needle);

  // Explicit reach-out is required — "youtube" alone is ambiguous.
  const youtubeMention = has("youtube");
  if (!youtubeMention) return null;

  // --- Intents that take arguments first (more specific) ---
  if (has("publishable") || has("what is the status of")) {
    const contentId = normalized.match(/content\s+([a-zA-Z0-9_-]+)/)?.[1];
    if (contentId)
      return { command: "publishable", contentId: contentId.toLowerCase() };
  }

  if (has("publish")) {
    const contentId = normalized.match(
      /(?:publish|publishable)\s+(?:content\s+)?([a-zA-Z0-9_-]+)/,
    )?.[1];
    if (contentId)
      return { command: "publish", contentId: contentId.toLowerCase() };
  }

  if (has("approve")) {
    const contentId = normalized.match(
      /approve\s+(?:content\s+)?([a-zA-Z0-9_-]+)/,
    )?.[1];
    if (contentId)
      return { command: "approve", contentId: contentId.toLowerCase() };
  }

  if (has("reject")) {
    const contentId = normalized.match(
      /reject\s+(?:content\s+)?([a-zA-Z0-9_-]+)/,
    )?.[1];
    if (contentId)
      return { command: "reject", contentId: contentId.toLowerCase() };
  }

  if (has("job")) {
    const jobId = normalized.match(/job\s+([a-zA-Z0-9_-]+)/)?.[1];
    if (jobId) return { command: "job", jobId: jobId.toLowerCase() };
  }

  // --- Generation ---
  if (
    has("generate") ||
    has("make a video") ||
    has("create a video") ||
    has("produce a video")
  ) {
    const topic = normalized
      .match(/(?:video|one|something)\s+(?:about|on|for)\s+(.+)/)?.[1]
      ?.trim();
    let style: string | undefined;
    const styleMatch = normalized.match(
      /(?:in|using|with)\s+(tutorial|explainer|list|review|story|educational|informative|engaging|professional|ethereal)\s+style/,
    );
    if (styleMatch) style = styleMatch[1];
    let length: "short" | "medium" | "long" | undefined;
    if (has("short video") || /short\s+video|make a short/.test(normalized))
      length = "short";
    else if (has("long video") || /long\s+video|make a long/.test(normalized))
      length = "long";
    else if (has("medium")) length = "medium";
    return { command: "generate", topic: topic || undefined, style, length };
  }

  // --- Operator / autonomous ---
  if (
    has("autonomous operator") ||
    has("run autonomously") ||
    has("run the operator") ||
    has("autopilot")
  ) {
    if (has("stop") || has("pause"))
      return { command: "operator", action: "pause" };
    if (has("start") || has("run") || has("launch"))
      return { command: "operator", action: "start" };
    return { command: "operator", action: "start" };
  }
  if (has("operator")) {
    return {
      command: "operator",
      action: has("pause") || has("stop") ? "pause" : "start",
    };
  }

  // --- Read-only reports ---
  if (has("schedule") || has("upcoming")) return { command: "schedule" };
  if (has("analytics") || has("performance") || has("metrics"))
    return { command: "analytics" };
  if (has("strategy") || has("channel plan")) return { command: "strategy" };
  if (has("ideas") || has("content ideas")) return { command: "ideas" };
  if (has("jobs")) return { command: "jobs" };

  // --- Generic / status / dashboard ---
  if (has("dashboard") || has("open the panel") || has("show me the dashboard"))
    return { command: "dashboard" };
  if (
    has("status") ||
    has("online") ||
    has("connected") ||
    has("is it up") ||
    has("health")
  )
    return { command: "status" };

  return null;
}
