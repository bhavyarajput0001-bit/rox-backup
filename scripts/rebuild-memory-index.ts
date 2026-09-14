import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const DATA_DIR = path.join(process.cwd(), ".rox-data");
const MEMORY_ITEMS_PATH = path.join(DATA_DIR, "memory_items.json");
const MEMORY_INDEX_PATH = path.join(DATA_DIR, "memory_index.json");

type MemoryItem = {
  id: string;
  category: string;
  tags: string[];
  content: string;
  context?: string;
  confidence: number;
  createdAt: string;
  updatedAt: string;
  references?: string[];
  metadata?: Record<string, unknown>;
};

type MemoryIndex = {
  version: string;
  lastUpdated: string;
  totalItems: number;
  categories: Record<string, number>;
  tags: Record<string, number>;
};

async function loadJSON<T>(filePath: string, fallback: T): Promise<T> {
  try {
    const raw = await readFile(filePath, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function rebuildIndex(): Promise<MemoryIndex> {
  let items: MemoryItem[] = [];
  try {
    const raw = await readFile(MEMORY_ITEMS_PATH, "utf8");
    items = JSON.parse(raw);
  } catch {
    // No items yet
  }
  
  const categories: Record<string, number> = {};
  const tags: Record<string, number> = {};
  
  for (const item of items) {
    // Count categories
    categories[item.category] = (categories[item.category] ?? 0) + 1;
    
    // Count tags
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

// Run migration
console.log("Rebuilding memory index...");
const index = await rebuildIndex();
console.log("✅ Index rebuilt:");
console.log(`   Total items: ${index.totalItems}`);
console.log(`   Categories: ${Object.entries(index.categories).filter(([, c]) => c > 0).map(([k]) => k).join(", ") || "none"}`);
console.log(`   Top tags: ${Object.entries(index.tags).sort(([, a], [, b]) => b - a).slice(0, 10).map(([t]) => t).join(", ") || "none"}`);
