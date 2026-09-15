import { orchestrateTask, getFullSystemStatus } from "@/lib/orchestration";

export async function GET() {
  return Response.json({
    name: "Rox Unified Orchestration Layer",
    version: "3.0",
    description:
      "Routes tasks through ECC agents, multi-agent departments, and DeepSeek fallback",
    capabilities: [
      "ecc-agent-routing",
      "multi-department-orchestration",
      "deepseek-fallback",
      "cross-agent-memory-sync",
      "self-learning",
      "auto-rewiring",
    ],
  });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const bodyObj = body as Record<string, unknown>;
  const message =
    typeof bodyObj?.message === "string" ? bodyObj.message.trim() : "";
  if (!message) {
    return Response.json({ error: "Missing 'message' field" }, { status: 400 });
  }

  const preferECC = bodyObj?.preferECC === true;
  const preferDeepSeek = bodyObj?.preferDeepSeek === true;
  const preferredDept =
    typeof bodyObj?.department === "string" ? bodyObj.department : undefined;

  const result = await orchestrateTask({
    message,
    preferredDept,
    preferECC,
    preferDeepSeek,
  });

  return Response.json(result);
}

export async function HEAD() {
  const status = await getFullSystemStatus();
  return Response.json(status);
}
