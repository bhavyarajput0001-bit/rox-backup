import { createBrain } from "@/lib/brain";
import { recentMemory, remember } from "@/lib/memory";
import { lessonCount } from "@/lib/memory";
import { matchQuickCommand, executeQuickCommand } from "@/lib/quickCommands";
import { getSystemStatus } from "@/lib/agents/multiAgent";
import { recallLessons } from "@/lib/memory";

const brain = createBrain();

export async function GET() {
  const status = await getSystemStatus();
  return Response.json(
    {
      name: "Rox AI Brain",
      version: "3.0",
      status: "online",
      capabilities: [
        "native-function-calling",
        "multi-model-failover",
        "100+ skills",
        "memory-system",
        "self-improvement",
        "cross-device-sync",
        "user-authentication",
        "google-sheets-integration",
        "real-time-streaming",
        "web-search",
        "file-operations",
        "shell-execution",
        "youtube-automation",
        "weather",
        "news",
        "calculate",
      ],
      skillsLoaded: brain.getSkills().length,
      lessonsLearned: await lessonCount(),
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "Request body must be valid JSON." },
      { status: 400 }
    );
  }

  const message =
    typeof body === "object" &&
    body !== null &&
    "message" in body &&
    typeof body.message === "string"
      ? body.message.trim()
      : "";
  const history =
    typeof body === "object" &&
    body !== null &&
    "history" in body &&
    Array.isArray(body.history)
      ? body.history
          .filter(
            (turn): turn is { role: string; content: string } =>
              typeof turn === "object" &&
              turn !== null &&
              typeof turn.role === "string" &&
              typeof turn.content === "string"
          )
          .slice(-16)
          .map((turn) => ({
            role: turn.role === "rox" ? "assistant" : "user",
            content: turn.content.slice(0, 2000),
          }))
      : [];
  const stream =
    typeof body === "object" &&
    body !== null &&
    "stream" in body &&
    body.stream === true;
  const userId =
    typeof body === "object" &&
    body !== null &&
    "userId" in body &&
    typeof body.userId === "string"
      ? body.userId
      : null;

  if (!message) {
    return Response.json({ error: "A message is required." }, { status: 400 });
  }
  if (message.length > 4000) {
    return Response.json({ error: "Message is too long." }, { status: 413 });
  }

  // Quick commands bypass the brain
  const quickCmd = matchQuickCommand(message);
  if (quickCmd) {
    const quickResult = await executeQuickCommand(quickCmd, message);
    await remember([
      { role: "user", content: message },
      { role: "rox", content: quickResult.reply },
    ]);
    return Response.json(
      {
        reply: quickResult.reply,
        source: "quick-command",
        toolCalls: [
          {
            tool: quickCmd.name,
            args: {},
            ok: quickResult.ok,
            output: quickResult.reply,
          },
        ],
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  }

  if (stream) {
    const stream = await brain.chatStream(message, history);

    return new Response(stream, {
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": "text/event-stream",
        Connection: "keep-alive",
      },
    });
  }

  // Non-streaming: full agent loop
  const agentResult = await brain.chat(message, history);

  await remember([
    { role: "user", content: message },
    { role: "rox", content: agentResult.reply },
  ]);

  // Cross-department recall
  const recalled = (await recallLessons(message, 3)).map((hit) => ({
    task: hit.lesson.task,
    result: hit.lesson.result,
    runs: hit.lesson.runs,
  }));

  return Response.json(
    {
      reply: agentResult.reply,
      source: agentResult.provider,
      department: agentResult.cognitiveState,
      toolCalls: agentResult.toolCalls.map((tc) => ({
        tool: tc.name,
        args: tc.args,
        ok: tc.ok,
        output: tc.output,
      })),
      recalled,
      skills: agentResult.skills.map((s) => s.name),
      provider: agentResult.provider,
      cognitiveState: agentResult.cognitiveState,
      lessonsLearned: await lessonCount(),
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
