# Rox Brain Enhancement Plan
## What's Available & How to Wire It Into a Self-Learning System

---

## 1. EXISTING ASSETS (Already Built in Rox)

### 1.1 Multi-Agent System (`lib/agents/multiAgent.ts` - 740 lines)
**Status**: Already coded but NOT wired into roxAgent.ts
- **5 Departments**: content, code, media, research, youtube
- **Self-rewiring**: Tracks success rates per department, auto-rewires on failure (>30s or failure)
- **Task tracking**: `task_results.json` with latency, success, output
- **Department registry**: `departments.json` with lessonsLearned, tasksCompleted, successRate

**How to wire it**: Replace the simple `toolRunners` routing with `executeTask()` from multiAgent.ts

### 1.2 Graft Context Graph (`lib/skills/references/`)
**Status**: Installed but NOT connected
- Builds codebase knowledge graph for fast recall
- Commands: `graft build`, `graft check`
- Skills: `auto-wiring-pattern.md`, `tool-schema-guide.md`

**How to wire it**: Add as tool in roxAgent.ts, run automatically before complex tasks

### 1.3 YouTube Local Commands (`lib/youtubeCommands.ts`)
**Status**: ✅ Working
- 16 commands via FreeLLM, no API needed
- Already wired into roxAgent.ts `youtube` tool

---

## 2. ECOSYSTEM ASSETS (Ready to Integrate)

### 2.1 ECC — 68 Specialized Agents
**Location**: `~/ECC/agents/`
**Potential**: Each agent is a markdown file with frontmatter (name, description, when_to_use)
**Integration approach**: Load as skill prompts, route to appropriate agent based on task

| Category | Count | Agents |
|----------|-------|--------|
| Code Review | 20+ | python-reviewer, rust-reviewer, typescript-reviewer, etc. |
| Build Resolver | 15+ | java-build-resolver, go-build-resolver, swift-build-resolver |
| Architecture | 5+ | architect, a11y-architect, network-architect |
| Security | 3+ | security-reviewer, silent-failure-hunter |
| SEO/Marketing | 2+ | seo-specialist, marketing-agent |

### 2.2 DeepSeek Harness
**Location**: `~/deepseek-harness/`
**Version**: 0.1.5-alpha.1
**Potential**: Plugin architecture, web UI at :3080, can be a fallback agent

### 2.3 Agent Hub (Shared Memory)
**Location**: `~/Projects/agent-hub/`
**Components**:
- `dashboard/` - Live sync dashboard
- `tools/` - agents_parallel.sh, live_sync.py, pack_sessions.py
- `packets/` - Session memory archives (224 sessions from hermes)

### 2.4 Shared Agent Memory
**Location**: `~/shared-agent-memory/`
**Files**:
- `hermes_memory_Index.md` - Master index
- `hermes_memory_AI_Models.md` - Provider info
- `hermes_memory_Skills_Index.md` - Skills catalog
- `hermes_memory_Development_Standards.md` - Coding standards
- `obsidian-vault/` - Full Obsidian notes

### 2.5 FreeLLM + Omniroute
**Status**: ✅ Running
- FreeLLM: `localhost:31415` (12 models, auto-routing)
- Omniroute: `localhost:20128` (best-coding model)

---

## 3. SELF-LEARNING ARCHITECTURE

### Current State
```
User → Rox UI → roxAgent.ts → [tool selection] → LLM (Omniroute/FreeLLM)
                              ↓
                    Tool execution (shell, files, search, youtube)
                              ↓
                    remember() → memory.json (flat list)
```

### Target State (Self-Learning Brain)
```
User → Rox UI → roxAgent.ts → [intent classification]
                              ↓
                    Multi-Agent Router (multiAgent.ts)
                              ↓
                    Department Selection (content/code/media/research/youtube)
                              ↓
                    Department Agent + ECC Specialist Routing
                              ↓
                    Tool Execution (shell, files, search, youtube, graft)
                              ↓
                    Result Analysis → Success Rate Tracking
                              ↓
                    Learn & Rewire → Update department stats
                              ↓
                    Store in Shared Memory (Obsidian + JSON)
                              ↓
                    Auto-graft codebase for future recall
```

