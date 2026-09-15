import { readdir, readFile, access } from "node:fs/promises";
import path from "node:path";
import os from "node:os";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SkillFrontmatter {
  name?: string;
  description?: string;
  version?: string;
  author?: string;
  license?: string;
  platforms?: string[];
  tags?: string[];
  category?: string;
  metadata?: Record<string, unknown>;
}

export interface SkillEntry {
  /** Relative path from ~/.hermes/skills/ (e.g. "software-development/rox-orchestration") */
  slug: string;
  /** Full filesystem path to the SKILL.md file */
  path: string;
  frontmatter: SkillFrontmatter;
  body: string;
  /** Flattened keyword index for fast searching */
  keywords: string[];
}

export interface SkillScoreResult extends SkillEntry {
  score: number;
}

// ---------------------------------------------------------------------------
// Lightweight YAML frontmatter parser
// ---------------------------------------------------------------------------

function parseFrontmatter(raw: string): { frontmatter: SkillFrontmatter; body: string } {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { frontmatter: {}, body: raw };
  const fmRaw = match[1];
  const body = match[2];
  const fm: SkillFrontmatter = {};
  // Simple line-by-line parser (handles most SKILL.md frontmatter)
  const lines = fmRaw.split("\n");
  let currentKey = "";
  let currentArr: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const kvMatch = trimmed.match(/^(\w+):\s*(.*)$/);
    if (kvMatch) {
      // Flush previous array if any
      if (currentKey && currentArr.length) {
        (fm as Record<string, unknown>)[currentKey] = currentArr;
        currentArr = [];
      }
      currentKey = kvMatch[1];
      const val = kvMatch[2].trim();
      if (val.startsWith("[") && val.endsWith("]")) {
        // Inline array
        const inner = val.slice(1, -1);
        (fm as Record<string, unknown>)[currentKey] = inner
          .split(",")
          .map((s) => s.trim().replace(/^["']|["']$/g, ""))
          .filter(Boolean);
        currentKey = "";
      } else if (val.startsWith('"') && val.endsWith('"')) {
        (fm as Record<string, unknown>)[currentKey] = val.slice(1, -1);
        currentKey = "";
      } else if (val.startsWith("'") && val.endsWith("'")) {
        (fm as Record<string, unknown>)[currentKey] = val.slice(1, -1);
        currentKey = "";
      } else {
        // Multi-line value — start collecting
        if (val) {
          (fm as Record<string, unknown>)[currentKey] = val;
          currentKey = "";
        } else {
          currentArr = [];
        }
      }
    } else if (currentKey && trimmed) {
      // Continuation line (indented or bare)
      currentArr.push(trimmed.replace(/^["']|["']$/g, "").trim());
    }
  }
  // Flush last array
  if (currentKey && currentArr.length) {
    (fm as Record<string, unknown>)[currentKey] = currentArr;
  }
  return { frontmatter: fm, body };
}

// ---------------------------------------------------------------------------
// Keyword extraction
// ---------------------------------------------------------------------------

const STOPWORDS = new Set([
  "the", "and", "for", "you", "your", "can", "with", "that", "this",
  "from", "have", "are", "was", "were", "will", "would", "could",
  "should", "what", "when", "where", "which", "there", "here", "about",
  "into", "them", "they", "please", "tell", "show", "give", "make",
  "want", "need", "open", "status", "build", "use", "when", "how",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s+]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));
}

// ---------------------------------------------------------------------------
// Skills index
// ---------------------------------------------------------------------------

let _index: SkillEntry[] | null = null;
let _indexPromise: Promise<SkillEntry[]> | null = null;

async function loadIndex(): Promise<SkillEntry[]> {
  if (_index) return _index;
  if (_indexPromise) return _indexPromise;
  _indexPromise = (async () => {
    const skillsRoot = path.join(os.homedir(), ".hermes", "skills");
    const entries: SkillEntry[] = [];
    try {
      await access(skillsRoot);
    } catch {
      return entries;
    }
    async function walk(dir: string, relativePrefix: string): Promise<void> {
      try {
        const items = await readdir(dir, { withFileTypes: true });
        for (const item of items) {
          const fullPath = path.join(dir, item.name);
          const rel = relativePrefix ? `${relativePrefix}/${item.name}` : item.name;
          if (item.isDirectory()) {
            // Look for SKILL.md in this dir or subdirs
            const skillMd = path.join(fullPath, "SKILL.md");
            try {
              await access(skillMd);
              const raw = await readFile(skillMd, "utf8");
              const { frontmatter, body } = parseFrontmatter(raw);
              const slug = relativePrefix
                ? `${relativePrefix}/${item.name}`
                : item.name;
              const keywords = [
                ...new Set([
                  ...tokenize(frontmatter.name ?? ""),
                  ...tokenize(frontmatter.description ?? ""),
                  ...(frontmatter.tags ?? []),
                  ...tokenize(body.slice(0, 500)),
                ]),
              ];
              entries.push({ slug, path: skillMd, frontmatter, body, keywords });
            } catch {
              // Not a skill dir — recurse deeper
              await walk(fullPath, rel);
            }
          }
        }
      } catch { /* ignore permission errors */ }
    }
    await walk(skillsRoot, "");
    _index = entries;
    _indexPromise = null;
    return entries;
  })();
  return _indexPromise;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Get all loaded skills (warms the index on first call). */
export async function getAllSkills(): Promise<SkillEntry[]> {
  return loadIndex();
}

/**
 * Find skills relevant to a query, scored by keyword overlap.
 * Returns up to `limit` results sorted by descending score.
 */
export function findRelevantSkills(query: string, limit = 5): Promise<SkillScoreResult[]> {
  return loadIndex().then((skills) => {
    if (!query.trim()) return skills.map((s) => ({ ...s, score: 0 })).slice(0, limit);
    const queryTokens = new Set(tokenize(query));
    if (!queryTokens.size) return skills.slice(0, limit).map((s) => ({ ...s, score: 0 }));
    const scored = skills
      .map((skill) => {
        const skillSet = new Set(skill.keywords);
        let score = 0;
        for (const t of queryTokens) {
          if (skillSet.has(t)) score += 2;
        }
        // Boost if query tokens appear in name or description (exact match)
        const searchable = `${skill.frontmatter.name ?? ""} ${skill.frontmatter.description ?? ""}`.toLowerCase();
        for (const t of queryTokens) {
          if (searchable.includes(t)) score += 3;
        }
        return { ...skill, score };
      })
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
    return scored;
  });
}

/** Load a single skill by slug and return its full content. */
export async function loadSkill(slug: string): Promise<SkillEntry | null> {
  const skills = await loadIndex();
  return skills.find((s) => s.slug === slug || s.slug.endsWith(`/${slug}`)) ?? null;
}

/** Return a compact index summary suitable for system prompt injection. */
export async function buildSkillIndexSummary(): Promise<string> {
  const skills = await loadIndex();
  return skills
    .map((s) => `- ${s.slug}: ${s.frontmatter.description ?? "(no description)"}`)
    .join("\n") || "(no skills found)";
}
