import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { AssistantTurn } from "@/lib/assistant";

const MEMORY_DIR = path.join(process.cwd(), ".rox-data");
const TRANSCRIPT_PATH = path.join(MEMORY_DIR, "memory.json");
const LESSONS_PATH = path.join(MEMORY_DIR, "lessons.json");
const MAX_MEMORY_TURNS = 200;
let memoryQueue = Promise.resolve();

export type LearnedLesson = {
  id: string;
  task: string; // what the user asked
  keywords: string[]; // indexed for recall
  action: string; // what Rox did
  result: string; // outcome
  learnedAt: string;
  runs: number;
};

export type RecallHit = {
  lesson: LearnedLesson;
  score: number;
};

async function loadJSON<T>(filePath: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await readFile(filePath, "utf8")) as T;
  } catch {
    return fallback;
  }
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s+]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2);
}

const STOPWORDS = new Set([
  "the", "and", "for", "you", "your", "can", "with", "that", "this", "from",
  "have", "are", "was", "were", "will", "would", "could", "should", "what",
  "when", "where", "which", "there", "here", "about", "into", "them", "they",
  "please", "tell", "show", "give", "make", "want", "need", "open", "status",
]);

function keywordsOf(text: string): string[] {
  return [...new Set(tokenize(text).filter((word) => !STOPWORDS.has(word)))];
}

function scoreLesson(lesson: LearnedLesson, queryTokens: string[]): number {
  const lessonTokens = new Set(lesson.keywords);
  let score = 0;
  for (const token of queryTokens) {
    if (lessonTokens.has(token)) score += 2;
  }
  // Favor recently-reinforced lessons
  score += Math.min(lesson.runs, 5);
  return score;
}

// ---- Transcript memory (recent turns, as before) ----

async function loadTranscript(): Promise<AssistantTurn[]> {
  return loadJSON<AssistantTurn[]>(TRANSCRIPT_PATH, []);
}

export async function recentMemory(limit = 8): Promise<AssistantTurn[]> {
  return (await loadTranscript()).slice(-limit);
}

export async function remember(turns: AssistantTurn[]): Promise<void> {
  memoryQueue = memoryQueue.then(async () => {
    const current = await loadTranscript();
    const next = [...current, ...turns].slice(-MAX_MEMORY_TURNS);
    await mkdir(MEMORY_DIR, { recursive: true });
    await writeFile(TRANSCRIPT_PATH, JSON.stringify(next), "utf8");
  });
  await memoryQueue;
}

// ---- Lesson memory (keyword recall + growth) ----

export async function recallLessons(request: string, limit = 3): Promise<RecallHit[]> {
  const lessons = await loadJSON<LearnedLesson[]>(LESSONS_PATH, []);
  const tokens = keywordsOf(request);
  if (!tokens.length) return [];
  return lessons
    .map((lesson) => ({ lesson, score: scoreLesson(lesson, tokens) }))
    .filter((hit) => hit.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export async function rememberLesson(input: {
  task: string;
  action: string;
  result: string;
}): Promise<void> {
  memoryQueue = memoryQueue.then(async () => {
    const lessons = await loadJSON<LearnedLesson[]>(LESSONS_PATH, []);
    const keywords = keywordsOf(`${input.task} ${input.action}`);
    const existing = lessons.find(
      (lesson) => lesson.keywords.some((kw) => keywords.includes(kw)) && lesson.task.slice(0, 40) === input.task.slice(0, 40),
    );
    if (existing) {
      existing.result = input.result;
      existing.action = input.action;
      existing.learnedAt = new Date().toISOString();
      existing.runs += 1;
    } else {
      lessons.push({
        id: `lesson_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        task: input.task.slice(0, 300),
        keywords: keywords.slice(0, 12),
        action: input.action.slice(0, 500),
        result: input.result.slice(0, 500),
        learnedAt: new Date().toISOString(),
        runs: 1,
      });
    }
    const trimmed = lessons.slice(-200);
    await mkdir(MEMORY_DIR, { recursive: true });
    await writeFile(LESSONS_PATH, JSON.stringify(trimmed), "utf8");
  });
  await memoryQueue;
}

export async function lessonCount(): Promise<number> {
  return (await loadJSON<LearnedLesson[]>(LESSONS_PATH, [])).length;
}