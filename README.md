# ROX

A futuristic personal AI assistant with an interactive 3D holographic core.

## Architecture

```
rox/
├── apps/
│   ├── web/          # React + Three.js frontend (Vite)
│   └── server/       # Express API with AI orchestration
├── packages/
│   ├── types/        # Shared TypeScript types
│   └── ui/           # Zustand store, modules, tools registry
├── database/         # SQLite migrations (future)
└── assets/           # Static assets
```

## Quick Start

```bash
# Install pnpm if you haven't
corepack enable
corepack prepare pnpm@9.15.0 --activate

# Install dependencies
pnpm install

# Copy environment file
cp .env.example .env

# Start both apps
pnpm dev
```

- Frontend: http://localhost:3000
- Server: http://localhost:4000

## Commands

```bash
pnpm dev          # Start dev servers (web + server)
pnpm build        # Build both apps
pnpm build:web    # Build frontend only
pnpm build:server # Build server only
pnpm lint         # Lint all packages
pnpm typecheck    # Type check all packages
```

## Adding a Module

Edit `packages/ui/src/modules.ts` and add to the `MODULES` array:

```typescript
{
  id: 'your-module',
  name: 'Your Module',
  icon: 'icon-name',  // from lucide-react
  description: 'Description',
  capabilities: ['cap1', 'cap2'],
}
```

Then add the UI in `apps/web/src/components/`.

## Adding an AI Provider

1. Implement `AIProviderInterface` in `apps/server/src/ai/orchestrator.ts`
2. Add constructor in `AIOrchestrationLayer`
3. Add key to `.env.example`

```typescript
class MyProvider implements AIProviderInterface {
  readonly name = 'my-provider';
  async chat(messages, options) { /* ... */ }
  isAvailable() { return !!process.env.MY_PROVIDER_KEY; }
}
```

## Adding a Tool

Add to `packages/ui/src/tools.ts`:

```typescript
{
  name: 'my_tool',
  description: 'What it does',
  inputSchema: { param: 'string' },
  outputSchema: { result: 'string' },
  permissions: ['read'],
}
```

## Modifying the Rox Core

The 3D core is in `apps/web/src/components/RoxCore.tsx`. It's composed of:
- `CoreNucleus` — central glowing sphere
- `EnergyShell` — wireframe icosahedron layers
- `OrbitalRings` — rotating torus geometries
- `ParticleField` — instanced particle system
- `CoreLighting` — point lights with amber colors
- `CoreEffects` — bloom, fog, etc.

Each state (idle, thinking, researching, etc.) animates different properties. See `useRoxStore.coreState`.

## Changing the Theme

Edit `packages/ui/src/theme.ts` and `apps/web/src/styles/globals.css`. The design system uses CSS custom properties for consistency.

## Building for Production

```bash
pnpm build
cd apps/web && node dist/index.js  # or serve the static build
cd apps/server && node dist/index.js
```

## Requirements

- Node.js >= 20
- pnpm >= 9
