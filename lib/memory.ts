import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { AssistantTurn } from "@/lib/assistant";

const MEMORY_PATH = path.join(process.cwd(), ".rox-data", "memory.json");
const MAX_MEMORY_TURNS = 100;
let memoryQueue = Promise.resolve();

async function loadMemory(): Promise<AssistantTurn[]> {
  try {
    return JSON.parse(await readFile(MEMORY_PATH, "utf8")) as AssistantTurn[];
  } catch {
    return [];
  }
}

export async function recentMemory(limit = 8) {
  return (await loadMemory()).slice(-limit);
}

export async function remember(turns: AssistantTurn[]) {
  memoryQueue = memoryQueue.then(async () => {
    const current = await loadMemory();
    const next = [...current, ...turns].slice(-MAX_MEMORY_TURNS);
    await mkdir(path.dirname(MEMORY_PATH), { recursive: true });
    await writeFile(MEMORY_PATH, JSON.stringify(next), "utf8");
  });
  await memoryQueue;
}