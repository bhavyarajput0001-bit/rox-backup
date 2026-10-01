import {
  runShell,
  readFileTool,
  writeFileTool,
  listDirTool,
  openAppTool,
  openUrlTool,
  runShellIn,
} from "@/lib/executor";
import {
  searchWeb,
  readWebpage,
  getWeather,
  getNews,
  calculate,
  searchWebCompact,
  summarizeUrl,
} from "@/lib/onlineTools";
import {
  recallLessons,
  rememberLesson,
  recentMemory,
  type LearnedLesson,
} from "@/lib/memory";
import { runYouTubeControl } from "@/lib/youtubeControl";
import { parseYouTubeCommand, parseLocalYTCommand } from "@/lib/youtubeIntent";
import { runLocalYTCommand } from "@/lib/youtubeCommands";
import {
  initMultiAgent,
  executeTask,
  getSystemStatus,
} from "@/lib/agents/multiAgent";
import type { AssistantTurn } from "@/lib/assistant";

export type RoxToolName =
  | "shell"
  | "read_file"
  | "write_file"
  | "list_dir"
  | "open_app"
  | "open_url"
  | "web_search"
  | "read_webpage"
  | "summarize_url"
  | "weather"
  | "news"
  | "calculate"
  | "youtube"
  | "graft_improve";

export type ToolCallRecord = {
  tool: RoxToolName;
  args: unknown;
  ok: boolean;
  output: string;
};

export type RoxAgentResult = {
  reply: string;
  toolCalls: ToolCallRecord[];
  recalled: RecallSummary[];
  learned: boolean;
  provider: "model" | "local";
  cognitiveState: "focus" | "reasoning" | "automating" | "learning" | "offline";
};

export type RecallSummary = { task: string; result: string; runs: number };

const MAX_TOOL_ROUNDS = 4;

export const TOOL_SCHEMA = [
  {
    name: "shell",
    description:
      "Run a shell command on the local macOS machine in the Rox workspace (~/Downloads/Rox). Allow-listed binaries: cat, echo, ls, find, grep, head, tail, wc, sort, uniq, date, pwd, mkdir, touch, cp, mv, node, npm, npx, python3, git, curl, wget, open, osascript, plutil, defaults, which, whoami, uname, df, du, ps. Destructive commands (rm -rf /, sudo, shutdown, mkfs, dd to raw devices) are blocked.",
    parameters: {
      type: "object",
      properties: {
        command: { type: "string", description: "Shell command to execute" },
        cwd: {
          type: "string",
          description: "Optional working directory (absolute path)",
        },
      },
      required: ["command"],
    },
  },
  {
    name: "read_file",
    description:
      "Read a text file from disk. Pass an absolute path. Returns content up to 20 KB.",
    parameters: {
      type: "object",
      properties: {
        file_path: { type: "string", description: "Absolute path to the file" },
      },
      required: ["file_path"],
    },
  },
  {
    name: "write_file",
    description:
      "Write text content to a file, creating parent directories. Pass an absolute path.",
    parameters: {
      type: "object",
      properties: {
        file_path: { type: "string", description: "Absolute path to the file" },
        content: { type: "string", description: "Content to write" },
      },
      required: ["file_path", "content"],
    },
  },
  {
    name: "list_dir",
    description:
      "List directory entries (files and folders). Pass an absolute path.",
    parameters: {
      type: "object",
      properties: {
        path: { type: "string", description: "Absolute path to directory" },
      },
      required: ["path"],
    },
  },
  {
    name: "open_app",
    description:
      "Launch a macOS application by name (e.g. 'Notes', 'Safari', 'Terminal').",
    parameters: {
      type: "object",
      properties: {
        app: { type: "string", description: "Application name" },
      },
      required: ["app"],
    },
  },
  {
    name: "open_url",
    description: "Open a web URL in the user's default browser.",
    parameters: {
      type: "object",
      properties: {
        url: { type: "string", description: "Full HTTP/HTTPS URL" },
      },
      required: ["url"],
    },
  },
  {
    name: "web_search",
    description:
      "Search the web (Exa). Returns up to 5 results with titles and summaries.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query" },
      },
      required: ["query"],
    },
  },
  {
    name: "read_webpage",
    description: "Read the text content of a web page (Jina reader).",
    parameters: {
      type: "object",
      properties: {
        url: { type: "string", description: "Webpage URL" },
      },
      required: ["url"],
    },
  },
  {
    name: "weather",
    description: "Get current weather for a location.",
    parameters: {
      type: "object",
      properties: {
        location: { type: "string", description: "City or location name" },
      },
      required: ["location"],
    },
  },
  {
    name: "news",
    description: "Get latest news headlines, optionally for a topic.",
    parameters: {
      type: "object",
      properties: {
        topic: { type: "string", description: "News topic (optional)" },
      },
    },
  },
  {
    name: "calculate",
    description: "Evaluate a math expression safely.",
    parameters: {
      type: "object",
      properties: {
        expression: {
          type: "string",
          description: "Math expression like '6 * 7'",
        },
      },
      required: ["expression"],
    },
  },
  {
    name: "graft_improve",
    description:
      "Run the Graft CLI to build or update the codebase graph for self‑improvement. No arguments needed.",
    parameters: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "youtube",
    description:
      "Relay a command to the YouTube Automation agent (runs on port 3457). Commands: status, jobs, dashboard, generate <topic>, upload, etc.",
    parameters: {
      type: "object",
      properties: {
        command: { type: "string", description: "YouTube command" },
      },
      required: ["command"],
    },
  },
] as const;

