# Muzan Service

A full-stack financial/betting platform (Muzan Service) built as a pnpm monorepo.

## Stack

| Layer | Tech |
|---|---|
| Frontend (web) | React 19 + Vite 8, Tailwind CSS v4, TanStack Query, Wouter |
| Backend | Express 5 (TypeScript, ESM), Drizzle ORM |
| Database | PostgreSQL (via Drizzle) |
| Mobile | Expo / React Native |

## Monorepo layout

```
artifacts/
  api-server/   – Express backend (port 3000)
  vitrine/      – React web frontend (port 5000)
  mobile/       – Expo React Native app
lib/
  db/           – Drizzle schema & client (@workspace/db)
  api-zod/      – Shared Zod validators
  api-client-react/ – React Query API client
```

## Running on Replit

The **Project** workflow starts both services in parallel:
- **Start Backend** — `cd artifacts/api-server && PORT=3000 pnpm exec tsx src/index.ts`
- **Start application** — `cd artifacts/vitrine && PORT=5000 pnpm run dev`

The frontend dev server proxies `/api` and `/webhooks` to the backend on port 3000.

## Required secrets

| Secret | Purpose |
|---|---|
| `PG_URL` | PostgreSQL connection string |
| `SESSION_SECRET` | Session signing key |

## Optional secrets

| Secret | Purpose |
|---|---|
| `TELEGRAM_BOT_TOKEN` | Telegram alert bot |
| `TELEGRAM_CHAT_ID` | Telegram chat for alerts |

## Database migrations

```bash
cd lib/db && pnpm run push
```

## User preferences

<!-- Add any preferences here -->