---

## 4. IMPLEMENTATION PLAN

### Phase 1: Wire Multi-Agent System (15 min)
**File**: `lib/roxAgent.ts`
**Changes**:
1. Import `executeTask` from `./agents/multiAgent`
2. Replace simple tool routing with department-aware routing
3. Add success/failure tracking per task type
4. Auto-learn from outcomes

### Phase 2: Integrate ECC Agents (20 min)
**File**: `lib/eccAgents.ts` (new)
**Changes**:
1. Scan `~/ECC/agents/*.md` for available agents
2. Build prompt templates from frontmatter
3. Route specialized tasks (code review, security, etc.) to ECC agents
4. Fallback chain: Rox → ECC → FreeLLM

### Phase 3: Connect Agent Hub Memory (10 min)
**File**: `lib/agentHub.ts` (new)
**Changes**:
1. Read `~/shared-agent-memory/` for cross-session learning
2. Write to Obsidian vault for persistent memory
3. Sync with agent-hub dashboard

### Phase 4: Auto-Graft & Context Graph (10 min)
**File**: `lib/graftBridge.ts` (new)
**Changes**:
1. Run `graft build` before complex tasks
2. Inject context from graph into LLM prompts
3. Update graph after code changes

### Phase 5: Self-Rewiring Loop (15 min)
**File**: `lib/rewireEngine.ts` (new)
**Changes**:
1. Track: task → department → success/fail → latency
2. Weekly rewire: promote successful departments, demote failures
3. Generate "lessons learned" reports
4. Auto-suggest new tools/skills based on patterns

---

## 5. QUICK WINS (Do These First)

### 5.1 Enable Multi-Agent Now
```typescript
// In roxAgent.ts, replace this:
const result = await runner(toolCall.name, toolCall.args);

// With this:
const { result, lesson } = await executeTask(
  `use ${toolCall.name}(${JSON.stringify(toolCall.args)})`,
  detectDepartment(toolCall.name)
);
```

### 5.2 Load ECC Agents on Startup
```typescript
// In lib/eccAgents.ts
export const eccAgents = await scanECCAgents("~/ECC/agents/");
// Returns: [{name: "python-reviewer", prompt: "...", when: "..."}]
```

### 5.3 Add Graft to Tool Set
```typescript
// Already in roxAgent.ts as "graft_improve"
// Just need to call it before code tasks
if (needsCodeContext(request)) {
  await runShell("graft build", 30_000);
}
```

---

## 6. MEMORY ARCHITECTURE

### Current
- `~/.rox-data/memory.json` — flat conversation history
- `~/.rox-data/agents/*.json` — department stats (unused)

### Target
- `~/.rox-data/memory.json` — recent conversations (100 turns)
- `~/.rox-data/lessons.json` — learned patterns {task, action, result, success}
- `~/.rox-data/department_stats.json` — success rates per department
- `~/shared-agent-memory/obsidian-vault/` — persistent cross-agent memory
- `~/.graft/` — codebase context graph

---

## 7. READY-TO-USE COMMANDS

Once wired, Rox will understand:
- "Review my Python code" → routes to ECC python-reviewer
- "Check for security issues" → routes to ECC security-reviewer  
- "Build my React app" → routes to ECC react-build-resolver
- "Write a YouTube script about X" → routes to youtube department
- "Analyze this codebase" → runs graft build + analysis

---

## 8. IMPLEMENTATION PRIORITY

1. **NOW**: Wire multiAgent.ts into roxAgent.ts (15 min)
2. **TODAY**: Build ECC agent scanner (20 min)
3. **WEEK**: Add self-rewiring loop (30 min)
4. **FUTURE**: Connect to DeepSeek Harness for heavy reasoning
