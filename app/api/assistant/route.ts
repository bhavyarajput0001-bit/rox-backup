import { runAssistant, streamAssistant, type AssistantTurn } from "@/lib/assistant";
import { runRoxAgent } from "@/lib/roxAgent";
import { recentMemory, remember, lessonCount } from "@/lib/memory";
import { executeTask as multiAgentExecute, recallAcrossDepartments, initMultiAgent } from "@/lib/agents/multiAgent";

export async function GET() {
  return Response.json(
    {
      name: "Rox Multi-Agent System",
      version: "2.0",
      status: "online",
      capabilities: [
        "local-controls",
        "online-tools",
        "execution",
        "memory-recall",
        "learning",
        "multi-agent-orchestration",
        "self-improvement",
        "cross-department-recall",
      ],
      lessonsLearned: await lessonCount(),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const message =
    typeof body === "object" && body !== null && "message" in body && typeof body.message === "string"
      ? body.message.trim()
      : "";
  const preferredDept =
    typeof body === "object" && body !== null && "department" in body && typeof body.department === "string"
      ? body.department
      : undefined;
  const history =
    typeof body === "object" && body !== null && "history" in body && Array.isArray(body.history)
      ? body.history
          .filter(
            (turn): turn is AssistantTurn =>
              typeof turn === "object" &&
              turn !== null &&
              (turn.role === "user" || turn.role === "rox") &&
              typeof turn.content === "string",
          )
          .slice(-8)
          .map((turn) => ({ role: turn.role, content: turn.content.slice(0, 1_000) }))
      : [];
  const stream = typeof body === "object" && body !== null && "stream" in body && body.stream === true;

  if (!message) {
    return Response.json({ error: "A message is required." }, { status: 400 });
  }
  if (message.length > 4_000) {
    return Response.json({ error: "Message is too long." }, { status: 413 });
  }

  try {
    if (stream) {
      return new Response(await streamAssistant(message, history), {
        headers: { "Cache-Control": "no-store", "Content-Type": "text/event-stream; charset=utf-8", Connection: "keep-alive" },
      });
    }

    // Initialize multi-agent system
    await initMultiAgent();

    // Execute through multi-agent system
    const agentResult = await multiAgentExecute(message, preferredDept);

    // Also recall from shared memory
    const crossRecall = await recallAcrossDepartments(message, 3);

    // Build final response
    const reply = agentResult.result.output;
    
    await remember([
      { role: "user", content: message },
      { role: "rox", content: reply },
    ]);

    return Response.json(
      {
        reply,
        department: agentResult.assignedDepartment,
        toolCalls: [
          {
            tool: agentResult.result.action.split("(")[0],
            args: {},
            ok: agentResult.result.success,
            output: agentResult.result.output.slice(0, 500),
          },
        ],
        recalled: crossRecall.map((r) => ({
          task: r.lesson,
          result: `Recalled from ${r.department}`,
          runs: r.success ? 1 : 0,
        })),
        learned: agentResult.newLessons > 0,
        provider: "model",
        cognitiveState: agentResult.result.success ? "learning" : "focus",
        lessonsLearned: agentResult.totalLessons,
        totalTasksCompleted: agentResult.totalLessons, // Simplified
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Assistant route error:", error);
    return Response.json({ error: "Assistant service unavailable." }, { status: 503 });
  }
}
