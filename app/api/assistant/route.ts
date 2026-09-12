import { runAssistant } from "@/lib/assistant";

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

  if (!message) {
    return Response.json({ error: "A message is required." }, { status: 400 });
  }
  if (message.length > 2_000) {
    return Response.json({ error: "Message is too long." }, { status: 413 });
  }

  try {
    return Response.json(await runAssistant(message));
  } catch {
    return Response.json({ error: "Assistant service unavailable." }, { status: 503 });
  }
}