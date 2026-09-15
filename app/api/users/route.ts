import { NextResponse } from "next/server";
import {
  getUserData,
  saveUserData,
  createUserData,
  type UserData,
} from "@/lib/googleSheets";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json(
      { error: "userId is required" },
      { status: 400 }
    );
  }

  try {
    const userData = await getUserData(userId);
    if (!userData) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }
    return NextResponse.json({ user: userData });
  } catch (error) {
    console.error("Get user error:", error);
    return NextResponse.json(
      { error: "Failed to get user data" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, email, name, device, preferences } = body;

    if (!userId || !device) {
      return NextResponse.json(
        { error: "userId and device are required" },
        { status: 400 }
      );
    }

    const userData: UserData = {
      userId,
      email,
      name,
      device,
      createdAt: new Date().toISOString(),
      lastActive: new Date().toISOString(),
      preferences: preferences || {},
      conversationHistory: [],
      toolsUsed: {},
      skills: [],
    };

    await saveUserData(userData);
    return NextResponse.json({ user: userData }, { status: 201 });
  } catch (error) {
    console.error("Create user error:", error);
    return NextResponse.json(
      { error: "Failed to create user" },
      { status: 500 }
    );
  }
}
