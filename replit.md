# Project Overview

A pnpm monorepo with three main components:

- **`artifacts/api-server`** — Express.js REST API (TypeScript, ESM, esbuild bundled). Runs on port 3000.
- **`artifacts/vitrine`** — React web frontend (Vite + Tailwind CSS + shadcn/ui). Runs on port 5000 (webview).
- **`artifacts/mobile`** — Expo React Native app (iOS/Android/Web).

Shared libraries under `lib/`:
- `lib/db` — Drizzle ORM + PostgreSQL schema
- `lib/api-client-react` — Generated React API client (orval)
- `lib/api-spec` — OpenAPI spec (source of truth for API shapes)
- `lib/api-zod` — Zod request/response validators

## How to Run

### API Server (backend)
```
cd artifacts/api-server
PORT=3000 pnpm run dev
```
Workflow: **Start Backend** (console, port 3000)

### Vitrine (web frontend)
```
cd artifacts/vitrine
PORT=5000 BASE_PATH=/ pnpm run dev
```
Workflow: **Start application** (webview, port 5000)

The vitrine dev server proxies `/api` and `/webhooks` to `http://localhost:3000`.

## Required Secrets

| Secret | Description |
|--------|-------------|
| `PG_URL` | PostgreSQL connection string (Supabase or any Postgres provider) |
| `SESSION_SECRET` | Already set |

## Optional Secrets

| Secret | Description |
|--------|-------------|
| `TELEGRAM_BOT_TOKEN` | Telegram notifications |
| `TELEGRAM_CHAT_ID` | Telegram chat ID |
| `SENDAVAPAY_API_KEY` | Payment provider API key |
| `SENDAVAPAY_WEBHOOK_SECRET` | Payment webhook verification |

## Database

Schema is managed with Drizzle Kit. To push schema changes:
```
cd lib/db
pnpm run push
```

## Package Management

This project uses **pnpm workspaces** with a catalog (pnpm-workspace.yaml).
To install dependencies: `pnpm install` from the root.

## User Preferences

<!-- Add preferences here when asked to remember something -->
