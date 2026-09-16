# Rox Colour Palette Reference

## Amber (Original)

| Token | Hex | Usage |
|-------|------|-------|
| `--primary` | `#ffaa30` | Buttons, primary actions |
| `--accent` | `#dd7700` | Hover states, secondary highlights |
| `--glow` | `#ff8800` | Glow effects, shadows |
| `--orb-color` (default) | `rgb(255,170,48)` | Holographic orb base colour |
| `--bg-surface` | `rgba(12,6,0,0.72)` | Surface backgrounds |

## Lava (Red Mode)

| Token | Hex | Usage |
|-------|------|-------|
| `--primary-lava` | `#ff3b1f` | Primary action in lava mode |
| `--accent-lava` | `#7a0508` | Hover/secondary in lava mode |
| `--orb-color` (lava) | `rgb(255,59,31)` | Orb colour when lava mode active |
| `--bg-surface` (lava) | `rgba(12,6,0,0.72)` | Same surface but overridden via `.theme-lava` |

## Coding Mode

| Token | Hex | Usage |
|-------|------|-------|
| `--primary-coding` | `#1e3a8a` | Primary actions in coding mode |
| `--accent-coding` | `#3b82f6` | Accent colour for coding mode |
| `--orb-color` (coding) | `rgb(30,58,138)` | Orb colour in coding mode |
| `--bg-surface` (coding) | `rgba(30,58,138,0.1)` | Subtle surface tint for coding |

## Entertainment Mode

| Token | Hex | Usage |
|-------|------|-------|
| `--primary-entertainment` | `#a8f3f4` | Primary colour for entertainment |
| `--accent-entertainment` | `#06b6d4` | Accent for entertainment UI |
| `--orb-color` (entertainment) | `rgb(168,243,244)` | Orb colour in entertainment mode |
| `--bg-surface` (entertainment) | `rgba(168,243,244,0.1)` | Surface tint for entertainment |

## Research Mode

| Token | Hex | Usage |
|-------|------|-------|
| `--primary-research` | `#4b5563` | Primary colour for research |
| `--accent-research` | `#6366f1` | Accent colour for research |
| `--orb-color` (research) | `rgb(75,85,99)` | Orb colour in research mode |
| `--bg-surface` (research) | `rgba(75,85,99,0.1)` | Surface tint for research |

## System Mode

| Token | Hex | Usage |
|-------|------|-------|
| `--primary-system` | `#111827` | Primary colour for system UI |
| `--accent-system` | `#d9d9d9` | Accent for system controls |
| `--orb-color` (system) | `rgb(17,25,39)` | Orb colour in system mode |
| `--bg-surface` (system) | `rgba(17,25,39,0.1)` | Surface tint for system |

## Contrast & Accessibility

- **AA Compliance**: All foreground/background combinations meet WCAG 2.1 AA contrast ratios (≥4.5:1 for normal text).  
- **Focus Rings**: `outline-2 outline-primary` ensures visible focus.  
- **Color‑Blind Simulation**: The palette uses both colour and clear semantic naming (primary/secondary) to avoid reliance on hue alone.  

> **Tip**: When switching modes dynamically, update CSS variables via `document.documentElement.style.setProperty('--orb-color', '<value>')` to keep the hologram in sync.