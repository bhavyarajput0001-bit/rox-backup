import {
  getAgentStatus,
  getAgentDashboard,
  getAnalytics,
  getSchedule,
  startProductionRun,
  cancelJob,
  startOperator,
  pauseOperator,
  openAgentDashboard,
  type YTStatus,
} from "@/lib/youtubeAgent";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const action = url.searchParams.get("action");

  try {
    if (action === "dashboard" || !action) {
      const status = await getAgentStatus();
      let dashboard = null;
      try { dashboard = await getAgentDashboard(); } catch {}
      let analytics = null;
      try { analytics = await getAnalytics(); } catch {}
      let schedule = null;
      try { schedule = await getSchedule(); } catch {}
      return Response.json({ status, dashboard, analytics, schedule }, {
        headers: { "Cache-Control": "no-store" },
      });
    }

    if (action === "analytics") {
      const data = await getAnalytics();
      return Response.json(data, { headers: { "Cache-Control": "no-store" } });
    }

    if (action === "schedule") {
      const data = await getSchedule();
      return Response.json(data, { headers: { "Cache-Control": "no-store" } });
    }

    return Response.json({ error: "Unknown action" }, { status: 400 });
  } catch {
        return Response.json(
          { status: "unreachable", error: "YouTube automation agent is not running on localhost:3457" },
          { status: 503 }
        );
      }
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const command =
    typeof body === "object" && body !== null && "command" in body && typeof body.command === "string"
      ? body.command.trim().toLowerCase()
      : "";
  const topic =
    typeof body === "object" && body !== null && "topic" in body && typeof body.topic === "string"
      ? body.topic.trim()
      : "";
  const jobId =
    typeof body === "object" && body !== null && "jobId" in body && typeof body.jobId === "string"
      ? body.jobId.trim()
      : "";

  if (!command) {
    return Response.json({ error: "A command is required." }, { status: 400 });
  }

  try {
    let result;
    switch (command) {
      case "status":
      case "ping": {
        const status = await getAgentStatus();
        result = { command, success: true, data: status };
        break;
      }
      case "generate":
      case "start-production":
      case "new-video": {
        result = await startProductionRun(topic);
        break;
      }
      case "start-operator":
      case "start-autopilot": {
        result = await startOperator();
        break;
      }
      case "pause-operator":
      case "pause-autopilot": {
        result = await pauseOperator();
        break;
      }
      case "cancel-job":
      case "stop-job": {
        if (!jobId) {
          return Response.json({ error: "jobId is required for cancel-job" }, { status: 400 });
        }
        result = await cancelJob(jobId);
        break;
      }
      case "open-dashboard":
      case "show-dashboard": {
        result = await openAgentDashboard();
        break;
      }
      case "analytics": {
        const data = await getAnalytics();
        result = { command, success: true, data };
        break;
      }
      case "schedule": {
        const data = await getSchedule();
        result = { command, success: true, data };
        break;
      }
      default:
        return Response.json({ error: `Unknown command: ${command}` }, { status: 400 });
    }
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return Response.json(
      { command, success: false, error: String(error) },
      { status: 502 },
    );
  }
}