type ToolArgs = Record<string, unknown>;

function buildSystemPrompt(
  request: string,
  recall: RecallSummary[],
  toolDescriptions: string,
  recent: string,
): string {
  const recallBlock = recall.length
    ? recall.map((r) => `- [${r.runs}x] ${r.task} -> ${r.result}`).join("\n")
    : "None yet — this looks like a new task; you will learn from it as you execute.";
  return [
    "You are Rox, a personal AI assistant that actually executes tasks on the user's macOS machine.",
    "You run inside a Next.js app. You have real tools; use them when the task demands action,",
    "research, file work, or app launching. When the task is just conversation, answer warmly and concisely.",
    "",
    "Working style:",
    "- For actionable requests, PICK the right tool and ACT. Do not just describe what you would do.",
    "- When the user references past work ('like last time', 'same as before', 'as you did earlier'),",
    "  use the recalled past executions below to reuse the same approach.",
    "- After running tools, give a short summary of what you did and the outcome.",
    "- Keep chat replies to 2-4 sentences unless the task requires more.",
    "- When a task is destructive, irreversible, or touches sensitive data, ask the user first instead of acting.",
    "",
    "YOUR MEMORY — past executions of similar tasks (keyword recall):",
    recallBlock,
    "",
    "RECENT CONVERSATION:",
    recent || "(none)",
    "",
    "AVAILABLE TOOLS (JSON function calls):",
    toolDescriptions,
    "",
    "After your final tool call, produce your human-readable reply to the user. If you called tools, summarize results.",
  ].join("\n");
}

function formatToolCall(call: ToolCallRecord): string {
  const args = JSON.stringify(call.args).slice(0, 600);
  const output = call.output.slice(0, 1_800);
  return `Tool: ${call.tool}\nArgs: ${args}\nOK: ${call.ok}\nOutput: ${output}`;
}

function detectDepartment(toolName: string): string {
  const mapping: Record<string, string> = {
    shell: "code",
    read_file: "research",
    write_file: "content",
    list_dir: "research",
    open_app: "media",
    open_url: "research",
    web_search: "research",
    read_webpage: "research",
    summarize_url: "research",
    weather: "research",
    news: "research",
    calculate: "code",
    graft_improve: "code",
    youtube: "youtube",
  };
  return mapping[toolName] || "content";
}

const toolRunners: Record<
  RoxToolName,
  (args: ToolArgs) => Promise<{ ok: boolean; output: string }>
> = {
  shell: (args) => {
    const command = String(args.command ?? "");
    const cwd = typeof args.cwd === "string" && args.cwd ? args.cwd : undefined;
    return cwd ? runShellIn(cwd, command) : runShell(command);
  },
  read_file: (args) => readFileTool(String(args.file_path ?? "")),
  write_file: (args) =>
    writeFileTool(String(args.file_path ?? ""), String(args.content ?? "")),
  list_dir: (args) => listDirTool(String(args.path ?? "")),
  open_app: (args) => openAppTool(String(args.app ?? "")),
  open_url: (args) => openUrlTool(String(args.url ?? "")),
  web_search: (args) =>
    searchWeb(String(args.query ?? "")).then((raw) => ({
      ok: true,
      output: raw,
    })),
  read_webpage: (args) =>
    readWebpage(String(args.url ?? "")).then((text) => ({
      ok: true,
      output: text,
    })),
  summarize_url: (args) =>
    summarizeUrl(String(args.url ?? "")).then((text) => ({
      ok: true,
      output: text,
    })),
  weather: (args) =>
    getWeather(String(args.location ?? "")).then((text) => ({
      ok: true,
      output: text,
    })),
  news: (args) =>
    getNews(String(args.topic ?? "")).then((text) => ({
      ok: true,
      output: text,
    })),
  calculate: (args) => {
    try {
      return Promise.resolve({
        ok: true,
        output: `= ${calculate(String(args.expression ?? ""))}`,
      });
    } catch (error) {
      return Promise.resolve({
        ok: false,
        output: error instanceof Error ? error.message : "Invalid calculation.",
      });
    }
  },
  graft_improve: async () => {
    // Run graft build in the repo root; this updates the graph for future queries.
    const result = await runShell("graft build", 120_000);
    return { ok: result.ok, output: result.output };
  },
  youtube: async (args) => {
    const command = String(args.command ?? "");
    const localYT = parseLocalYTCommand(command);
    if (localYT) {
      const result = await runLocalYTCommand(localYT);
      return { ok: true, output: result.reply };
    }
    const youtubeCommand = parseYouTubeCommand(command);
    if (youtubeCommand) {
      try {
        const result = await runYouTubeControl(youtubeCommand);
        return { ok: true, output: result.reply };
      } catch (error) {
        return {
          ok: false,
          output: `Could not reach YouTube agent: ${error instanceof Error ? error.message : "unknown"}`,
        };
      }
    }
    return { ok: false, output: "No YouTube command intent recognized." };
  },
};

