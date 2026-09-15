# Auto-Wiring Pattern

Automatic discovery and registration of tools from external repos.

## Directory Structure

```
~/Downloads/Rox/
├── self_improvement/
│   ├── OpenMontage/
│   ├── CodebaseMemoryMCP/
│   └── AgencyAgents/
├── lib/skills/auto-repo-wiring.ts
└── .rox-data/
    ├── repo_registry.json
    └── lessons.json
```

## Registry Format

```json
{
  "OpenMontage": {
    "name": "OpenMontage",
    "path": "/Users/bhavyarajput/Downloads/Rox/self_improvement/OpenMontage",
    "discoveredAt": "2026-09-14T16:31:26.313Z",
    "lastBuild": "2026-09-14T16:33:00.000Z",
    "tools": [],
    "graftStatus": "ready"
  }
}
```

## Discovery Flow

1. **Scan** `self_improvement/` for subdirectories
2. **Skip** if already in registry
3. **Build** Graft graph for new repos
4. **Discover** MCP tools (_.mcp.js, mcp-_ files)
5. **Register** tools via `tool_describe`
6. **Log** lesson in memory

## Status Values

- `idle` — not yet processed
- `building` — graft build in progress
- `ready` — graph built successfully
- `error` — build failed

## Manual Rebuild

If registry shows `error` but graph exists:

```bash
cd ~/Downloads/Rox/self_improvement/<repo>
node ../../node_modules/.bin/graft build
```

Then update registry manually to `"graftStatus": "ready"`.
