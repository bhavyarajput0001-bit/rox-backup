import { systemSnapshot } from "@/lib/automation";

export async function GET(request: Request) {
  const url = new URL(request.url);
  if (url.searchParams.get("stream") !== "true") {
    return Response.json(systemSnapshot(), {
      headers: { "Cache-Control": "no-store" },
    });
  }

  const encoder = new TextEncoder();
  let timer: ReturnType<typeof setInterval> | undefined;
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = () =>
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(systemSnapshot())}\n\n`),
        );
      send();
      timer = setInterval(send, 5_000);
    },
    cancel() {
      if (timer) clearInterval(timer);
    },
  });
  return new Response(stream, {
    headers: {
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Content-Type": "text/event-stream",
    },
  });
}
