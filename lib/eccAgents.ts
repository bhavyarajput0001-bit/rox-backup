/**
 * ECC Agent Loader
 * 
 * Scans ~/ECC/agents/*.md and builds a unified agent registry.
 * Each agent has frontmatter with name, description, tools, model.
 * 
 * Usage:
 *   import { loadECCAgents, routeToECCAgent } from "@/lib/eccAgents";
 */

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { execSync } from "node:child_process";

export type ECCAgent = {
  id: string;
  name: string;
  description: string;
  tools: string[];
  model: string;
  prompt: string;
  category: string;
  whenToUse: string;
};

export type ECCAgentRegistry = {
  agents: ECCAgent[];
  categories: Record<string, ECCAgent[]>;
  totalAgents: number;
  lastScanned: string;
};

const ECC_AGENTS_DIR = "/Users/bhavyarajput/ECC/agents";
const CACHE_PATH = "/Users/bhavyarajput/Downloads/Rox/.rox-data/ecc_agents.json";

// ─── Loading ───────────────────────────────────────────────────────────────────

export async function loadECCAgents(): Promise<ECCAgentRegistry> {
  // Check cache first
  try {
    const cached = await readFile(CACHE_PATH, "utf8");
    const data = JSON.parse(cached) as ECCAgentRegistry;
    // Refresh if older than 1 hour
    if (Date.now() - new Date(data.lastScanned).getTime() < 3600000) {
      return data;
    }
  } catch {
    // No cache
  }

  const agents: ECCAgent[] = [];
  const categories: Record<string, ECCAgent[]> = {};

  try {
    const files = await readdir(ECC_AGENTS_DIR);
    const mdFiles = files.filter((f) => f.endsWith(".md"));

    for (const file of mdFiles) {
      try {
        const content = await readFile(path.join(ECC_AGENTS_DIR, file), "utf8");
        const agent = parseAgentFile(file, content);
        if (agent) {
          agents.push(agent);
          
          // Categorize
          const cat = detectCategory(agent.name);
          if (!categories[cat]) categories[cat] = [];
          categories[cat].push(agent);
        }
      } catch (e) {
        console.error(`Failed to parse ${file}:`, e);
      }
    }
  } catch (e) {
    console.error("Failed to scan ECC agents dir:", e);
  }

  const registry: ECCAgentRegistry = {
    agents,
    categories,
    totalAgents: agents.length,
    lastScanned: new Date().toISOString(),
  };

  // Cache
  try {
    await require("node:fs").promises.writeFile(CACHE_PATH, JSON.stringify(registry, null, 2));
  } catch {
    // Ignore cache errors
  }

  return registry;
}

function parseAgentFile(filename: string, content: string): ECCAgent | null {
  // Parse frontmatter
  if (!content.startsWith("---")) return null;
  
  const end = content.indexOf("---", 3);
  if (end === -1) return null;
  
  const fm = content.slice(3, end);
  const body = content.slice(end + 3).trim();
  
  const name = extractFrontmatter(fm, "name") || filename.replace(".md", "");
  const description = extractFrontmatter(fm, "description") || "";
  const toolsStr = extractFrontmatter(fm, "tools") || "";
  const model = extractFrontmatter(fm, "model") || "auto";
  const whenToUse = extractFrontmatter(fm, "when_to_use") || extractFrontmatter(fm, "when") || description;
  
  const tools = toolsStr.split(",").map((t) => t.trim()).filter(Boolean);
  
  // Extract category from name
  const category = detectCategory(name);
  
  return {
    id: name,
    name,
    description,
    tools,
    model,
    prompt: body.slice(0, 2000), // Truncate long prompts
    category,
    whenToUse,
  };
}

