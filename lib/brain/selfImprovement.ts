// Self-improvement system for Rox
// Learns from successful workflows and creates reusable skills

import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

const ROX_DIR = path.join(process.cwd(), ".rox-data");
const IMPROVEMENTS_DIR = path.join(ROX_DIR, "improvements");
const LESSONS_FILE = path.join(ROX_DIR, "lessons.json");

export interface LearnedLesson {
  id: string;
  task: string;
  keywords: string[];
  action: string;
  result: string;
  success: boolean;
  createdAt: string;
  runs: number;
}

export interface SkillTemplate {
  name: string;
  description: string;
  triggers: string[];
  steps: string[];
  tools: string[];
}

async function loadLessons(): Promise<LearnedLesson[]> {
  try {
    const raw = await readFile(LESSONS_FILE, "utf8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function saveLessons(lessons: LearnedLesson[]): Promise<void> {
  await mkdir(ROX_DIR, { recursive: true });
  await writeFile(LESSONS_FILE, JSON.stringify(lessons, null, 2));
}

export async function learnFromTask(
  task: string,
  action: string,
  result: string,
  success: boolean
): Promise<LearnedLesson> {
  const lessons = await loadLessons();
  
  // Generate keywords from task
  const keywords = task
    .toLowerCase()
    .split(/\s+/)
    .filter(w => w.length > 3)
    .slice(0, 10);

  const lesson: LearnedLesson = {
    id: `lesson_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    task,
    keywords,
    action,
    result: result.slice(0, 500),
    success,
    createdAt: new Date().toISOString(),
    runs: 1,
  };

  // Check if similar lesson exists and increment runs
  const similarIndex = lessons.findIndex(l => 
    l.task.toLowerCase() === task.toLowerCase()
  );
  
  if (similarIndex >= 0) {
    lessons[similarIndex].runs += 1;
    lessons[similarIndex].result = result.slice(0, 500);
    lessons[similarIndex].action = action;
    lessons[similarIndex].success = success;
  } else {
    lessons.push(lesson);
  }

  await saveLessons(lessons);
  return lesson;
}

export async function recallLessons(query: string, limit: number = 5): Promise<LearnedLesson[]> {
  const lessons = await loadLessons();
  const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
  
  const scored = lessons
    .filter(l => l.success)
    .map(lesson => {
      const text = `${lesson.task} ${lesson.action} ${lesson.result}`.toLowerCase();
      const score = tokens.filter(t => text.includes(t)).length + (lesson.runs * 0.5);
      return { ...lesson, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return scored;
}

export async function createSkillFromLesson(lessonId: string): Promise<SkillTemplate | null> {
  const lessons = await loadLessons();
  const lesson = lessons.find(l => l.id === lessonId);
  
  if (!lesson || !lesson.success) return null;
  
  // Generate skill from successful lesson
  const skill: SkillTemplate = {
    name: lesson.keywords.slice(0, 3).join("-"),
    description: `Auto-generated skill for: ${lesson.task}`,
    triggers: lesson.keywords,
    steps: [
      "Understand the task context",
      lesson.action,
      "Verify the result",
    ],
    tools: extractToolsFromAction(lesson.action),
  };

  // Save skill
  await saveSkill(skill);
  return skill;
}

async function saveSkill(skill: SkillTemplate): Promise<void> {
  await mkdir(IMPROVEMENTS_DIR, { recursive: true });
  
  const skillPath = path.join(IMPROVEMENTS_DIR, `${skill.name}.json`);
  await writeFile(skillPath, JSON.stringify(skill, null, 2));
  
  // Also create a markdown version
  const mdContent = `---
name: ${skill.name}
description: ${skill.description}
triggers: ${skill.triggers.join(", ")}
---

# ${skill.name}

${skill.description}

## Steps

${skill.steps.map((step, i) => `${i + 1}. ${step}`).join("\n")}

## Tools

\`\`\`json
${JSON.stringify(skill.tools, null, 2)}
\`\`\`
`;

  const mdPath = path.join(IMPROVEMENTS_DIR, `${skill.name}.md`);
  await writeFile(mdPath, mdContent);
}

function extractToolsFromAction(action: string): string[] {
  // Simple heuristic: look for known tool names in the action
  const knownTools = [
    "shell", "read_file", "write_file", "list_dir", "web_search",
    "read_webpage", "weather", "news", "calculate", "memory_store",
    "memory_recall", "skill_load", "youtube", "hermes"
  ];
  
  return knownTools.filter(tool => action.toLowerCase().includes(tool));
}

export async function getImprovementStats(): Promise<{
  totalLessons: number;
  successRate: number;
  skillsCreated: number;
  recentLessons: LearnedLesson[];
}> {
  const lessons = await loadLessons();
  const successes = lessons.filter(l => l.success).length;
  
  async function getSkillCount(): Promise<number> {
    try {
      const fs = await import("node:fs/promises");
      const files = await fs.readdir(IMPROVEMENTS_DIR);
      return files.filter(f => f.endsWith(".json")).length;
    } catch {
      return 0;
    }
  }

  return {
    totalLessons: lessons.length,
    successRate: lessons.length > 0 ? successes / lessons.length : 0,
    skillsCreated: await getSkillCount(),
    recentLessons: lessons.slice(-10).reverse(),
  };
}