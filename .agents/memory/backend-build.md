---
name: Backend build strategy
description: Why the api-server must be built as a full CJS bundle, not ESM with external packages
---

# Backend build strategy

The rule: `artifacts/api-server/build.mjs` must produce a **full CJS bundle** (`format: "cjs"`, `bundle: true`, `external: ["*.node"]`).

**Why not `packages: "external"` (the original config):**
pnpm's strict node_modules layout means transitive deps of workspace packages (`@workspace/api-zod` → `zod`, `@workspace/db` → `drizzle-orm`, etc.) are NOT reachable from `artifacts/api-server/dist/` at runtime. Node throws `ERR_MODULE_NOT_FOUND`.

**Why not ESM full-bundle:**
Packages like `express`, `debug`, and `cors` use CJS dynamic `require()` of Node built-ins (`tty`, `os`, etc.). esbuild's CJS→ESM shim cannot satisfy those calls at runtime → `Dynamic require of "tty" is not supported`.

**Why CJS works:**
CJS format has no issues with dynamic `require()`. Built-in modules resolve correctly. All npm deps + workspace packages are bundled inline.

**`esbuild-plugin-pino` requirement:**
`pino` uses worker threads with dynamic paths. The plugin generates shim files (`pino-file.js`, `pino-worker.js`, `pino-pretty.js`, `thread-stream-worker.js`) alongside the main bundle. Must use `outdir` (not `outfile`) because of multiple output files.

**`import.meta.url` in source files:**
`app.ts` and `routes/upload.ts` use `dirname(fileURLToPath(import.meta.url))` for `__dirname`. In CJS bundles, `__dirname` is a global. Both files use a conditional fallback: `typeof __dirname !== 'undefined' ? __dirname : dirname(fileURLToPath(import.meta.url))`. The `import.meta.url` branch is dead code in CJS (esbuild warns, but it's harmless).

**Express 5 wildcard route:**
Express 5 does not accept bare `*` wildcards. Use `/*path` for the SPA fallback: `app.get("/*path", ...)`.

**Output file:**
`dist/index.cjs` (renamed from `dist/index.js` in the build script).