function extractFrontmatter(fm: string, key: string): string | null {
  const match = fm.match(new RegExp(`^${key}:\\s*(.+)$`, "m"));
  return match ? match[1].trim().replace(/^["']|["']$/g, "") : null;
}

function detectCategory(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes("review")) return "review";
  if (lower.includes("build") || lower.includes("resolver")) return "build";
  if (lower.includes("architect")) return "architecture";
  if (lower.includes("security")) return "security";
  if (lower.includes("seo") || lower.includes("marketing")) return "marketing";
  if (lower.includes("test") || lower.includes("tdd")) return "testing";
  if (lower.includes("performance")) return "performance";
  if (lower.includes("refactor") || lower.includes("cleaner") || lower.includes("simplifier")) return "refactor";
  if (lower.includes("docs") || lower.includes("doc")) return "documentation";
  if (lower.includes("scan") || lower.includes("hunter")) return "analysis";
  return "general";
}

// ─── Routing ───────────────────────────────────────────────────────────────────

export async function routeToECCAgent(task: string, preferredCategory?: string): Promise<{
  agent: ECCAgent | null;
  reason: string;
  confidence: number;
}> {
  const registry = await loadECCAgents();
  
  if (registry.agents.length === 0) {
    return { agent: null, reason: "No ECC agents loaded", confidence: 0 };
  }
  
  // If preferred category, filter to that category
  let candidates = registry.agents;
  if (preferredCategory) {
    candidates = registry.categories[preferredCategory] || registry.agents;
  }
  
  // Score each agent by relevance
  const scored = candidates.map((agent) => {
    const score = scoreAgentForTask(agent, task);
    return { agent, score };
  }).sort((a, b) => b.score - a.score);
  
  const best = scored[0];
  
  if (!best || best.score < 0.1) {
    return { agent: null, reason: "No suitable ECC agent found", confidence: 0 };
  }
  
  return {
    agent: best.agent,
    reason: `Matched ${best.agent.name} (${best.score.toFixed(2)} confidence)`,
    confidence: best.score,
  };
}

function scoreAgentForTask(agent: ECCAgent, task: string): number {
  const taskLower = task.toLowerCase();
  let score = 0;
  
  // Name matching
  if (agent.name.toLowerCase().includes(taskLower.slice(0, 10))) score += 0.5;
  
  // Description matching
  const descWords = new Set(agent.description.toLowerCase().split(/\s+/));
  const taskWords = new Set(taskLower.split(/\s+/).filter((w) => w.length > 3));
  let descMatches = 0;
  for (const word of taskWords) {
    if (descWords.has(word)) descMatches++;
  }
  score += (descMatches / Math.max(taskWords.size, 1)) * 0.3;
  
  // Tool matching
  for (const tool of agent.tools) {
    if (taskLower.includes(tool.toLowerCase())) score += 0.1;
  }
  
  return Math.min(score, 1.0);
}

// ─── Execution ─────────────────────────────────────────────────────────────────

export async function executeECCAgent(
  agent: ECCAgent,
  task: string,
  context?: string,
): Promise<{ success: boolean; output: string; latencyMs: number }> {
  const startTime = Date.now();
  
  try {
    // For now, return the agent's prompt + task as a structured response
    // In production, this would route to the appropriate LLM provider
    const response = formatECCResponse(agent, task, context);
    
    return {
      success: true,
      output: response,
      latencyMs: Date.now() - startTime,
    };
  } catch (e) {
    return {
      success: false,
      output: `ECC Agent ${agent.name} failed: ${e}`,
      latencyMs: Date.now() - startTime,
    };
  }
}

function formatECCResponse(agent: ECCAgent, task: string, context?: string): string {
  return `## ${agent.name} Agent\n\n**Role:** ${agent.description}\n\n**Task:** ${task}\n\n${context ? `**Context:**\n\`\`\`\n${context}\n\`\`\`\n\n` : ""}**Agent Instructions:**\n${agent.prompt}`;
}

// ─── Stats ─────────────────────────────────────────────────────────────────────

export async function getECCStats(): Promise<{
  totalAgents: number;
  categories: Record<string, number>;
  lastScanned: string;
}> {
  const registry = await loadECCAgents();
  const categories: Record<string, number> = {};
  for (const agents of Object.values(registry.categories)) {
    categories[agents[0]?.category || "unknown"] = agents.length;
  }
  
  return {
    totalAgents: registry.totalAgents,
    categories,
    lastScanned: registry.lastScanned,
  };
}
