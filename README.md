# ROX

A futuristic personal AI assistant with an interactive 3D holographic core and multi-agent orchestration.

## 🎯 Features

- **3D Holographic Orb** — Interactive Three.js core with hand-tracking & voice
- **Multi-Agent System** — 5 specialized departments (Content, Code, Media, Research, YouTube)
- **83 Quick Commands** — Instant app launching, system control, YouTube, Spotify, search
- **Native macOS Menu Bar App** — 🤖 icon for one-click access
- **Self-Learning Memory** — Categorized recall with cross-department knowledge
- **Graft Integration** — Auto-wires external repos for continuous improvement
- **Real-time API** — Omniroute + FreeLLM providers with auto-failover

## Architecture

```
rox/
├── app/                    # Next.js 14 app (UI + API routes)
│   ├── api/
│   │   ├── assistant/      # Main AI assistant endpoint
│   │   ├── memory/         # Memory search & management
│   │   └── multi-agent/    # Department orchestration
│   ├── components/
│   │   └── JarvisOrb.tsx   # 3D holographic orb
│   └── lib/
│       ├── quickCommands.ts   # 83 pre-built commands
│       ├── multiAgent.ts      # Department agents
│       ├── memoryOrg.ts       # Structured memory system
│       ├── executor.ts        # Safe shell execution
│       └── onlineTools.ts     # Web search, weather, news
├── apps/
│   ├── web/                # Vite + React frontend (alt)
│   └── server/             # Express API server
├── packages/
│   ├── types/              # Shared TypeScript types
│   └── ui/                 # Zustand store, modules, tools
├── scripts/
│   ├── auto-sync.sh        # Git auto-sync every 30min
│   └── rebuild-memory-index.js
├── self_improvement/       # External repos for learning
│   ├── OpenMontage/
│   ├── CodebaseMemoryMCP/
│   └── AgencyAgents/
├── rox_menubar.py          # 🤖 Native macOS menu bar app
└── .rox-data/              # Persistent memory & lessons
```

## Quick Start

```bash
# Install dependencies
cd ~/Downloads/Rox
npm install

# Start Rox (Next.js on port 3000)
npm run dev
```

Open **http://localhost:3000** in your browser.

## 🤖 Native Menu Bar App

No terminal needed! Run the native macOS menu bar app:

```bash
# Install once
pip3 install rumps requests

# Run (add to login items for auto-start)
python3 rox_menubar.py
```

A **🤖** icon appears in your top menu bar with:
- **Quick Actions**: Open YouTube, Spotify, Terminal, Chrome, VS Code
- **Search Web**: Prompt → instant results via Rox
- **System**: Battery, Time, Status
- **YouTube**: Generate video, script, hashtags, calendar, analytics
- **Spotify**: Play, Pause, Next, Now Playing
- **Dev Controls**: Start/Restart/Stop Rox server
- **Dashboard**: One-click to http://localhost:3000

## Quick Commands (83 total)

Just type in Rox chat or use menu bar:

| Category | Commands |
|----------|----------|
| **Apps** | `open youtube`, `open spotify`, `open terminal`, `open vscode`, `open notes`, `open safari`, `open chrome`, `open slack`, `open discord`, `open calculator`, `open maps`, `open photos`, `open finder`, `open calendar`, `open messages`, `open mail`, `open facetime`, `lock screen`, `sleep`, `screensaver` |
| **YouTube** | `yt status`, `yt jobs`, `yt dashboard`, `yt generate <topic>`, `yt title <topic>`, `yt script <topic>`, `yt ideas`, `yt analytics`, `yt hashtags <topic>`, `yt chapters <topic>`, `yt hook <topic>`, `yt calendar`, `yt compete <channel>` |
| **Spotify** | `spotify play`, `spotify pause`, `spotify next`, `spotify prev`, `spotify volume 50`, `spotify shuffle on`, `spotify repeat one`, `spotify now`, `spotify search <query>`, `spotify queue` |
| **Search** | `search for <query>`, `weather in <city>`, `news`, `time` |
| **System** | `status`, `help`, `screenshot`, `clipboard`, `disk space`, `memory usage`, `cpu`, `battery`, `whoami`, `hostname` |
| **Dev** | `npm run dev`, `npm run build`, `npm install`, `git status`, `git log`, `git diff`, `graft build`, `multi agent status`, `memory status`, `rox rewire`, `rox rebuild memory` |
| **Files** | `ls in <path>`, `read <file>`, `create file <name>`, `grep <pattern>` |

## API Endpoints

```bash
# Health check
curl http://localhost:3000/api/assistant

# Quick command
curl -X POST http://localhost:3000/api/assistant \
  -H "Content-Type: application/json" \
  -d '{"message":"open youtube"}'

# Memory search
curl "http://localhost:3000/api/memory?query=coffee"

# Multi-agent
curl -X POST http://localhost:3000/api/multi-agent \
  -d '{"message":"generate video about AI", "department":"youtube"}'
```

## Auto-Sync

Commits auto-push to backup repo every 30 minutes via cron:
```bash
# View logs
tail -f ~/.hermes/logs/rox-sync.log

# Manual sync
bash scripts/auto-sync.sh
```

## Self-Improvement

Rox automatically:
1. **Discovers** repos in `self_improvement/`
2. **Builds** Graft graphs for code understanding
3. **Registers** MCP tools from those repos
4. **Learns** from every task execution
5. **Recalls** past solutions for similar tasks
6. **Rewires** based on performance metrics

## Requirements

- Node.js >= 20
- pnpm >= 9 (for workspace commands)
- Python 3.10+ (for menu bar app)
- macOS (for native menu bar & system commands)

## License

MIT