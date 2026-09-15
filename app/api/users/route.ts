import { NextResponse } from "next/server";
import { handleSync, getActiveDevices, clearAllDevices } from "@/lib/deviceSync";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json(
      { error: "userId is required" },
      { status: 400 }
    );
  }

  const devices = getActiveDevices(userId);
  return NextResponse.json({ devices });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, action, device, payload } = body;

    if (!userId || !action || !device) {
      return NextResponse.json(
        { error: "userId, action, and device are required" },
        { status: 400 }
      );
    }

    const result = await handleSync({ userId, action, device, payload });
    return NextResponse.json(result);
  } catch (error) {
    console.error("Sync error:", error);
    return NextResponse.json(
      { error: "Sync failed" },
      { status: 500 }
    );
  }
}