function parseToolCall(
  text: string,
): { name: RoxToolName; args: ToolArgs } | null {
  // Try to extract JSON from code blocks first
  const blockMatch =
    text.match(/```(?:json)?\s*([\s\S]*?)```/) || text.match(/\{[\s\S]*\}/);
  const candidates = [blockMatch?.[1] ?? blockMatch?.[0], text].filter(
    Boolean,
  ) as string[];
  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate.trim());
      const name = parsed.name || parsed.function;
      const args = parsed.args || parsed.parameters || parsed.arguments;
      if (name && args && toolRunners[name as RoxToolName]) {
        return {
          name: name as RoxToolName,
          args:
            typeof args === "string" ? JSON.parse(args) : (args as ToolArgs),
        };
      }
    } catch {
      // keep trying
    }
  }
  return null;
}

function trimToFinalReply(text: string): string {
  const idx = text.lastIndexOf("FINAL:");
  const candidate =
    idx >= 0 ? text.slice(idx + "FINAL:".length).trim() : text.trim();
  return candidate
    .replace(/^assistant:\s*/i, "")
    .slice(0, 2_000)
    .trim();
}

async function callReasoner(
  messages: Array<{ role: string; content: string }>,
): Promise<string | null> {
  const providers = [
    {
      baseUrl: (
        process.env.OMNIROUTE_BASE_URL || "http://127.0.0.1:20128/v1"
      ).replace(/\/$/, ""),
      apiKey:
        process.env.OMNIROUTE_API_KEY || "sk-d656ee33b2d34cb0-381aa9-5acd090f",
      model: process.env.OMNIROUTE_MODEL || "auto/best-coding",
    },
    {
      baseUrl: (
        process.env.FREELLM_BASE_URL || "http://127.0.0.1:31415/v1"
      ).replace(/\/$/, ""),
      apiKey:
        process.env.FREELLM_API_KEY ||
        "freellmapi-c6d846374855a302d3b1450673db04d7f34e4546abf036c9",
      model: process.env.FREELLM_MODEL || "auto",
    },
  ].filter((provider) => provider.apiKey);

  const tools = TOOL_SCHEMA.map((tool) => ({
    type: "function" as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    },
  }));

  for (const provider of providers) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45_000);
    try {
      const response = await fetch(`${provider.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${provider.apiKey}`,
        },
        body: JSON.stringify({
          model: provider.model,
          temperature: 0.2,
          max_tokens: 1_500,
          messages,
          tools,
        }),
        signal: controller.signal,
      });
      if (!response.ok) continue;
      const data = (await response.json()) as {
        choices?: Array<{
          message?: {
            content?: string;
            tool_calls?: Array<{
              id: string;
              function: { name: string; arguments: string };
            }>;
          };
        }>;
      };
      const choice = data.choices?.[0]?.message;
      // Prefer tool_calls (structured output) over content
      const toolCalls = choice?.tool_calls;
      if (toolCalls?.length) {
        // Return first tool call as JSON string for parsing
        return JSON.stringify({
          name: toolCalls[0].function.name,
          args: JSON.parse(toolCalls[0].function.arguments),
        });
      }
      const content = choice?.content?.trim();
      if (content) return content;
    } catch (error) {
      console.error(`Reasoner provider ${provider.baseUrl} failed:`, error);
    } finally {
      clearTimeout(timeout);
    }
  }
  return null;
}

