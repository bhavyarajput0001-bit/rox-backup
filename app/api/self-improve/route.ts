// Self-improvement API endpoint for Rox
// POST /api/self-improve

import { NextResponse } from "next/server";
import { learnFromTask, recallLessons, createSkillFromLesson, getImprovementStats } from "@/lib/brain/selfImprovement";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { task, action, result, success, lessonId, createSkill } = body;

    if (createSkill && lessonId) {
      // Create skill from existing lesson
      const skill = await createSkillFromLesson(lessonId);
      return NextResponse.json({ skill });
    }

    if (task && action && result !== undefined) {
      // Learn from new task
      const lesson = await learnFromTask(task, action, result, success);
      return NextResponse.json({ lesson });
    }

    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  } catch (error) {
    console.error("Self-improve error:", error);
    return NextResponse.json({ error: "Self-improvement failed" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query");
  const limit = parseInt(searchParams.get("limit") || "5");

  if (query) {
    // Recall lessons
    const lessons = await recallLessons(query, limit);
    return NextResponse.json({ lessons });
  }

  // Get stats
  const stats = await getImprovementStats();
  return NextResponse.json(stats);
}