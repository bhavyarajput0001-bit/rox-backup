/**
 * Rox Memory Organization System
 * 
 * Provides structured, categorized, and searchable memory
 * with cross-references, summaries, and department knowledge
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

const DATA_DIR = path.join(process.cwd(), ".rox-data");

// ─── Types ─────────────────────────────────────────────────────────────────────

export type MemoryCategory = 
  | "youtube" 
  | "content" 
  | "code" 
  | "media" 
  | "research" 
  | "general"
  | "skills"
  | "preferences";

export type MemoryItem = {
  id: string;
  category: MemoryCategory;
  tags: string[];
  content: string;
  context?: string;
  confidence: number; // 0-1
  createdAt: string;
  updatedAt: string;
  references?: string[]; // IDs of related items
  metadata?: Record<string, unknown>;
};

export type MemoryIndex = {
  version: string;
  lastUpdated: string;
  totalItems: number;
  categories: Record<MemoryCategory, number>;
  tags: Record<string, number>;
};

// ─── Constants ─────────────────────────────────────────────────────────────────

const MEMORY_INDEX_PATH = path.join(DATA_DIR, "memory_index.json");
const MEMORY_ITEMS_PATH = path.join(DATA_DIR, "memory_items.json");

const CATEGORY_KEYWORDS: Record<MemoryCategory, string[]> = {
  youtube: ["youtube", "yt", "video", "channel", "upload", "thumbnail", "title", "script"],
  content: ["write", "blog", "article", "copy", "email", "content", "title", "hook"],
  code: ["file", "read", "write", "execute", "shell", "command", "npm", "git", "build"],
  media: ["image", "audio", "video", "generate", "create", "render", "animate"],
  research: ["search", "query", "find", "analyze", "weather", "news", "web"],
  general: ["time", "calculate", "status", "help", "what", "how"],
  skills: ["tool", "skill", "learn", "improve", "graft", "agent", "department"],
  preferences: ["user", "prefer", "always", "never", "setting", "config"],
};

// ─── Initialization ────────────────────────────────────────────────────────────

export async function initMemory(): Promise<{ index: MemoryIndex; migrated: number }> {
  await mkdir(DATA_DIR, { recursive: true });
  
  const [existingItems, newIndex] = await Promise.all([
    loadJSON<MemoryItem[]>(MEMORY_ITEMS_PATH, []),
    buildIndex()
  ]);
  
  // Migrate old lessons.json into organized memory
  const migrated = await migrateLessons();
  
  return { index: newIndex, migrated };
}

async function migrateLessons(): Promise<number> {
  const lessonsPath = path.join(DATA_DIR, "lessons.json");
  let lessons: Array<{
    id: string;
    task: string;
    keywords: string[];
    action: string;
    result: string;
    learnedAt: string;
    runs: number;
  }> = [];
  
  try {
    const raw = await readFile(lessonsPath, "utf8");
    lessons = JSON.parse(raw);
  } catch {
    return 0;
  }
  
  if (!lessons.length) return 0;
  
  // Load existing items
  let items: MemoryItem[] = [];
  try {
    const raw = await readFile(MEMORY_ITEMS_PATH, "utf8");
    items = JSON.parse(raw);
  } catch {}
  
  // Migrate each lesson
  const migratedIds = new Set<string>();
  for (const lesson of lessons) {
    const category = detectCategory(lesson.task);
    const itemId = `legacy_${lesson.id}`;
    
    if (!items.find((i) => i.id === itemId)) {
      items.push({
        id: itemId,
        category,
        tags: lesson.keywords.slice(0, 10),
        content: `${lesson.task}\n\nAction: ${lesson.action}\n\nResult: ${lesson.result.slice(0, 500)}`,
        context: `Learned from task: ${lesson.task.slice(0, 100)}`,
        confidence: Math.min(0.5 + lesson.runs * 0.1, 1.0),
        createdAt: lesson.learnedAt,
        updatedAt: new Date().toISOString(),
        references: [],
        metadata: { source: "lessons.json", runs: lesson.runs },
      });
      migratedIds.add(lesson.id);
    }
  }
  
  // Also migrate memory.json transcript for key conversations
  await migrateTranscript(items);
  
  // Save organized memory
  await writeFile(MEMORY_ITEMS_PATH, JSON.stringify(items, null, 2));
  
  return migratedIds.size;
}

async function migrateTranscript(items: MemoryItem[]): Promise<void> {
  const transcriptPath = path.join(DATA_DIR, "memory.json");
  let transcript: Array<{ role: string; content: string }> = [];
  
  try {
    const raw = await readFile(transcriptPath, "utf8");
    transcript = JSON.parse(raw);
  } catch {
    return;
  }
  
  // Find important exchanges to preserve
  const importantMessages = transcript.filter((msg) => 
    msg.role === "rox" && (
      msg.content.includes("youtube") ||
      msg.content.includes("search") ||
      msg.content.includes("file") ||
      msg.content.includes("title") ||
      msg.content.length > 200
    )
  ).slice(-20); // Keep last 20 important responses
  
  for (const msg of importantMessages) {
    const category = detectCategory(msg.content);
    const itemId = `transcript_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    
    items.push({
      id: itemId,
      category,
      tags: extractTags(msg.content),
      content: msg.content.slice(0, 1000),
      context: "Important assistant response",
      confidence: 0.6,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      references: [],
      metadata: { source: "transcript" },
    });
  }
}

// ─── Index Building ────────────────────────────────────────────────────────────

async function buildIndex(): Promise<MemoryIndex> {
  let items: MemoryItem[] = [];
  try {
    const raw = await readFile(MEMORY_ITEMS_PATH, "utf8");
    items = JSON.parse(raw);
  } catch {}
  
  const categories: Record<MemoryCategory, number> = {
    youtube: 0,
    content: 0,
    code: 0,
    media: 0,
    research: 0,
    general: 0,
    skills: 0,
    preferences: 0,
  };
  
  const tags: Record<string, number> = {};
  
  for (const item of items) {
    categories[item.category]++;
    
    for (const tag of item.tags) {
      tags[tag] = (tags[tag] ?? 0) + 1;
    }
  }
  
  const index: MemoryIndex = {
    version: "1.0",
    lastUpdated: new Date().toISOString(),
    totalItems: items.length,
    categories,
    tags,
  };
  
  await writeFile(MEMORY_INDEX_PATH, JSON.stringify(index, null, 2));
  return index;
}

// ─── Add Memory ────────────────────────────────────────────────────────────────

export async function addMemory(params: {
  content: string;
  category?: MemoryCategory;
  tags?: string[];
  context?: string;
  references?: string[];
  metadata?: Record<string, unknown>;
}): Promise<{ id: string; category: MemoryCategory }> {
  let items: MemoryItem[] = [];
  try {
    const raw = await readFile(MEMORY_ITEMS_PATH, "utf8");
    items = JSON.parse(raw);
  } catch {}
  
  const category = params.category || detectCategory(params.content);
  const tags = params.tags || extractTags(params.content);
  
  const item: MemoryItem = {
    id: `mem_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    category,
    tags: [...new Set(tags)].slice(0, 15),
    content: params.content.slice(0, 2000),
    context: params.context,
    confidence: 0.8,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    references: params.references || [],
    metadata: params.metadata,
  };
  
  // Link to related items
  const related = await findRelated(item, items);
  item.references = related.map((r) => r.id).slice(0, 5);
  
  items.push(item);
  items = items.slice(-500); // Keep max 500 items
  
  await writeFile(MEMORY_ITEMS_PATH, JSON.stringify(items, null, 2));
  await buildIndex();
  
  return { id: item.id, category };
}

// ─── Query Memory ──────────────────────────────────────────────────────────────

export async function queryMemory(params: {
  query: string;
  category?: MemoryCategory;
  limit?: number;
  minConfidence?: number;
}): Promise<{ items: MemoryItem[]; total: number }> {
  let items: MemoryItem[] = [];
  try {
    const raw = await readFile(MEMORY_ITEMS_PATH, "utf8");
    items = JSON.parse(raw);
  } catch {
    return { items: [], total: 0 };
  }
  
  const queryTokens = extractTags(params.query);
  const limit = params.limit ?? 10;
  const minConfidence = params.minConfidence ?? 0.3;
  
  // Score each item
  const scored = items.map((item) => {
    let score = 0;
    
    // Category match bonus
    if (params.category && item.category === params.category) {
      score += 5;
    }
    
    // Tag overlap
    const itemTags = new Set(item.tags);
    for (const token of queryTokens) {
      if (itemTags.has(token)) score += 2;
    }
    
    // Content similarity
    const itemText = `${item.content} ${item.context ?? ''} ${item.tags.join(' ')}`.toLowerCase();
    for (const token of queryTokens) {
      if (itemText.includes(token.toLowerCase())) score += 1;
    }
    
    // Confidence boost
    score *= item.confidence;
    
    return { item, score };
  });
  
  // Filter and sort
  const results = scored
    .filter(({ score }) => score >= minConfidence)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ item }) => item);
  
  return { items: results, total: scored.length };
}

// ─── Get Memory ────────────────────────────────────────────────────────────────

export async function getMemory(params: {
  category?: MemoryCategory;
  limit?: number;
  sortBy?: "newest" | "confidence" | "category";
}): Promise<MemoryItem[]> {
  let items: MemoryItem[] = [];
  try {
    const raw = await readFile(MEMORY_ITEMS_PATH, "utf8");
    items = JSON.parse(raw);
  } catch {
    return [];
  }
  
  if (params.category) {
    items = items.filter((i) => i.category === params.category);
  }
  
  if (params.sortBy === "newest") {
    items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } else if (params.sortBy === "confidence") {
    items.sort((a, b) => b.confidence - a.confidence);
  } else if (params.sortBy === "category") {
    items.sort((a, b) => a.category.localeCompare(b.category));
  }
  
  return items.slice(0, params.limit ?? 50);
}

// ─── Stats ─────────────────────────────────────────────────────────────────────

export async function getMemoryStats(): Promise<{
  index: MemoryIndex;
  topTags: Array<{ tag: string; count: number }>;
  recentActivity: Array<{ category: string; count: number; lastUpdated: string }>;
}> {
  const index = await loadJSON<MemoryIndex>(MEMORY_INDEX_PATH, {
    version: "1.0",
    lastUpdated: new Date().toISOString(),
    totalItems: 0,
    categories: {
      youtube: 0, content: 0, code: 0, media: 0,
      research: 0, general: 0, skills: 0, preferences: 0,
    },
    tags: {},
  });
  
  // Top tags
  const topTags = Object.entries(index.tags)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 20)
    .map(([tag, count]) => ({ tag, count }));
  
  // Recent activity by category
  let items: MemoryItem[] = [];
  try {
    const raw = await readFile(MEMORY_ITEMS_PATH, "utf8");
    items = JSON.parse(raw);
  } catch {}
  
  const lastHour = Date.now() - 3600000;
  const recentByCategory: Record<string, { count: number; lastUpdated: string }> = {};
  
  for (const item of items) {
    const time = new Date(item.updatedAt).getTime();
    if (time > lastHour) {
      if (!recentByCategory[item.category]) {
        recentByCategory[item.category] = { count: 0, lastUpdated: item.updatedAt };
      }
      recentByCategory[item.category].count++;
      if (time > new Date(recentByCategory[item.category].lastUpdated).getTime()) {
        recentByCategory[item.category].lastUpdated = item.updatedAt;
      }
    }
  }
  
  const recentActivity = Object.entries(recentByCategory)
    .map(([category, data]) => ({ category, ...data }))
    .sort((a, b) => b.count - a.count);
  
  return { index, topTags, recentActivity };
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function detectCategory(text: string): MemoryCategory {
  const lower = text.toLowerCase();
  
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lower.includes(keyword)) return category as MemoryCategory;
    }
  }
  
  return "general";
}

function extractTags(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && w.length < 30)
    .filter((w) => !["about", "their", "there", "through", "another"].includes(w));
}

async function findRelated(item: MemoryItem, allItems: MemoryItem[]): Promise<MemoryItem[]> {
  const related: Array<{ item: MemoryItem; score: number }> = [];
  
  for (const other of allItems) {
    if (other.id === item.id) continue;
    
    // Same category
    let score = other.category === item.category ? 3 : 0;
    
    // Shared tags
    const sharedTags = item.tags.filter((t) => other.tags.includes(t));
    score += sharedTags.length * 2;
    
    // References overlap
    if (other.references?.includes(item.id)) score += 5;
    
    if (score > 0) {
      related.push({ item: other, score });
    }
  }
  
  return related.sort((a, b) => b.score - a.score).map(({ item }) => item);
}

async function loadJSON<T>(filePath: string, fallback: T): Promise<T> {
  try {
    const raw = await readFile(filePath, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

// ─── CLI Entry Point ───────────────────────────────────────────────────────────

if (typeof process !== "undefined" && process.argv[1]?.includes("memory-org")) {
  initMemory()
    .then(async ({ migrated, index }) => {
      console.log("✅ Memory Organization Complete");
      console.log(`   Total items: ${index.totalItems}`);
      console.log(`   Migrated lessons: ${migrated}`);
      console.log("\n📊 Categories:");
      for (const [cat, count] of Object.entries(index.categories)) {
        if (count > 0) console.log(`   ${cat}: ${count}`);
      }
      console.log("\n🏷️  Top Tags:");
      const tags = Object.entries(index.tags)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10);
      for (const [tag, count] of tags) {
        console.log(`   ${tag}: ${count}`);
      }
    })
    .catch(console.error);
}
