const { execSync } = require("child_process");
const fs = require("fs").promises;
const path = require("path");

const CONFIG = {
  repoRoot: path.join(process.cwd(), "self_improvement"),
  registryPath: path.join(process.cwd(), ".rox-data", "repo_registry.json"),
  graftBin: "graft",
};

async function loadRegistry() {
  try {
    const raw = await fs.readFile(CONFIG.registryPath, "utf8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function saveRegistry(registry) {
  await fs.mkdir(path.dirname(CONFIG.registryPath), { recursive: true });
  await fs.writeFile(
    CONFIG.registryPath,
    JSON.stringify(registry, null, 2),
    "utf8",
  );
}

async function buildGraft(repoPath) {
  try {
    const output = execSync(`${CONFIG.graftBin} build --quiet`, {
      cwd: repoPath,
      encoding: "utf8",
      maxBuffer: 1_000_000,
    });
    return { ok: true, output: output.trim() };
  } catch (error) {
    return { ok: false, output: `Graft build failed: ${error.message}` };
  }
}

async function discoverTools(repoPath) {
  const tools = [];
  const entries = await fs.readdir(repoPath, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      const searchDirs = [path.join(repoPath, "tools"), repoPath];
      for (const searchDir of searchDirs) {
        try {
          const files = await fs.readdir(searchDir, { withFileTypes: true });
          for (const file of files) {
            if (
              file.isFile() &&
              (file.name.endsWith(".mcp.js") || file.name.startsWith("mcp-"))
            ) {
              tools.push({ name: file.name, description: "MCP tool found" });
            }
          }
        } catch {}
      }
    }
  }
  return tools;
}

async function processRepo(repoPath) {
  const name = path.basename(repoPath);
  const info = {
    name,
    path: repoPath,
    discoveredAt: new Date().toISOString(),
    lastBuild: "never",
    tools: [],
    graftStatus: "idle",
  };

  const graftResult = await buildGraft(repoPath);
  info.graftStatus = graftResult.ok ? "ready" : "error";
  info.lastBuild = new Date().toISOString();

  if (graftResult.ok) {
    const tools = await discoverTools(repoPath);
    info.tools = tools;
  }

  return info;
}

export async function auto_repo_wiring() {
  const registry = await loadRegistry();
  const existingNames = new Set(Object.keys(registry));
  let allRepos = [];

  try {
    const entries = await fs.readdir(CONFIG.repoRoot, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory() && !entry.name.startsWith(".")) {
        allRepos.push(path.join(CONFIG.repoRoot, entry.name));
      }
    }
  } catch {}

  const results = [];
  for (const repoPath of allRepos) {
    const name = path.basename(repoPath);
    if (existingNames.has(name)) continue;
    try {
      const info = await processRepo(repoPath);
      registry[name] = info;
      results.push(info);
      console.log(`✅ Discovered and wired: ${name}`);
    } catch (error) {
      console.error(`❌ Failed to process ${name}:`, error);
      registry[name] = {
        name,
        path: repoPath,
        discoveredAt: new Date().toISOString(),
        lastBuild: "failed",
        tools: [],
        graftStatus: "error",
      };
    }
  }

  await saveRegistry(registry);

  console.log(
    `🔧 Auto-wired ${results.length} repos: ${results.map((r) => r.name).join(", ")}`,
  );

  return { processed: results.length, total: allRepos.length, registry };
}

export async function list_repos() {
  const registry = await loadRegistry();
  const lines = ["Discovered Repos:"];
  for (const [name, info] of Object.entries(registry).sort(([a], [b]) =>
    a.localeCompare(b),
  )) {
    const status =
      info.graftStatus === "ready"
        ? "✅"
        : info.graftStatus === "error"
          ? "❌"
          : "⏳";
    const tools = info.tools.length ? ` (${info.tools.length} tools)` : "";
    lines.push(`  ${status} ${name}${tools}`);
    if (info.lastBuild !== "never") {
      lines.push(
        `    📅 Last built: ${new Date(info.lastBuild).toLocaleString()}`,
      );
    }
  }
  return lines.join("\n");
}

export async function rewire_repos() {
  console.log("Re-wiring all repos...");
  await auto_repo_wiring();
  console.log("Done.");
}

// Run on import if called directly
if (require.main === module) {
  auto_repo_wiring().catch(console.error);
}
