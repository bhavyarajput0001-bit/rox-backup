/**
 * Rox Quick Commands - Expanded
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
  // ═══════════════════════════════════════════════════════════════════
  //  APP LAUNCHERS
  // ═══════════════════════════════════════════════════════════════════
  {
    name: "open_youtube",
    pattern: /^(open|launch|start)\s+youtube$/i,
    description: "Open YouTube in browser",
    execute: async () => {
      const r = await openUrlTool("https://www.youtube.com");
      return {
        ok: r.ok,
        reply: r.ok ? "Opened YouTube." : "Could not open YouTube.",
      };
    },
  },
  {
    name: "open_spotify",
    pattern: /^(open|launch|start)\s+spotify$/i,
    description: "Open Spotify app",
    execute: async () => {
      const r = await openAppTool("Spotify");
      return {
        ok: r.ok,
        reply: r.ok ? "Launched Spotify." : "Could not open Spotify.",
      };
    },
  },
  {
    name: "open_terminal",
    pattern: /^(open|launch)\s+(terminal|shell)$/i,
    description: "Open Terminal",
    execute: async () => {
      const r = await openAppTool("Terminal");
      return {
        ok: r.ok,
        reply: r.ok ? "Opened Terminal." : "Could not open Terminal.",
      };
    },
  },
  {
    name: "open_vscode",
    pattern: /^(open|launch)\s+(vscode|visual\s+studio|code)$/i,
    description: "Open VS Code",
    execute: async () => {
      const r = await runShell("code .", 5000);
      return {
        ok: r.ok,
        reply: r.ok ? "Opened VS Code." : "Could not open VS Code.",
      };
    },
  },
  {
    name: "open_notes",
    pattern: /^(open|launch)\s+(notes?|apple\s+notes)$/i,
    description: "Open Notes app",
    execute: async () => {
      const r = await openAppTool("Notes");
      return {
        ok: r.ok,
        reply: r.ok ? "Opened Notes." : "Could not open Notes.",
      };
    },
  },
  {
    name: "open_safari",
    pattern: /^(open|launch)\s+safari$/i,
    description: "Open Safari",
    execute: async () => {
      const r = await openAppTool("Safari");
      return {
        ok: r.ok,
        reply: r.ok ? "Opened Safari." : "Could not open Safari.",
      };
    },
  },
  {
    name: "open_chrome",
    pattern: /^(open|launch)\s+(chrome|google\s+chrome)$/i,
    description: "Open Chrome",
    execute: async () => {
      const r = await openAppTool("Google Chrome");
      return {
        ok: r.ok,
        reply: r.ok ? "Opened Chrome." : "Could not open Chrome.",
      };
    },
  },
  {
    name: "open_slack",
    pattern: /^(open|launch)\s+slack$/i,
    description: "Open Slack",
    execute: async () => {
      const r = await openAppTool("Slack");
      return {
        ok: r.ok,
        reply: r.ok ? "Opened Slack." : "Could not open Slack.",
      };
    },
  },
  {
    name: "open_discord",
    pattern: /^(open|launch)\s+discord$/i,
    description: "Open Discord",
    execute: async () => {
      const r = await openAppTool("Discord");
      return {
        ok: r.ok,
        reply: r.ok ? "Opened Discord." : "Could not open Discord.",
      };
    },
  },
  {
    name: "open_calculator",
    pattern: /^(open|launch)\s+(calculator|calc)$/i,
    description: "Open Calculator",
    execute: async () => {
      const r = await openAppTool("Calculator");
      return {
        ok: r.ok,
        reply: r.ok ? "Opened Calculator." : "Could not open Calculator.",
      };
    },
  },
  {
    name: "open_maps",
    pattern: /^(open|launch)\s+(maps?|google\s+maps)$/i,
    description: "Open Maps",
    execute: async () => {
      const r = await openUrlTool("https://maps.google.com");
      return {
        ok: r.ok,
        reply: r.ok ? "Opened Google Maps." : "Could not open Maps.",
      };
    },
  },
  {
    name: "open_photos",
    pattern: /^(open|launch)\s+(photos?|picture)$/i,
    description: "Open Photos app",
    execute: async () => {
      const r = await openAppTool("Photos");
      return {
        ok: r.ok,
        reply: r.ok ? "Opened Photos." : "Could not open Photos.",
      };
    },
  },
  {
    name: "open_finder",
    pattern: /^(open|launch)\s+(finder)$/i,
    description: "Open Finder",
    execute: async () => {
      const r = await openAppTool("Finder");
      return {
        ok: r.ok,
        reply: r.ok ? "Opened Finder." : "Could not open Finder.",
      };
    },
  },
  {
    name: "open_calendar",
    pattern: /^(open|launch)\s+(calendar|cal)/i,
    description: "Open Calendar",
    execute: async () => {
      const r = await openAppTool("Calendar");
      return {
        ok: r.ok,
        reply: r.ok ? "Opened Calendar." : "Could not open Calendar.",
      };
    },
  },
  {
    name: "open_messages",
    pattern: /^(open|launch)\s+(messages?|text)$/i,
    description: "Open Messages",
    execute: async () => {
      const r = await openAppTool("Messages");
      return {
        ok: r.ok,
        reply: r.ok ? "Opened Messages." : "Could not open Messages.",
      };
    },
  },
  {
    name: "open_mail",
    pattern: /^(open|launch)\s+(mail|email)$/i,
    description: "Open Mail",
    execute: async () => {
      const r = await openAppTool("Mail");
      return {
        ok: r.ok,
        reply: r.ok ? "Opened Mail." : "Could not open Mail.",
      };
    },
  },
  {
    name: "open_facetime",
    pattern: /^(open|launch)\s+(facetime|face\s*time)$/i,
    description: "Open FaceTime",
    execute: async () => {
      const r = await openAppTool("FaceTime");
      return {
        ok: r.ok,
        reply: r.ok ? "Opened FaceTime." : "Could not open FaceTime.",
      };
    },
  },
  {
    name: "open_system_preferences",
    pattern: /^(open|launch)\s+(system\s+preferences|settings|pref)/i,
    description: "Open System Settings",
    execute: async () => {
      const r = await runShell(
        "open 'x-apple.systempreferences:com.apple.Preferences'",
        3000,
      );
      return {
        ok: r.ok,
        reply: r.ok ? "Opened System Settings." : "Could not open Settings.",
      };
    },
  },
  {
    name: "open_lock_screen",
    pattern: /^(lock\s+screen|lock\s+mac)$/i,
    description: "Lock the screen",
    execute: async () => {
      const r = await runShell("pmset displaysleepnow", 2000);
      return {
        ok: r.ok,
        reply: r.ok ? "Screen locked." : "Could not lock screen.",
      };
    },
  },
  {
    name: "open_sleep",
    pattern: /^(put\s+to\s+sleep|sleep\s+mac|sleep)$/i,
    description: "Put Mac to sleep",
    execute: async () => {
      const r = await runShell("pmset sleepnow", 2000);
      return {
        ok: r.ok,
        reply: r.ok ? "Mac is sleeping." : "Could not put to sleep.",
      };
    },
  },
  {
    name: "open_screensaver",
    pattern: /^(start\s+screensaver|launch\s+screensaver)$/i,
    description: "Start screensaver",
    execute: async () => {
      const r = await runShell(
        "open -a 'Screensaver' 2>/dev/null || osascript -e 'tell application \"System Events\" to start idle' && echo 'Screensaver started'",
        2000,
      );
      return {
        ok: r.ok,
        reply: r.ok ? "Screensaver started." : "Could not start screensaver.",
      };
    },
  },

  // ═══════════════════════════════════════════════════════════════════
  //  YOUTUBE COMMANDS
  // ═══════════════════════════════════════════════════════════════════
  {
    name: "yt_status",
    pattern: /^yt\s+status$/i,
    description: "Check YouTube agent status",
    execute: async () => {
      try {
        const r = await runYouTubeControl({ command: "status" });
        return { ok: true, reply: r.reply || "YouTube agent is ready." };
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
        const r = await runYouTubeControl({ command: "jobs" });
        return { ok: true, reply: r.reply || "No active jobs." };
      } catch {
        return { ok: false, reply: "Could not fetch jobs." };
      }
    },
  },
  {
    name: "yt_dashboard",
    pattern: /^yt\s+dashboard$/i,
    description: "Open YouTube dashboard",
    execute: async () => {
      try {
        const r = await runYouTubeControl({ command: "dashboard" });
        return { ok: true, reply: r.reply || "Dashboard opened." };
      } catch {
        return { ok: false, reply: "Could not open dashboard." };
      }
    },
  },
  {
    name: "yt_generate",
    pattern: /^yt\s+generate\s+(.+)$/i,
    description: "Generate YouTube video",
    execute: async (args?: string) => {
      if (!args)
        return { ok: false, reply: "Specify a topic: yt generate <topic>" };
      try {
        const r = await runYouTubeControl({
          command: `generate ${args}`,
        } as any);
        return { ok: true, reply: r.reply || "Video generation started." };
      } catch {
        return { ok: false, reply: "Could not generate video." };
      }
    },
  },
  {
    name: "yt_title",
    pattern: /^yt\s+title\s+(.+)$/i,
    description: "Generate YouTube title",
    execute: async (args?: string) => {
      if (!args)
        return { ok: false, reply: "Specify a topic: yt title <topic>" };
      try {
        const r = await runYouTubeControl({ command: `title ${args}` } as any);
        return { ok: true, reply: r.reply || "Title generated." };
      } catch {
        return { ok: false, reply: "Could not generate title." };
      }
    },
  },
  {
    name: "yt_script",
    pattern: /^yt\s+script\s+(.+)$/i,
    description: "Generate YouTube script",
    execute: async (args?: string) => {
      if (!args)
        return { ok: false, reply: "Specify a topic: yt script <topic>" };
      try {
        const r = await runYouTubeControl({ command: `script ${args}` } as any);
        return { ok: true, reply: r.reply || "Script generated." };
      } catch {
        return { ok: false, reply: "Could not generate script." };
      }
    },
  },
  {
    name: "yt_ideas",
    pattern: /^yt\s+ideas$/i,
    description: "Get YouTube video ideas",
    execute: async () => {
      try {
        const r = await runYouTubeControl({ command: "ideas" });
        return { ok: true, reply: r.reply || "Ideas generated." };
      } catch {
        return { ok: false, reply: "Could not get ideas." };
      }
    },
  },
  {
    name: "yt_analytics",
    pattern: /^yt\s+analytics$/i,
    description: "Check YouTube analytics",
    execute: async () => {
      try {
        const r = await runYouTubeControl({ command: "analytics" });
        return { ok: true, reply: r.reply || "Analytics fetched." };
      } catch {
        return { ok: false, reply: "Could not fetch analytics." };
      }
    },
  },
  {
    name: "yt_hashtags",
    pattern: /^yt\s+hashtags\s+(.+)$/i,
    description: "Generate YouTube hashtags",
    execute: async (args?: string) => {
      if (!args)
        return { ok: false, reply: "Specify a topic: yt hashtags <topic>" };
      try {
        const r = await runYouTubeControl({
          command: `hashtags ${args}`,
        } as any);
        return { ok: true, reply: r.reply || "Hashtags generated." };
      } catch {
        return { ok: false, reply: "Could not generate hashtags." };
      }
    },
  },
  {
    name: "yt_chapters",
    pattern: /^yt\s+chapters\s+(.+)$/i,
    description: "Generate video chapters",
    execute: async (args?: string) => {
      if (!args)
        return { ok: false, reply: "Specify a topic: yt chapters <topic>" };
      try {
        const r = await runYouTubeControl({
          command: `chapters ${args}`,
        } as any);
        return { ok: true, reply: r.reply || "Chapters generated." };
      } catch {
        return { ok: false, reply: "Could not generate chapters." };
      }
    },
  },
  {
    name: "yt_hook",
    pattern: /^yt\s+hook\s+(.+)$/i,
    description: "Generate video hook",
    execute: async (args?: string) => {
      if (!args)
        return { ok: false, reply: "Specify a topic: yt hook <topic>" };
      try {
        const r = await runYouTubeControl({ command: `hook ${args}` } as any);
        return { ok: true, reply: r.reply || "Hook generated." };
      } catch {
        return { ok: false, reply: "Could not generate hook." };
      }
    },
  },
  {
    name: "yt_calendar",
    pattern: /^yt\s+calendar$/i,
    description: "Show content calendar",
    execute: async () => {
      try {
        const r = await runYouTubeControl({ command: "schedule" } as any);
        return { ok: true, reply: r.reply || "Calendar shown." };
      } catch {
        return { ok: false, reply: "Could not fetch calendar." };
      }
    },
  },
  {
    name: "yt_compete",
    pattern: /^yt\s+compete\s+(.+)$/i,
    description: "Analyze competitors",
    execute: async (args?: string) => {
      if (!args)
        return { ok: false, reply: "Specify channel: yt compete <channel>" };
      try {
        const r = await runYouTubeControl({
          command: `compete ${args}`,
        } as any);
        return { ok: true, reply: r.reply || "Competition analysis done." };
      } catch {
        return { ok: false, reply: "Could not analyze competitors." };
      }
    },
  },

  // ═══════════════════════════════════════════════════════════════════
  //  SEARCH & INFO
  // ═══════════════════════════════════════════════════════════════════
  {
    name: "search",
    pattern: /^search\s+(.+)$/i,
    description: "Search the web",
    execute: async (args) => {
      if (!args) return { ok: false, reply: "What to search for?" };
      try {
        const r = await searchWeb(args);
        return { ok: true, reply: `Results for "${args}":\n\n${r}` };
      } catch {
        return { ok: false, reply: "Search failed." };
      }
    },
  },
  {
    name: "news",
    pattern: /^news\s*(.*)$/i,
    description: "Get latest news",
    execute: async (args) => {
      try {
        const topic = args?.trim() || "technology";
        const r = await fetch(
          `https://newsapi.org/v2/top-headlines?country=us&category=${topic}&apiKey=demo`,
        ).catch(() => null);
        if (r?.ok) {
          const data = await r.json();
          const articles = data.articles?.slice(0, 5) || [];
          return {
            ok: true,
            reply:
              `Latest ${topic} news:\n\n` +
              articles
                .map((a: any, i: number) => `${i + 1}. ${a.title}`)
                .join("\n"),
          };
        }
        return {
          ok: true,
          reply: `Here are the latest ${topic} headlines from around the web:`,
        };
      } catch {
        return { ok: false, reply: "Could not fetch news." };
      }
    },
  },
  {
    name: "weather",
    pattern: /^weather\s+(?:in\s+)?(.+)$/i,
    description: "Get weather",
    execute: async (args) => {
      if (!args) return { ok: false, reply: "Which city?" };
      try {
        const r = await fetch(
          `https://wttr.in/${encodeURIComponent(args)}?format=j1`,
        );
        const data = await r.json();
        const c = data.current_condition?.[0];
        const a = data.nearest_area?.[0];
        const loc = a?.areaName?.[0]?.value || args;
        return {
          ok: true,
          reply: `Weather in ${loc}: ${c?.temp_C}°C, ${c?.weatherDesc?.[0]?.value}, Humidity ${c?.humidity}%`,
        };
      } catch {
        return { ok: false, reply: "Could not get weather." };
      }
    },
  },
  {
    name: "time",
    pattern: /^what\s+(is\s+)?time|time\b$/i,
    description: "Get current time",
    execute: async () => {
      const now = new Date();
      return {
        ok: true,
        reply: `It's ${now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })} on ${now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}.`,
      };
    },
  },
  {
    name: "date",
    pattern: /^what\s+(is\s+)?date|date\b$/i,
    description: "Get current date",
    execute: async () => {
      const now = new Date();
      return {
        ok: true,
        reply: `Today is ${now.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}.`,
      };
    },
  },

  // ═══════════════════════════════════════════════════════════════════
  //  SPOTIFY COMMANDS
  // ═══════════════════════════════════════════════════════════════════
  {
    name: "spotify_play",
    pattern: /^spotify\s+play\b/i,
    description: "Play Spotify",
    execute: async () => {
      const r = await runShell(
        'osascript -e \'tell application "Spotify" to play\' && echo "Playing"',
        3000,
      );
      return {
        ok: r.ok,
        reply: r.ok ? "Now playing." : "Could not control Spotify.",
      };
    },
  },
  {
    name: "spotify_pause",
    pattern: /^spotify\s+pause\b/i,
    description: "Pause Spotify",
    execute: async () => {
      const r = await runShell(
        'osascript -e \'tell application "Spotify" to pause\' && echo "Paused"',
        3000,
      );
      return {
        ok: r.ok,
        reply: r.ok ? "Paused." : "Could not control Spotify.",
      };
    },
  },
  {
    name: "spotify_next",
    pattern: /^spotify\s+next\b/i,
    description: "Next track",
    execute: async () => {
      const r = await runShell(
        'osascript -e \'tell application "Spotify" to next track\' && echo "Next"',
        3000,
      );
      return {
        ok: r.ok,
        reply: r.ok ? "Next track." : "Could not control Spotify.",
      };
    },
  },
  {
    name: "spotify_prev",
    pattern: /^spotify\s+prev(ious)?\b/i,
    description: "Previous track",
    execute: async () => {
      const r = await runShell(
        'osascript -e \'tell application "Spotify" to previous track\' && echo "Prev"',
        3000,
      );
      return {
        ok: r.ok,
        reply: r.ok ? "Previous track." : "Could not control Spotify.",
      };
    },
  },
  {
    name: "spotify_volume",
    pattern: /^spotify\s+volume\s+(\d+)%?$/i,
    description: "Set Spotify volume",
    execute: async (args) => {
      const vol = parseInt(args || "50");
      const clamped = Math.max(0, Math.min(100, vol));
      const r = await runShell(
        `osascript -e 'tell application "Spotify" to set volume to ${clamped / 100}'`,
        3000,
      );
      return {
        ok: r.ok,
        reply: r.ok ? `Volume set to ${clamped}%.` : "Could not set volume.",
      };
    },
  },
  {
    name: "spotify_shuffle",
    pattern: /^spotify\s+shuffle\s+(on|off)$/i,
    description: "Toggle shuffle",
    execute: async (args) => {
      const on = (args || "on").toLowerCase().startsWith("on");
      const r = await runShell(
        `osascript -e 'tell application "Spotify" to set shuffled of current playlist to ${on}'`,
        3000,
      );
      return {
        ok: r.ok,
        reply: r.ok
          ? `Shuffle ${on ? "enabled" : "disabled"}.`
          : "Could not toggle shuffle.",
      };
    },
  },
  {
    name: "spotify_repeat",
    pattern: /^spotify\s+repeat\s+(on|off|one)$/i,
    description: "Set repeat mode",
    execute: async (args) => {
      const mode = (args || "on").toLowerCase();
      const r = await runShell(
        `osascript -e 'tell application "Spotify" to set repeat view to "${mode}"'`,
        3000,
      );
      return {
        ok: r.ok,
        reply: r.ok ? `Repeat set to ${mode}.` : "Could not set repeat.",
      };
    },
  },
  {
    name: "spotify_now",
    pattern: /^spotify\s+(now|current|playing|track|song)$/i,
    description: "Current track",
    execute: async () => {
      const r = await runShell(
        'osascript -e \'tell application "Spotify" to get "Now: " & name of current track & " - " & artist of current track\' 2>/dev/null || echo "Spotify not running"',
        3000,
      );
      return { ok: r.ok, reply: r.ok ? r.output : "Could not get track info." };
    },
  },
  {
    name: "spotify_search",
    pattern: /^spotify\s+search\s+(.+)$/i,
    description: "Search Spotify",
    execute: async (args) => {
      if (!args) return { ok: false, reply: "What to search for?" };
      const r = await runShell(
        `open "spotify:search:${encodeURIComponent(args)}"`,
        2000,
      );
      return {
        ok: r.ok,
        reply: r.ok
          ? `Searching Spotify for: ${args}`
          : "Could not search Spotify.",
      };
    },
  },
  {
    name: "spotify_queue",
    pattern: /^spotify\s+queue$/i,
    description: "Show queue",
    execute: async () => {
      const r = await runShell(
        'osascript -e \'tell application "Spotify" to get queue\' 2>/dev/null || echo "Not available"',
        3000,
      );
      return { ok: r.ok, reply: r.ok ? r.output : "Could not get queue." };
    },
  },

  // ═══════════════════════════════════════════════════════════════════
  //  SYSTEM COMMANDS
  // ═══════════════════════════════════════════════════════════════════
  {
    name: "status",
    pattern: /^status$|^how\s+are\s+i$|^how\s+are\s+you\s+doing$/i,
    description: "Rox status",
    execute: async () => {
      return {
        ok: true,
        reply:
          "Rox is online. Capabilities: apps, shell, search, YouTube, Spotify, memory, multi-agent.",
      };
    },
  },
  {
    name: "help",
    pattern: /^help|\?$/i,
    description: "Show commands",
    execute: async () => {
      const cmds = QUICK_COMMANDS.map(
        (c) => `  • ${c.name}: ${c.description}`,
      ).join("\n");
      return {
        ok: true,
        reply: `**Rox Quick Commands:**\n\n${cmds}\n\nJust say any of these and I'll execute them!`,
      };
    },
  },
  {
    name: "screenshot",
    pattern: /^(take|capture|make)\s+(a\s+)?screenshot$/i,
    description: "Take screenshot",
    execute: async () => {
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const filename = `/Users/bhavyarajput/Desktop/Screenshot_${timestamp}.png`;
      const r = await runShell(
        `screencapture "${filename}" && echo "Saved to Desktop"`,
        5000,
      );
      return {
        ok: r.ok,
        reply: r.ok
          ? `Screenshot saved to Desktop.`
          : "Could not take screenshot.",
      };
    },
  },
  {
    name: "clipboard",
    pattern: /^(show|get|what|clipboard|copied)$/i,
    description: "Show clipboard",
    execute: async () => {
      const r = await runShell("pbpaste", 2000);
      return {
        ok: r.ok,
        reply: r.ok
          ? `Clipboard: ${r.output.slice(0, 200)}`
          : "Could not read clipboard.",
      };
    },
  },
  {
    name: "restart",
    pattern: /^(restart|reboot)\s+(the\s+)?(mac\s+|computer|system)?$/i,
    description: "Restart Mac",
    execute: async () => {
      return {
        ok: false,
        reply:
          "I can't restart your Mac directly for safety. Please do it manually with ⌘+Control+Eject.",
      };
    },
  },
  {
    name: "shutdown",
    pattern: /^(shutdown|shut\s+down)$/i,
    description: "Shutdown Mac",
    execute: async () => {
      return {
        ok: false,
        reply: "I can't shutdown your Mac for safety. Please do it manually.",
      };
    },
  },
  {
    name: "disk_space",
    pattern: /^(disk\s+space|storage|free\s+space)$/i,
    description: "Check disk space",
    execute: async () => {
      const r = await runShell(
        'df -m / 2>/dev/null | tail -1 | awk \'{print "Disk: "$3"/"$2"MB used, "$4"MB free"}\'',
        5000,
      );
      return {
        ok: r.ok,
        reply: r.ok ? r.output : "Could not check disk space.",
      };
    },
  },
  {
    name: "memory_usage",
    pattern: /^(memory\s+usage|ram|sys\s+info)$/i,
    description: "Check memory usage",
    execute: async () => {
      const r = await runShell(
        'sysctl hw.memsize | awk \'{print "Total RAM: "$2" bytes"}\'',
        3000,
      );
      return { ok: r.ok, reply: r.ok ? r.output : "Could not check memory." };
    },
  },
  {
    name: "cpu_info",
    pattern: /^(cpu|processor|chip)$/i,
    description: "Show CPU info",
    execute: async () => {
      const r = await runShell(
        "sysctl -n machdep.cpu.brand_string 2>/dev/null",
        3000,
      );
      return {
        ok: r.ok,
        reply: r.ok ? r.output.trim() : "Could not get CPU info.",
      };
    },
  },
  {
    name: "battery",
    pattern: /^(battery|charge)$/i,
    description: "Check battery",
    execute: async () => {
      const r = await runShell("pmset -g batt 2>/dev/null | head -1", 2000);
      return {
        ok: r.ok,
        reply: r.ok
          ? `Battery: ${r.output.trim()}`
          : "Battery info unavailable (desktop?).",
      };
    },
  },
  {
    name: "whoami",
    pattern: /^(who\s+am\s+i|username|my\s+name)$/i,
    description: "Show username",
    execute: async () => {
      const r = await runShell("whoami", 2000);
      return {
        ok: r.ok,
        reply: r.ok
          ? `You are logged in as: ${r.output.trim()}`
          : "Could not get username.",
      };
    },
  },
  {
    name: "hostname",
    pattern: /^(host\s+name|computer\s+name)$/i,
    description: "Show computer name",
    execute: async () => {
      const r = await runShell("scutil --get ComputerName", 2000);
      return {
        ok: r.ok,
        reply: r.ok
          ? `Computer name: ${r.output.trim()}`
          : "Could not get hostname.",
      };
    },
  },

  // ═══════════════════════════════════════════════════════════════════
  //  FILE COMMANDS
  // ═══════════════════════════════════════════════════════════════════
  {
    name: "list_files",
    pattern: /^(list|ls)\s+(in\s+)?(.+)?$/i,
    description: "List files in directory",
    execute: async (args) => {
      const dir = args?.trim() || ".";
      const r = await runShell(`ls -la "${dir}"`, 3000);
      return {
        ok: r.ok,
        reply: r.ok ? `Files in ${dir}:\n${r.output}` : "Could not list files.",
      };
    },
  },
  {
    name: "read_file",
    pattern: /^(read|cat)\s+(the\s+)?(.+)$/i,
    description: "Read a file",
    execute: async (args) => {
      if (!args) return { ok: false, reply: "Which file?" };
      const r = await runShell(`head -100 "${args.trim()}"`, 5000);
      return {
        ok: r.ok,
        reply: r.ok ? r.output.slice(0, 2000) : "Could not read file.",
      };
    },
  },
  {
    name: "create_file",
    pattern: /^(create|new)\s+(a\s+)?file\s+(called\s+)?(.+)$/i,
    description: "Create a new file",
    execute: async (args) => {
      if (!args) return { ok: false, reply: "What file to create?" };
      const filename = args.trim();
      const r = await runShell(
        `touch "${filename}" && echo "Created: ${filename}"`,
        3000,
      );
      return {
        ok: r.ok,
        reply: r.ok ? `Created file: ${filename}` : "Could not create file.",
      };
    },
  },
  {
    name: "grep_search",
    pattern: /^(grep|find)\s+(in\s+)?(.+)$/i,
    description: "Search file contents",
    execute: async (args) => {
      if (!args) return { ok: false, reply: "What to search for?" };
      const r = await runShell(
        `grep -r "${args}" . --include="*.ts" --include="*.js" --include="*.json" -l 2>/dev/null | head -10`,
        5000,
      );
      return {
        ok: r.ok,
        reply: r.ok ? `Found in:\n${r.output}` : "No matches found.",
      };
    },
  },

  // ═══════════════════════════════════════════════════════════════════
  //  DEVELOPMENT COMMANDS
  // ═══════════════════════════════════════════════════════════════════
  {
    name: "dev_start",
    pattern: /^(npm\s+run\s+)?dev\s*$/i,
    description: "Start dev server",
    execute: async () => {
      const r = await runShell(
        "lsof -iTCP:3000 -sTCP:LISTEN | grep node | wc -l",
        3000,
      );
      const running = parseInt(r.output?.trim() || "0");
      if (running > 0)
        return {
          ok: true,
          reply: "Dev server is already running on port 3000.",
        };
      return {
        ok: false,
        reply: "Use 'npm run dev' in terminal to start the server.",
      };
    },
  },
  {
    name: "build_project",
    pattern: /^(npm\s+run\s+)?build$/i,
    description: "Build project",
    execute: async () => {
      const r = await runShell("npm run build 2>&1 | tail -5", 60000);
      return {
        ok: r.ok,
        reply: r.ok ? `Build output:\n${r.output}` : "Build failed.",
      };
    },
  },
  {
    name: "install_deps",
    pattern: /^(npm\s+)?install$/i,
    description: "Install dependencies",
    execute: async () => {
      const r = await runShell(
        "npm install --prefer-offline 2>&1 | tail -3",
        120000,
      );
      return {
        ok: r.ok,
        reply: r.ok ? `Installed:\n${r.output}` : "Install failed.",
      };
    },
  },
  {
    name: "git_status",
    pattern: /^(git\s+)?status$/i,
    description: "Git status",
    execute: async () => {
      const r = await runShell("git status --short | head -20", 3000);
      return {
        ok: r.ok,
        reply: r.ok
          ? r.output.trim() || "Nothing to commit."
          : "Not a git repo.",
      };
    },
  },
  {
    name: "git_log",
    pattern: /^(git\s+)?log\s*(\d+)?$/i,
    description: "Git log",
    execute: async (args) => {
      const n = parseInt(args || "10");
      const r = await runShell(`git log --oneline -${n}`, 3000);
      return { ok: r.ok, reply: r.ok ? r.output : "Could not get git log." };
    },
  },
  {
    name: "git_diff",
    pattern: /^(git\s+)?diff$/i,
    description: "Git diff",
    execute: async () => {
      const r = await runShell("git diff --stat", 3000);
      return {
        ok: r.ok,
        reply: r.ok ? r.output || "No changes." : "No diff available.",
      };
    },
  },
  {
    name: "graft_build",
    pattern: /^(run\s+)?graft\s+build/i,
    description: "Build Graft graph",
    execute: async () => {
      const r = await runShell("graft build 2>&1 | tail -5", 120000);
      return {
        ok: r.ok,
        reply: r.ok
          ? `Graft built:\n${r.output}`
          : "Could not build graft graph.",
      };
    },
  },
  {
    name: "multi_agent_status",
    pattern: /^(multi.?agent|agents|departments?)\s+(status|list)$/i,
    description: "Show agent status",
    execute: async () => {
      try {
        const r = await fetch("http://localhost:3000/api/multi-agent").then(
          (res) => res.json(),
        );
        return {
          ok: true,
          reply: `Rox Multi-Agent System v${r.version}\nStatus: ${r.status}\nLessons learned: ${r.lessonsLearned || 0}`,
        };
      } catch {
        return { ok: false, reply: "Could not reach multi-agent API." };
      }
    },
  },
  {
    name: "memory_status",
    pattern: /^(memory|lessons?)\s+(status|count|how\s+many)$/i,
    description: "Show memory stats",
    execute: async () => {
      try {
        const r = await fetch("http://localhost:3000/api/memory").then((res) =>
          res.json(),
        );
        return {
          ok: true,
          reply: `Memory: ${r.totalItems || 0} items across ${Object.keys(r.categories || {}).filter((k) => r.categories[k] > 0).length} categories`,
        };
      } catch {
        return { ok: false, reply: "Could not get memory stats." };
      }
    },
  },

  // ═══════════════════════════════════════════════════════════════════
  //  COMMUNICATION
  // ═══════════════════════════════════════════════════════════════════
  {
    name: "send_message",
    pattern: /^(send|message)\s+(to\s+)?(.+)$/i,
    description: "Send iMessage",
    execute: async (args) => {
      if (!args) return { ok: false, reply: "Who to message?" };
      return {
        ok: false,
        reply:
          "iMessage sending requires the imsg CLI to be configured. Try opening Messages app instead.",
      };
    },
  },
  {
    name: "open_emails",
    pattern: /^(open|check)\s+(my\s+)?(mail|emails?|inbox)$/i,
    description: "Open Mail",
    execute: async () => {
      const r = await openAppTool("Mail");
      return {
        ok: r.ok,
        reply: r.ok ? "Opened Mail." : "Could not open Mail.",
      };
    },
  },

  // ═══════════════════════════════════════════════════════════════════
  //  ROX-SPECIFIC COMMANDS
  // ═══════════════════════════════════════════════════════════════════
  {
    name: "rox_rewire",
    pattern: /^(rewire|auto.?wire)$/i,
    description: "Re-wire all repos",
    execute: async () => {
      const r = await runShell(
        "node lib/skills/auto-repo-wiring.js 2>&1 | tail -5",
        60000,
      );
      return { ok: r.ok, reply: r.ok ? r.output : "Could not rewire repos." };
    },
  },
  {
    name: "rox_build_memory",
    pattern: /^(build|rebuild|refresh)\s+(memory|index)$/i,
    description: "Rebuild memory index",
    execute: async () => {
      const r = await runShell("node scripts/rebuild-memory-index.js", 10000);
      return {
        ok: r.ok,
        reply: r.ok
          ? `Memory rebuilt:\n${r.output}`
          : "Could not rebuild memory.",
      };
    },
  },
  {
    name: "rox_lesson_count",
    pattern: /^(how\s+many\s+)?lessons?|lesson\s+(count|total)$/i,
    description: "Count lessons",
    execute: async () => {
      try {
        const r = await fetch("http://localhost:3000/api/assistant").then(
          (res) => res.json(),
        );
        return {
          ok: true,
          reply: `Total lessons learned: ${r.lessonsLearned || 0}`,
        };
      } catch {
        return { ok: false, reply: "Could not count lessons." };
      }
    },
  },
  {
    name: "rox_clear_memory",
    pattern: /^(clear|reset|wipe)\s+(memory|lessons?)$/i,
    description: "Clear memory (destructive)",
    execute: async () => {
      return {
        ok: false,
        reply:
          "Memory clearing is disabled for safety. Use the API or edit .rox-data/ manually.",
      };
    },
  },
  {
    name: "rox_sync",
    pattern: /^(sync|push)\s*(to\s+)?(backup|git)?$/i,
    description: "Sync to git backup",
    execute: async () => {
      const r = await runShell(
        "cd ~/Downloads/Rox && git add -A && git commit -m 'auto-sync: $(date)' && git push backup main 2>&1 | tail -3",
        30000,
      );
      return { ok: r.ok, reply: r.ok ? "Synced to backup." : "Sync failed." };
    },
  },
];

// ─── Helpers ───────────────────────────────────────────────────────────────────

export function matchQuickCommand(message: string): QuickCommand | null {
  for (const cmd of QUICK_COMMANDS) {
    if (cmd.pattern.test(message)) return { ...cmd };
  }
  return null;
}

export async function executeQuickCommand(
  command: QuickCommand,
  message?: string,
): Promise<{ ok: boolean; reply: string }> {
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

export function listQuickCommands(): string {
  return QUICK_COMMANDS.map((c) => `• ${c.name}: ${c.description}`).join("\n");
}

export function getQuickCommandCount(): number {
  return QUICK_COMMANDS.length;
}
