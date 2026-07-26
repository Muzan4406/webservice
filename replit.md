# Muzan Service

A French-language financial/gaming platform with deposits, withdrawals, coupons, VIP tiers, contests, promotions, and in-app chat.

## Stack

| Layer | Tech |
|-------|------|
| Frontend | React 19, Vite 8, Tailwind CSS 4, shadcn/Radix UI, Wouter (routing), TanStack Query |
| Backend | Express 5, TypeScript (tsx in dev), Drizzle ORM |
| Database | PostgreSQL (via `PG_URL`) |
| Monorepo | pnpm workspaces (`pnpm-workspace.yaml`) |

## Project layout

```
artifacts/
  api-server/   — Express REST API (port 3000)
  vitrine/      — React frontend (port 5000, proxies /api → :3000)
lib/
  db/           — Drizzle schema + PostgreSQL client
  api-zod/      — Shared Zod validation schemas
  api-client-react/ — Generated React Query hooks
  api-spec/     — OpenAPI spec + Orval codegen config
```

## Running the project

Two workflows must both be running:

- **Start Backend** — `cd artifacts/api-server && PORT=3000 NODE_ENV=development pnpm exec tsx src/index.ts`
- **Start application** — `cd artifacts/vitrine && PORT=5000 pnpm run dev`

The Vite dev server proxies `/api` and `/webhooks` to the backend at `localhost:3000`.

## Required secrets

| Secret | Description |
|--------|-------------|
| `PG_URL` | PostgreSQL connection string (e.g. Supabase) |
| `SESSION_SECRET` | Secret used to sign session tokens |

## Optional secrets (features degrade gracefully without them)

| Secret | Description |
|--------|-------------|
| `TELEGRAM_BOT_TOKEN` | Telegram alert notifications |
| `TELEGRAM_CHAT_ID` | Telegram alert notifications |
| `SENDAVAPAY_API_KEY` | Sendavapay payment gateway |
| `SENDAVAPAY_WEBHOOK_SECRET` | Sendavapay webhook verification |
| `PUBLIC_OBJECT_SEARCH_PATHS` | Replit Object Storage (public files) |
| `PRIVATE_OBJECT_DIR` | Replit Object Storage (private uploads) |

## Database migrations

```bash
cd lib/db && pnpm run push       # apply schema to DB
cd lib/db && pnpm run push-force # force-apply (drops conflicting columns)
```

## API codegen (after editing openapi.yaml)

```bash
cd lib/api-spec && pnpm run codegen
```

## User preferences
