# Graft Setup Guide for Rox

Graft (`@nanonets/graft`) builds local codebase graphs for fast recall.

## Installation

```bash
cd ~/Downloads/Rox
npm install @nanonets/graft --save-dev
```

## Usage

### Build Graph

```bash
cd ~/Downloads/Rox/self_improvement/<repo>
node ../../node_modules/.bin/graft build
```

### Check Status

```bash
node ../../node_modules/.bin/graft check
```

## Known Issues

### `--quiet` Flag Not Supported

Graft v0.18+ does not accept `--quiet`. Remove it from commands.

### Path Resolution

When running from `lib/skills/`, use relative paths:

```typescript
const graftBin = process.env.PATH?.includes("node_modules")
  ? path.join(process.cwd(), "node_modules", ".bin", "graft")
  : "graft";
```

## File Locations

- Graph cache: `<repo>/graft/` (git-ignored)
- Wiring JSON: `<repo>/graft/.graph/wiring.json`
