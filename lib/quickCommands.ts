/**
 * Rox Quick Commands
 * Pre-built commands for common tasks
 */

import { runShell, openAppTool, openUrlTool } from "@/lib/executor";
import { searchWeb } from "@/lib/onlineTools";
import { runYouTubeControl } from "@/lib/youtubeControl";

export type QuickCommand = {
  name: string;
  pattern: RegExp;
  description: string;
  execute: (args?: string) => Promise<{ ok: boolean; reply: string }>;
};

const QUICK_COMMANDS: QuickCommand[] = [
  // ─── App Launchers ───────────────────────────────────────────────────────────
  {
    name: "open_youtube",
    pattern: /^(open|launch|start)\s+youtube$/i,
    description: "Open YouTube in browser",
    execute: async () => {
      const result = await openUrlTool("https://www.youtube.com");
      return {
        ok: result.ok,
        reply: result.ok ? "Opened YouTube in your browser." : "Could not open YouTube.",
      };
    },
  },
  {
    name: "open_spotify",
    pattern: /^(open|launch|start)\s+spotify$/i,
    description: "Open Spotify app",
    execute: async () => {
      const result = await openAppTool("Spotify");
      return {
        ok: result.ok,
        reply: result.ok ? "Launched Spotify." : "Could not open Spotify.",
      };
    },
  },
  {
    name: "open_terminal",
    pattern: /^(open|launch)\s+(terminal|shell)$/i,
    description: "Open Terminal app",
    execute: async () => {
      const result = await openAppTool("Terminal");
      return {
        ok: result.ok,
        reply: result.ok ? "Opened Terminal." : "Could not open Terminal.",
      };
    },
  },
  {
    name: "open_vscode",
    pattern: /^(open|launch)\s+(vscode|visual\s+studio|code)$/i,
    description: "Open VS Code",
    execute: async () => {
      const result = await runShell("code .", 5000);
      return {
        ok: result.ok,
        reply: result.ok ? "Opened VS Code." : "Could not open VS Code.",
      };
    },
  },
  {
    name: "open_notes",
    pattern: /^(open|launch)\s+(notes?|apple\s+notes)$/i,
    description: "Open Notes app",
    execute: async () => {
      const result = await openAppTool("Notes");
      return {
        ok: result.ok,
        reply: result.ok ? "Opened Notes." : "Could not open Notes.",
      };
    },
  },
  {
    name: "open_safari",
    pattern: /^(open|launch)\s+safari$/i,
    description: "Open Safari",
    execute: async () => {
      const result = await openAppTool("Safari");
      return {
        ok: result.ok,
        reply: result.ok ? "Opened Safari." : "Could not open Safari.",
      };
    },
  },
  {
    name: "open_chrome",
    pattern: /^(open|launch)\s+(chrome|google\s+chrome)$/i,
    description: "Open Chrome",
    execute: async () => {
      const result = await openAppTool("Google Chrome");
      return {
        ok: result.ok,
        reply: result.ok ? "Opened Chrome." : "Could not open Chrome.",
      };
    },
  },
  {
    name: "open_slack",
    pattern: /^(open|launch)\s+slack$/i,
    description: "Open Slack",
    execute: async () => {
      const result = await openAppTool("Slack");
      return {
        ok: result.ok,
        reply: result.ok ? "Opened Slack." : "Could not open Slack.",
      };
    },
  },
  {
    name: "open_discord",
    pattern: /^(open|launch)\s+discord$/i,
    description: "Open Discord",
    execute: async () => {
      const result = await openAppTool("Discord");
      return {
        ok: result.ok,
        reply: result.ok ? "Opened Discord." : "Could not open Discord.",
      };
    },
  },

  // ─── YouTube Commands ────────────────────────────────────────────────────────
  {
    name: "yt_status",
    pattern: /^yt\s+status$/i,
    description: "Check YouTube agent status",
    execute: async () => {
      try {
        const result = await runYouTubeControl({ command: "status" });
        return { ok: true, reply: result.reply || "YouTube agent is ready." };
      } catch {
        return { ok: false, reply: "YouTube agent not reachable." };
      }
    },
  },
  {
    name: "yt_jobs",
    pattern: /^yt\s+jobs$/i,
    description: "List YouTube jobs",
    execute: async () => {
      try {
        const result = await runYouTubeControl({ command: "jobs" });
        return { ok: true, reply: result.reply || "No active jobs." };
      } catch {
        return { ok: false, reply: "Could not fetch YouTube jobs." };
      }
    },
  },
  {
    name: "yt_dashboard",
    pattern: /^yt\s+dashboard$/i,
    description: "Open YouTube dashboard",
    execute: async () => {
      try {
        const result = await runYouTubeControl({ command: "dashboard" });
        return { ok: true, reply: result.reply || "Dashboard opened." };
      } catch {
        return { ok: false, reply: "Could not open YouTube dashboard." };
      }
    },
  },

  // ─── Search Commands ─────────────────────────────────────────────────────────
  {
    name: "search",
    pattern: /^search\s+(.+)$/i,
    description: "Search the web",
    execute: async (args) => {
      if (!args) return { ok: false, reply: "What would you like me to search for?" };
      try {
        const results = await searchWeb(args, 5);
        return { ok: true, reply: `Search results for "${args}":\n\n${results}` };
      } catch (error) {
        return {
          ok: false,
          reply: `Search failed: ${error instanceof Error ? error.message : "unknown error"}`,
        };
      }
    },
  },
  {
    name: "weather",
    pattern: /^weather\s+(?:in\s+)?(.+)$/i,
    description: "Get weather for a location",
    execute: async (args) => {
      if (!args) return { ok: false, reply: "Which city?" };
      try {
        const response = await fetch(`https://wttr.in/${encodeURIComponent(args)}?format=j1`);
        const data = await response.json();
        const current = data.current_condition?.[0];
        const area = data.nearest_area?.[0];
        const location = area?.areaName?.[0]?.value || args;
        const temp = current?.temp_C || "?";
        const desc = current?.weatherDesc?.[0]?.value || "";
        const humidity = current?.humidity || "?";
        return {
          ok: true,
          reply: `Weather in ${location}: ${temp}°C, ${desc}, Humidity: ${humidity}%`,
        };
      } catch (error) {
        return {
          ok: false,
          reply: `Could not get weather: ${error instanceof Error ? error.message : "unknown"}`,
        };
      }
    },
  },

  // ─── Spotify Commands ────────────────────────────────────────────────────────
  {
    name: "spotify_play",
    pattern: /^spotify\s+(play|pause|next|prev)\b/i,
    description: "Control Spotify playback",
    execute: async (args) => {
      const action = args?.toLowerCase() || "play";
      const commands: Record<string, string> = {
        play: 'osascript -e \'tell application "Spotify" to play\' && echo "Playing"',
        pause: 'osascript -e \'tell application "Spotify" to pause\' && echo "Paused"',
        next: 'osascript -e \'tell application "Spotify" to next track\' && echo "Next"',
        prev: 'osascript -e \'tell application "Spotify" to previous track\' && echo "Prev"',
      };
      const cmd = commands[action];
      if (!cmd) return { ok: false, reply: `Unknown Spotify command: ${action}` };
      const result = await runShell(cmd, 5000);
      return {
        ok: result.ok,
        reply: result.ok ? result.output.replace(/\n/g, " ") : "Could not control Spotify.",
      };
    },
  },
  {
    name: "spotify_info",
    pattern: /^spotify\s+(track|song|now|current|playing)$/i,
    description: "Get current Spotify track",
    execute: async () => {
      const cmd = 'osascript -e \'tell application "Spotify" to get "Now playing: " & name of current track & " - " & artist of current track\' 2>/dev/null || echo "Spotify is not running"';
      const result = await runShell(cmd, 5000);
      return {
        ok: result.ok,
        reply: result.ok ? result.output : "Could not get Spotify info.",
      };
    },
  },

  // ─── System Commands ─────────────────────────────────────────────────────────
  {
    name: "time",
    pattern: /^what\s+(is\s+)?time|time\b$/i,
    description: "Get current time",
    execute: async () => {
      const now = new Date();
      return {
        ok: true,
        reply: `It is ${now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })} on ${now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}.`,
      };
    },
  },
  {
    name: "status",
    pattern: /^status$|^how\s+are\s+i$|^how\s+are\s+you\s+doing$/i,
    description: "Check Rox status",
    execute: async () => {
      return {
        ok: true,
        reply: "Rox is online and operational. I can open apps, execute commands, search the web, control YouTube, and manage your media.",
      };
    },
  },
  {
    name: "help",
    pattern: /^help|\?$/i,
    description: "Show available commands",
    execute: async () => {
      const commands = QUICK_COMMANDS.map((cmd) => `  • ${cmd.name}: ${cmd.description}`).join("\n");
      return {
        ok: true,
        reply: `**Rox Quick Commands:**\n\n${commands}\n\nJust say the command and I'll execute it!`,
      };
    },
  },
];

/**
 * Try to match a message to a quick command
 */
export function matchQuickCommand(message: string): QuickCommand | null {
  for (const cmd of QUICK_COMMANDS) {
    const match = message.match(cmd.pattern);
    if (match) {
      return { ...cmd };
    }
  }
  return null;
}

/**
 * Execute a quick command
 */
export async function executeQuickCommand(
  command: QuickCommand,
  message?: string,
): Promise<{ ok: boolean; reply: string }> {
  // Extract args from the original message if provided
  let args: string | undefined;
  if (message) {
    for (const cmd of QUICK_COMMANDS) {
      if (cmd.pattern.test(message)) {
        const match = message.match(cmd.pattern);
        args = match?.[1];
        break;
      }
    }
  }
  
  return command.execute(args);
}

/**
 * Get all available commands
 */
export function listQuickCommands(): string {
  return QUICK_COMMANDS.map((cmd) => `• ${cmd.name}: ${cmd.description}`).join("\n");
}
