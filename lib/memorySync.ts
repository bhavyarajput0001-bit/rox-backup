/**
 * Memory Sync System
 * 
 * Auto-syncs Rox's memory with:
 * - ~/shared-agent-memory/ (Obsidian vault)
 * - ~/Projects/agent-hub/ (cross-agent packets)
 * - ~/.rox-data/ (local cache)
 */

import { readdir, readFile, writeFile, mkdir, copyFile } from "node:fs/promises";
import path from "node:path";
import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

const SHARED_MEMORY_DIR = "/Users/bhavyarajput/shared-agent-memory";
const AGENT_HUB_DIR = "/Users/bhavyarajput/Projects/agent-hub";
const ROX_DATA_DIR = "/Users/bhavyarajput/Downloads/Rox/.rox-data";
const MEMORY_FILE = path.join(ROX_DATA_DIR, "memory.json");
const LESSONS_FILE = path.join(ROX_DATA_DIR, "lessons.json");
const DEPT_STATS_FILE = path.join(ROX_DATA_DIR, "departments.json");

export type SyncResult = {
  success: boolean;
  syncedAt: string;
  memoriesLoaded: number;
  lessonsLoaded: number;
  hubPacketsLoaded: number;
  errors: string[];
};

export async function syncMemory(): Promise<SyncResult> {
  const errors: string[] = [];
  let memoriesLoaded = 0;
  let lessonsLoaded = 0;
  let hubPacketsLoaded = 0;

  // 1. Load from shared agent memory
  try {
    const memData = await loadFromSharedMemory();
    memoriesLoaded = memData.count;
  } catch (e) {
    errors.push(`Shared memory load failed: ${e}`);
  }

  // 2. Load from agent hub
  try {
    const hubData = await loadFromAgentHub();
    hubPacketsLoaded = hubData.count;
  } catch (e) {
    errors.push(`Agent hub load failed: ${e}`);
  }

  // 3. Load local lessons
  try {
    lessonsLoaded = await loadLessons();
  } catch (e) {
    errors.push(`Lessons load failed: ${e}`);
  }

  // 4. Ensure directory exists
  await mkdir(ROX_DATA_DIR, { recursive: true });

  return {
    success: errors.length === 0,
    syncedAt: new Date().toISOString(),
    memoriesLoaded,
    lessonsLoaded,
    hubPacketsLoaded,
    errors,
  };
}

async function loadFromSharedMemory(): Promise<{ count: number }> {
  const count = 0; // Placeholder - would read from Obsidian vault
  
  // Check if vault exists
  const vaultPath = path.join(SHARED_MEMORY_DIR, "obsidian-vault");
  try {
    await readdir(vaultPath);
    // Could sync markdown files here
  } catch {
    // No vault yet
  }
  
  return { count };
}

async function loadFromAgentHub(): Promise<{ count: number }> {
  try {
    const statePath = path.join(AGENT_HUB_DIR, "STATE.md");
    const content = await readFile(statePath, "utf8");
    
    // Parse active agents
    const activeAgents = content.match(/active_agents:\s*(.+)/)?.[1] || "";
    
    // Count packets
    const packetsDir = path.join(AGENT_HUB_DIR, "packets");
    try {
      const packets = await readdir(packetsDir);
      return { count: packets.filter((p) => p.endsWith(".zip")).length };
    } catch {
      return { count: 0 };
    }
  } catch {
    return { count: 0 };
  }
}

async function loadLessons(): Promise<number> {
  try {
    const raw = await readFile(LESSONS_FILE, "utf8");
    const lessons = JSON.parse(raw);
    return Array.isArray(lessons) ? lessons.length : 0;
  } catch {
    return 0;
  }
}

export async function syncToSharedMemory(task: string, result: string, success: boolean): Promise<void> {
  // Write to local lessons
  try {
    await mkdir(ROX_DATA_DIR, { recursive: true });
    const lessons = await loadLessonsData();
    lessons.push({
      task,
      result,
      success,
      timestamp: new Date().toISOString(),
      source: "rox",
    });
    // Keep last 1000 lessons
    await writeFile(LESSONS_FILE, JSON.stringify(lessons.slice(-1000), null, 2));
  } catch (e) {
    console.error("Failed to sync lesson:", e);
  }

  // Optionally sync to agent hub
  try {
    const packetPath = path.join(AGENT_HUB_DIR, "packets");
    await mkdir(packetPath, { recursive: true });
    // Could write daily packets here
  } catch {
    // Ignore
  }
}

async function loadLessonsData(): Promise<Array<{task: string; result: string; success: boolean; timestamp: string; source: string}>> {
  try {
    const raw = await readFile(LESSONS_FILE, "utf8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export async function getCrossAgentRecall(query: string, limit = 5): Promise<Array<{source: string; content: string; similarity: number}>> {
  const results = [];
  
  // Search shared memory
  try {
    const vaultPath = path.join(SHARED_MEMORY_DIR, "obsidian-vault");
    const files = await readdir(vaultPath);
    for (const file of files.slice(0, 20)) {
      try {
        const content = await readFile(path.join(vaultPath, file), "utf8");
        if (content.toLowerCase().includes(query.toLowerCase())) {
          results.push({
            source: "shared-memory",
            content: content.slice(0, 500),
            similarity: 0.8,
          });
        }
      } catch {}
    }
  } catch {
    // No vault
  }
  
  // Search lessons
  try {
    const lessons = await loadLessonsData();
    for (const lesson of lessons) {
      if (lesson.task.toLowerCase().includes(query.toLowerCase()) ||
          lesson.result.toLowerCase().includes(query.toLowerCase())) {
        results.push({
          source: "lessons",
          content: `${lesson.task} → ${lesson.result}`,
          similarity: 0.7,
        });
      }
    }
  } catch {}
  
  return results
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);
}
