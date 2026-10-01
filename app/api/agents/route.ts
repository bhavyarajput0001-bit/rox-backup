/**
 * Route: GET /api/agents
 * 
 * Get status of all available agents
 */

import { NextResponse } from "next/server";
import { getAvailableAgents } from "@/lib/brain/agentOrchestrator";

export async function GET() {
  const agents = await getAvailableAgents();
  return NextResponse.json(agents);
}
