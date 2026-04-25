# Agent Monitor — Hermes Dashboard Plugin

A comprehensive real-time monitoring dashboard plugin for the Hermes Agent web interface.

![Agent Monitor](https://img.shields.io/badge/version-1.0.0-blue) ![Hermes](https://img.shields.io/badge/Hermes%20Dashboard-v2.0+-00d4aa)

## Features

**4-Tab Dashboard:**
- **Overview** — System status (gateway health, platform connections, version), 7-day usage analytics, recent sessions, and cron job summary
- **Sessions** — Live view of all Hermes sessions with message counts, model info, and active status
- **Skills** — Skills browser with 7-day analytics (load counts, top skills bar chart, distinct skills used)
- **Cron** — All scheduled cron jobs with schedule display, last run time, and enabled/disabled status

**Built with Hermes Plugin SDK:**
- Plain IIFE JavaScript — no build step required
- Uses `window.__HERMES_PLUGIN_SDK__` for React, hooks, and Hermes API
- Auto-discovers via the dashboard plugin system

## Screenshots

```
┌─ Agent Monitor ──────────────────────────────────────────┐
│ Overview | Sessions | Skills | Cron                      │
│                                                         │
│ ┌─ System Status ─────┐  ┌─ Usage (7 days) ──────────┐ │
│ │ ● Gateway Online     │  │ Sessions: 142  API: 1.2k │ │
│ │ v2.14.2             │  │ Input: 2.4M tokens        │ │
│ │ Active: 3 sessions   │  │ Est. Cost: $0.2847        │ │
│ └──────────────────────┘  └────────────────────────────┘ │
│                                                         │
│ ┌─ Recent Sessions ─────┐  ┌─ Cron Jobs ───────────────┐ │
│ │ ● sess_abc123 active  │  │ ● Morning Briefing  6AM   │ │
│ │   cli/gpt-4o  12 msgs│  │ ● Evening Review    8PM    │ │
│ │ ● sess_xyz789 ended   │  │ ○ Weekly Doctor    Sun    │ │
│ └──────────────────────┘  └────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

## Installation

```bash
# Copy plugin to your Hermes plugins directory
cp -r agent-monitor ~/.hermes/plugins/agent-monitor

# Restart the dashboard or trigger a plugin rescan
# The plugin will appear as a new "Agent Monitor" tab
```

## Plugin Structure

```
agent-monitor/
├── manifest.json          # Plugin manifest (name, label, tab config)
└── dist/
    └── index.js           # Plain IIFE bundle — no build step
```

## Theme Pairing

This plugin is designed to pair with the **Cyberdeck** theme (`cyberdeck.yaml`) for the full neon cyberpunk cockpit experience. The Cyberdeck theme provides:
- Hot pink (`#ff00ff`) + electric cyan (`#00ffff`) on void black
- Orbitron + Share Tech Mono typography
- Cockpit layout variant with sidebar rail
- Animated neon glow effects and CRT scanlines

See [`../cyberdeck-theme/`](./cyberdeck-theme/) for the paired theme.

## API Endpoints Used

| Endpoint | Data |
|----------|------|
| `GET /api/status` | Gateway health, version, active sessions |
| `GET /api/sessions` | Session list with metadata |
| `GET /api/analytics/usage` | 7-day usage, skills, costs |
| `GET /api/cron/jobs` | Cron job list |
| `GET /api/skills` | Skills registry |
| `GET /api/logs` | Recent error logs |

## Tech Stack

- **React** via Hermes Plugin SDK (`window.__HERMES_PLUGIN_SDK__`)
- **shadcn/ui** components (Card, Badge, Button, Tabs)
- **Hermes API** client (`api.getStatus()`, `api.getSessions()`, etc.)
- Plain IIFE — no bundler, no dependencies to install

## License

MIT — Nous Research / Hermes Agent
