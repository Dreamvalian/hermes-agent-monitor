# Agent Monitor — Hermes Dashboard Plugin

A comprehensive real-time monitoring dashboard plugin for the Hermes Agent web interface.

```
┌─ Agent Monitor ───────────────────────────────────────────────────────┐
│ Overview │ Sessions │ Ops │ Notes                                      │
│                                                                       │
│  ┌─ System Status ──────────┐  ┌─ Health Radar ─────────────────────┐│
│  │ ● Gateway Online  v2.x  │  │      ╱╲                             ││
│  │ Active: 3 sessions      │  │    ╱  ╲   Gateway ──●              ││
│  │ Platforms: discord      │  │   ╱ ●  ╲  Sessions ─●               ││
│  └─────────────────────────┘  │  ╱──────╲                            ││
│                               │   Health  95/100                     ││
│  ┌─ Usage (7 days) ───────┐  └──────────────────────────────┬───────┤│
│  │ Sessions │  Est Cost  │  │  ┌─ Skills Analytics (7d) ────┐│       ││
│  │   142    │  $0.2847   │  │  │ Total Loads: 1,247         ││       ││
│  │ Input    │  Output    │  │  │ ████████████ api-int       ││       ││
│  │  2.4M   │   5.1M     │  │  │ ██████████ git-op         ││       ││
│  │ ▁▂▃▅▆▇█▇▆▅▃▂▁       │  │  │ ████████   deploy         ││       ││
│  └───────────────────────┘  └──────────────────────────────┴───────┘│
│                                                                       │
│  ┌─ Recent Sessions ────────────────────┐  ┌─ Cron Jobs ──────────┐│
│  │ ● sess_abc123   active   12 msgs    │  │ ● Morning Brief  6AM ││
│  │ ● sess_xyz789   ended    8 msgs     │  │ ● Evening Rev  8PM  ││
│  └──────────────────────────────────────┘  └──────────────────────┘│
└───────────────────────────────────────────────────────────────────────┘
```

## Features

**4-Tab Dashboard:**

| Tab | Features |
|-----|----------|
| **Overview** | Health radar (SVG), metrics row, 7-day usage chart, skills analytics, cron overview |
| **Sessions** | Full session list (20), click-to-expand session detail drawer with token counts, message previews |
| **Ops** | Config snapshot with YAML preview, activity timeline with manual refresh + plugin rescan |
| **Notes** | Operator notes textarea + checklist, skills browser with enabled/disabled sections |

**All live data — no mocks:**
- `api.getStatus()` — gateway health, version, platforms
- `api.getSessions(20)` — session list with metadata
- `api.getAnalytics(7)` — 7-day usage, costs, skills analytics
- `api.getCronJobs()` — all scheduled jobs with last-run times
- `api.getSkills()` — full skills registry
- `fetchJSON("/api/dashboard/plugins/rescan")` — live plugin rescan

## Installation

```bash
# Copy plugin to your Hermes plugins directory
cp -r agent-monitor ~/.hermes/plugins/agent-monitor

# Select "Agent Monitor" from the dashboard tab bar
```

## Screenshots

The dashboard requires Discord OAuth. To preview:
1. Install and run `hermes dashboard`
2. Authenticate via Discord
3. Select the **Agent Monitor** tab

## Architecture

```
agent-monitor/
├── manifest.json          # name, label, tab config, entry point
└── dist/
    └── index.js           # Plain IIFE — ~39KB, no build step, no dependencies
```

**SDK usage:** `window.__HERMES_PLUGIN_SDK__` — React, hooks, Hermes API client, shadcn/ui components

## Theme Pairing

Designed for the **Cyberdeck** theme (`cyberdeck.yaml`):
- Void black + hot magenta + electric cyan
- Cockpit layout with sidebar rail
- CRT scanlines, perspective grid floor, neon glow animations
- Space Grotesk + JetBrains Mono typography

## Demo Output

```
┌─ Agent Monitor ───────────────────────────────────────────────────────┐
│ Overview │ Sessions │ Ops │ Notes                                      │
│  Health: 95/100 ●   Sessions: 3 active   Cron: 4 jobs (3 enabled)    │
└───────────────────────────────────────────────────────────────────────┘
```

## License

MIT — Nous Research / Hermes Agent
