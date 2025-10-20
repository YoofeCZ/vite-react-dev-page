# Dev Command Center

A full-stack game development portal combining **Vite + React** on the frontend with a **Hono** API deployed to **Cloudflare Workers**. The site now ships with a dark emerald, glassmorphism presentation layer that spans an overview dashboard, an operator-grade admin console, a community forum steward view and a store operations cockpit — all tuned for transparent indie game production.

![Hero preview](https://imagedelivery.net/wSMYJvS3Xw-n339CbDyDIA/fc7b4b62-442b-4769-641b-ad4422d74300/public)

## Features

### Frontend (Vite + React)
- **Overview dashboard** with real-time Unity status, GitHub commits, milestone timeline and automation visualisations.
- **Admin deck (/admin)** exposing visitor analytics, content queues, moderation radar and configuration controls for Discord/Gmail/n8n workflows.
- **Forum suite (/forum)** with category insights, trending threads, moderator playbook and actionable search filters.
- **Store operations (/store)** surfacing Stripe metrics, product catalogue, merch lineup, fulfilment queue and automation hooks.
- Dark emerald glassmorphism styling with neon accent navigation and responsive layouts tuned for Cloudflare Pages.

### Backend (Hono on Cloudflare Workers)
- `POST /api/unity-status` — accepts Unity editor heartbeats and task updates.
- `GET /api/unity-status` — returns the most recent session snapshot.
- `POST /api/github-webhook` — ingests GitHub push events and caches the head commit.
- `GET /api/latest-commit` — exposes the cached commit for the frontend widget.
- `POST /api/trigger-notification` — fan-out hook for n8n/Discord/Gmail automations.
- Cloudflare KV integration for Unity presence + commit cache with in-memory fallback for local dev.

### Unity Editor Plugin
- `unity/DevStatusTracker.cs` provides a custom **Dev Status Tracker** window.
- Sends manual or automatic (2-minute heartbeat) updates to the Worker endpoint.
- Tracks session duration, weekly hours and productive streak; persists metrics in `EditorPrefs`.
- Exposes quick controls for switching between working/break states.

### Automation & Data Architecture
- [Mermaid architecture diagram](docs/architecture.md) covering Unity, Workers, KV, D1, R2, n8n and Stripe flows.
- Ready for D1-backed forum/store/admin modules with Cloudflare R2 media distribution.
- Notification orchestration prepared for Discord + Gmail via n8n bridge webhooks.

## Getting Started

```bash
npm install
npm run dev
```

The Vite dev server runs at [http://localhost:5173](http://localhost:5173). It proxies API requests to the co-located Worker during development.

## API Development

```bash
npm run dev:worker   # if defined via package script, otherwise use `npx wrangler dev`
```

Environment bindings used by the Worker:

| Variable | Purpose |
| --- | --- |
| `UNITY_STATUS_KV` | KV namespace for live Unity status cache. Optional during local development. |
| `COMMIT_CACHE_KV` | KV namespace storing the latest commit payload. Optional during local development. |
| `N8N_WEBHOOK_URL` | Optional automation webhook target (Discord/Gmail workflows). |

Without KV bindings the Worker falls back to in-memory storage, ideal for testing.

## Unity Integration

1. Copy `unity/DevStatusTracker.cs` into your Unity project under an `Editor` folder.
2. Open **Window → Dev Status Tracker** inside Unity.
3. Configure the Cloudflare Worker URL (e.g. `https://your-domain.com/api/unity-status`).
4. Start a working session, set the active task and the plugin will post heartbeats automatically.

## Deployment

- Frontend: Deploy via **Cloudflare Pages** connected to this repository.
- API: Deploy via **Wrangler** (`npm run deploy`) to Cloudflare Workers with KV + D1 bindings.
- Automation: Point Unity/GitHub/N8n/Stripe webhooks to the deployed Worker endpoints.

## Documentation

- [System architecture](docs/architecture.md)
- [Unity editor plugin](unity/DevStatusTracker.cs)

---
Crafted for transparent indie game development with end-to-end automation hooks.
