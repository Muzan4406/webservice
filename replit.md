# Muzan Service

A French-language financial/gaming platform (sports betting / points system). Monorepo with a React/Vite frontend and an Express/TypeScript backend.

## Stack

| Layer | Tech |
|-------|------|
| Frontend | React 19, Vite 8, Tailwind CSS 4, TanStack Query, Wouter, shadcn/ui |
| Backend | Express 5, TypeScript, tsx (dev server) |
| Database | PostgreSQL via Drizzle ORM |
| Push notifications | Firebase (FCM) — frontend only |
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
| `VITE_FIREBASE_API_KEY` | Firebase project API key |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase messaging sender ID |
| `VITE_FIREBASE_APP_ID` | Firebase app ID |
| `VITE_FIREBASE_VAPID_KEY` | Firebase VAPID key for push notifications |

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

## User preferences

- Keep existing project structure and stack — do not restructure or migrate.
