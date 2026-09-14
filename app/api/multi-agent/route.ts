import { executeTask, getSystemStatus, recallAcrossDepartments, initMultiAgent } from "@/lib/agents/multiAgent";
import { recentMemory } from "@/lib/memory";
import type { AssistantTurn } from "@/lib/assistant";

export async function GET() {
  return Response.json(
    {
      name: "Rox Multi-Agent System",
      version: "2.0",
      status: "online",
      capabilities: [
        "orchestrate",
        "delegate",
        "learn",
        "rewrite",
        "cross-department-recall",
        "self-improvement",
      ],
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
    // Initialize multi-agent system if needed
    const initResult = await initMultiAgent();
    
    // Execute task through multi-agent system
    const taskResult = await executeTask(message, preferredDept);
    
    // Also recall cross-department memories
    const crossRecall = await recallAcrossDepartments(message, 3);
    
    // Build response
    const response = {
      reply: taskResult.result.output,
      department: taskResult.assignedDepartment,
      toolCalls: [
        {
          tool: taskResult.result.action.split("(")[0],
          args: {},
          ok: taskResult.result.success,
          output: taskResult.result.output.slice(0, 500),
        },
      ],
      recalled: crossRecall.map((r) => ({
        task: r.lesson,
        result: `Recalled from ${r.department}`,
        runs: r.success ? 1 : 0,
      })),
      learned: taskResult.newLessons > 0,
      provider: "model",
      cognitiveState: taskResult.result.success ? "learning" : "focus",
      lessonsLearned: taskResult.totalLessons,
      totalTasks: initResult.departments.reduce((sum, d) => sum + 1, 0),
    };
    
    // Store in memory
    await import("@/lib/memory").then(({ remember }) =>
      remember([
        { role: "user", content: message },
        { role: "rox", content: taskResult.result.output },
      ])
    );
    
    return Response.json(response, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("Multi-agent route error:", error);
    return Response.json({ error: "Multi-agent service unavailable." }, { status: 503 });
  }
}
