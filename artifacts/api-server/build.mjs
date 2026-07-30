import * as esbuild from "esbuild";
import { createRequire } from "node:module";
import { rename } from "node:fs/promises";

const require = createRequire(import.meta.url);
// esbuild-plugin-pino uses CommonJS exports
const esbuildPluginPino = require("esbuild-plugin-pino");

// Full bundle in CJS format.
//
// Why CJS and not ESM:
//   Many npm packages (express, debug, cors…) use dynamic require() of Node
//   built-ins (tty, os, etc.). When bundled into an ESM file esbuild's shim
//   cannot satisfy those calls at runtime. CJS format has no such limitation.
//
// Why bundle everything (not "packages: external"):
//   Workspace packages (@workspace/db, @workspace/api-zod) export raw
//   TypeScript. pnpm's strict layout means transitive deps of those packages
//   are not reachable from the compiled output at runtime.  Full bundling
//   avoids both problems and produces a single portable artefact.
//
// Only native .node addons stay external.
await esbuild.build({
  entryPoints: ["src/index.ts"],
  bundle: true,
  platform: "node",
  format: "cjs",            // CJS handles dynamic require() correctly
  outdir: "dist",
  sourcemap: true,
  external: ["*.node"],
  plugins: [esbuildPluginPino({ transports: ["pino-pretty"] })],
});

// Rename index.js → index.cjs so Node treats it as CommonJS even when the
// package has "type":"module".
await rename("dist/index.js", "dist/index.cjs").catch(() => {});
await rename("dist/index.js.map", "dist/index.cjs.map").catch(() => {});
