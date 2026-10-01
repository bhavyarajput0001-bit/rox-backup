# Rox Deployment Commands

## Quick Start (Terminal)

```bash
cd ~/Downloads/Rox
npm run dev
```

Then open: http://localhost:3000

---

## All Available Commands

### Development

```bash
# Start dev server (port 3000)
cd ~/Downloads/Rox && npm run dev

# Build for production
npm run build

# Type check
npm run typecheck

# Lint
npm run lint
```

### API Testing

```bash
# Health check
curl http://localhost:3000/api/assistant

# Test quick commands
curl -X POST http://localhost:3000/api/assistant \
  -H "Content-Type: application/json" \
  -d '{"message":"open youtube"}'

curl -X POST http://localhost:3000/api/assistant \
  -H "Content-Type: application/json" \
  -d '{"message":"battery"}'

curl -X POST http://localhost:3000/api/assistant \
  -H "Content-Type: application/json" \
  -d '{"message":"yt status"}'
```

### Memory & Agents

```bash
# Check memory stats
curl http://localhost:3000/api/memory

# Multi-agent status
curl -X POST http://localhost:3000/api/multi-agent \
  -d '{"message":"status"}'
```

---

## Background Services Already Running

| Service         | Port  | Status     |
| --------------- | ----- | ---------- |
| Rox Dev Server  | 3000  | ✅ Running |
| Backend API     | 4000  | ✅ Running |
| Omniroute Proxy | 20128 | ✅ Running |
| FreeLLM         | 31415 | ✅ Running |
| YouTube Agent   | 3457  | ✅ Running |
| OpenDesign MCP  | -     | ✅ Running |

---

## One-Liner to Start Everything

```bash
cd ~/Downloads/Rox && npm run dev
```

Open browser to: **http://localhost:3000**
