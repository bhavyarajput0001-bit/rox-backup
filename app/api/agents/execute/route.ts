/**
 * Route: POST /api/agents/execute
 * 
 * Execute a task using the agent orchestrator.
 * Returns streaming SSE with agent selection, progress, and results.
 */

import { NextRequest, NextResponse } from "next/server";
import { executeTask, getAvailableAgents } from "@/lib/brain/agentOrchestrator";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { task, preferredAgent, category, maxTurns = 10 } = body;

    if (!task) {
      return NextResponse.json(
        { error: "Task is required" },
        { status: 400 }
      );
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        // Send initial metadata
        const send = (event: string, data: unknown) => {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        };

        // Check available agents
        const agents = await getAvailableAgents();
        send("agents", agents);

        // Execute task
        const result = await executeTask({
          task,
          preferredAgent: preferredAgent as any,
          category: category as any,
          maxTurns,
        });

        send("result", result);
        send("done", { ok: result.ok });

        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  const agents = await getAvailableAgents();
  return NextResponse.json(agents);
}
