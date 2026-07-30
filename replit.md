# Muzan Service

A French-language financial/gaming platform (sports betting / points system). Monorepo with a React/Vite frontend and an Express/TypeScript backend.

## Stack

| Layer | Tech |
|-------|------|
| Frontend | React 19, Vite 8, Tailwind CSS 4, TanStack Query, Wouter, shadcn/ui |
| Backend | Express 5, TypeScript, tsx (dev server) |
| Database | PostgreSQL via Drizzle ORM |
| File storage | Google Cloud Storage via Replit Object Storage sidecar |
| Alerts | Telegram bot (optional) |

## Project structure

```
artifacts/
  vitrine/      # React/Vite frontend (port 5000)
  api-server/   # Express backend (port 3000)
lib/
  db/           # Drizzle ORM schema + client (@workspace/db)
  api-zod/      # Shared Zod schemas (@workspace/api-zod)
  api-client-react/  # TanStack Query API client (@workspace/api-client-react)
  api-spec/     # Orval code-gen spec
```

## Running the project

Two workflows run in parallel:

- **Start application** — frontend dev server at port 5000
- **Start Backend** — backend API at port 3000

Run both via the **Project** workflow (run button).

## Required secrets

Set these in Replit Secrets before the backend will start:

| Secret | Description |
|--------|-------------|
| `PG_URL` | PostgreSQL connection string (e.g. from Supabase or Neon) |

Optional secrets (silently skipped if absent):

| Secret | Description |
|--------|-------------|
| `TELEGRAM_BOT_TOKEN` | Telegram bot token for admin alerts |
| `TELEGRAM_CHAT_ID` | Telegram chat ID for admin alerts |

## Database

The `lib/db` package uses Drizzle Kit. To push schema changes to the database:

```bash
cd lib/db && PG_URL=<your-url> pnpm run push
```

## Package management

Uses **pnpm workspaces**. Install all dependencies from the root:

```bash
pnpm install
```

## Production build (Hostinger / VPS)

```bash
pnpm install --frozen-lockfile
pnpm run build
NODE_ENV=production PORT=3000 node artifacts/api-server/dist/index.cjs
```

In production, Express serves the React frontend as static files — a single
Node.js process handles everything. See `HOSTINGER.md` for the full deployment
guide (PM2, Nginx/Apache reverse proxy, SSL).

**Build output:**
- `artifacts/api-server/dist/index.cjs` — backend bundle (fully self-contained, no `node_modules` needed at runtime)
- `artifacts/vitrine/dist/` — frontend static files (served by Express)

**Required env vars for production** (see `.env.example`):

| Variable | Description |
|----------|-------------|
| `NODE_ENV` | Must be `production` |
| `PORT` | Server port (default: `3000`) |
| `PG_URL` | PostgreSQL connection string |

## User preferences

- Keep existing project structure and stack — do not restructure or migrate.
