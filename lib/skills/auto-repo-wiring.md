name: auto-repo-wiring
version: 1.0
author: Hermes Agent

# Auto-Repo Discovery and Wiring for Rox

# Detects new repos in ~/Downloads/Rox/self_improvement/ and auto-wires them

## When to use

- When Rox starts a new session and there are new repos in `~/Downloads/Rox/self_improvement/`
- When you add a new repo and want Rox to automatically discover and wire it
- When you want Rox to maintain a persistent registry of all discovered repos and their capabilities

## What it does

1. **Repo Discovery** – Scans `~/Downloads/Rox/self_improvement/` for git repos
2. **Graft Graph Build** – Runs `graft build` for each repo to create self‑improvement data
3. **Tool Registration** – Inspects each repo for MCP tools/skills and registers them automatically
4. **Memory Persistence** – Creates a lesson entry for each repo discovery
5. **Registry Management** – Maintains `.rox-data/repo_registry.json` with repo metadata

## How it works

- On first run, it builds the registry from scratch
- On subsequent runs, it diffs against the registry and processes only new/added repos
- For each repo, it:
  - Runs `graft build` (quiet mode, logs progress)
  - Scans for MCP server executables (`mcp-*` or `*.mcp.js`)
  - Loads any found tools via `tool_describe` and registers them in the current session
  - Adds a lesson entry to memory: "Discovered repo X – built Graft graph – registered Y tools"
  - Updates the registry with repo metadata (name, path, last build time, tool count)

## Safety & Guardrails

- Only scans the designated `self_improvement/` folder – no other directories
- Refuses repos with no MCP tools/skills (logs warning but continues)
- Records all actions in memory for auditability
- Uses `tool_call` to register tools safely – no direct file writes to system locations

## Example interactions

**User:** "Make a video about coffee using OpenMontage"
**Rox:** Auto‑detects OpenMontage in registry, loads its tools, replies with a plan using the `youtube` tool and `graft_improve` for context.

**User:** "List all repos I have"
**Rox:** Reads registry and lists discovered repos with their tool counts and last build status.

**User:** "Add a new repo to self‑improvement"
**Rox:** Detects the new repo on next run, wires it automatically, and confirms.

## Dependencies

- `graft` CLI installed globally (`npm install -g @nanonets/graft`)
- Git repos in `~/Downloads/Rox/self_improvement/`
- MCP tools in repo root or `tools/` directory
- Write access to `.rox-data/`
