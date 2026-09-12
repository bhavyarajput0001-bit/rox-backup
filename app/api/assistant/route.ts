import { runAssistant, streamAssistant, type AssistantTurn } from "@/lib/assistant";
import { recentMemory, remember } from "@/lib/memory";

export async function GET() {
  return Response.json(
    { name: "Rox Assistant", status: "online", capabilities: ["local-controls", "online-tools", "model-context"] },
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
  if (message.length > 2_000) {
    return Response.json({ error: "Message is too long." }, { status: 413 });
  }

  try {
    if (stream) {
      return new Response(await streamAssistant(message, history), {
        headers: { "Cache-Control": "no-store", "Content-Type": "text/event-stream; charset=utf-8", Connection: "keep-alive" },
      });
    }
    const storedHistory = await recentMemory(8);
    const result = await runAssistant(message, [...storedHistory, ...history].slice(-8));
    await remember([
      { role: "user", content: message },
      { role: "rox", content: result.reply },
    ]);
    return Response.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return Response.json({ error: "Assistant service unavailable." }, { status: 503 });
  }
}