export async function runRoxAgent(
  request: string,
  history: AssistantTurn[] = [],
): Promise<RoxAgentResult> {
  // Initialize multi-agent system on first run
  try {
    await initMultiAgent();
  } catch (e) {
    console.error("Multi-agent init failed:", e);
  }

  const recall = (await recallLessons(request, 3)).map((hit) => ({
    task: hit.lesson.task,
    result: hit.lesson.result,
    runs: hit.lesson.runs,
  }));
  const recent = (await recentMemory(8))
    .slice(-4)
    .map((turn) => `${turn.role.toUpperCase()}: ${turn.content.slice(0, 300)}`)
    .join("\n");
  const toolDescriptions = TOOL_SCHEMA.map(
    (tool) =>
      `- ${tool.name}(${Object.keys(tool.parameters?.properties ?? {}).join(", ")}): ${tool.description}`,
  ).join("\n");

  const systemPrompt = buildSystemPrompt(
    request,
    recall,
    toolDescriptions,
    recent,
  );
  const toolCalls: ToolCallRecord[] = [];

  // Reasoning loop: up to MAX_TOOL_ROUNDS tool calls.
  let lastContent = "";
  for (let round = 0; round < MAX_TOOL_ROUNDS; round += 1) {
    const messages: Array<{ role: string; content: string }> = [
      { role: "system", content: systemPrompt },
      ...history.slice(-4).map((turn) => ({
        role: turn.role === "rox" ? "assistant" : "user",
        content: turn.content,
      })),
      { role: "user", content: request },
    ];
    for (const call of toolCalls) {
      messages.push({
        role: "assistant",
        content: `I used the ${call.tool} tool with ${JSON.stringify(call.args)} and got: ${call.output.slice(0, 1_500)}`,
      });
    }
    messages.push({
      role: "user",
      content:
        toolCalls.length === 0
          ? 'Decide which tool (if any) to call. Reply with a JSON tool call in a code block ({"name": ..., "args": {...}}) followed by your reasoning, OR if you have enough information, reply with your final answer to the user prefixed with FINAL:'
          : "Based on the tool output above, either call another tool (JSON code block) or give your final answer prefixed with FINAL:",
    });

    const content = await callReasoner(messages);
    if (!content) {
      return {
        reply:
          "My reasoning model is not connected right now. I can still help with orb controls, apps, files, and YouTube locally.",
        toolCalls,
        recalled: recall.map((r) => ({
          task: r.task,
          result: r.result,
          runs: r.runs,
        })),
        learned: false,
        provider: "local",
        cognitiveState: "offline",
      };
    }
    lastContent = content;

    const toolCall = parseToolCall(content);
    if (!toolCall) break; // Reasoner decided it can answer directly.

    const runner = toolRunners[toolCall.name];
    const result = await runner(toolCall.args);

    // Route through multi-agent system for learning
    const dept = detectDepartment(toolCall.name);
    await executeTask(
      `${toolCall.name}(${JSON.stringify(toolCall.args)})`,
      dept,
    ).catch(() => null);

    toolCalls.push({
      tool: toolCall.name,
      args: toolCall.args,
      ok: result.ok,
      output: result.output,
    });
    if (!result.ok && toolCalls.length >= MAX_TOOL_ROUNDS) break;
  }

  const reply =
    trimToFinalReply(lastContent) || "Done — I've acted on your request.";

  // Learn: store a lesson when we actually used tools (execution experience).
  let learned = false;
  if (toolCalls.length > 0) {
    const action = toolCalls
      .map((call) => `${call.tool}(${JSON.stringify(call.args).slice(0, 120)})`)
      .join(" -> ");
    const summary = toolCalls
      .map((call) => `${call.tool}: ${call.output.slice(0, 140)}`)
      .join(" | ");
    await rememberLesson({
      task: request,
      action,
      result: summary || reply,
    });
    learned = true;
  }

  // Get department stats for enhanced cognitive state
  let deptStatus: Awaited<ReturnType<typeof getSystemStatus>> | undefined;
  try {
    deptStatus = await getSystemStatus();
  } catch {
    /* ignore */
  }

  // Determine cognitive state based on what happened.
  let cognitiveState: RoxAgentResult["cognitiveState"] = "focus";
  if (!recall.length && toolCalls.length > 0) cognitiveState = "reasoning";
  if (
    toolCalls.some((call) => call.tool === "shell" || call.tool === "youtube")
  )
    cognitiveState = "automating";
  if (
    toolCalls.some(
      (call) =>
        call.tool === "web_search" ||
        call.tool === "read_webpage" ||
        call.tool === "news",
    )
  ) {
    cognitiveState = "reasoning";
  }
  if (learned) cognitiveState = "learning";

  return {
    reply,
    toolCalls,
    recalled: recall.map((r) => ({
      task: r.task,
      result: r.result,
      runs: r.runs,
    })),
    learned,
    provider: "model",
    cognitiveState,
  };
}
