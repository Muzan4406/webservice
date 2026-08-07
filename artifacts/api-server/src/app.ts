import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import router from "./routes";
import webhookRouter from "./routes/webhooks";
import { logger } from "./lib/logger";
import { maintenanceGate } from "./middlewares/maintenance";

// Cross-format __dirname: works in both CJS bundles (where __dirname is a
// global) and native ESM (where import.meta.url is defined).
declare const __dirname: string | undefined;
const _dirname: string =
  typeof __dirname !== "undefined"
    ? __dirname
    : dirname(fileURLToPath(import.meta.url));

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

// ── CORS ─────────────────────────────────────────────────────────────────────
// In production the frontend is served by this same Express process, so
// same-origin requests never hit CORS. The header is only needed for external
// clients (webhooks, mobile apps). Restrict to ALLOWED_ORIGIN when set.
const allowedOrigin = process.env.ALLOWED_ORIGIN;
app.use(
  cors(
    allowedOrigin
      ? { origin: allowedOrigin, credentials: true }
      : undefined, // allow all in dev / when not configured
  ),
);

app.use("/webhooks/sendavapay", express.raw({ type: "application/json" }), webhookRouter);
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Uploads — path is relative to the compiled file, not process.cwd() ───────
// Built file lives at artifacts/api-server/dist/index.cjs
// uploads/ folder lives at artifacts/api-server/uploads/
const uploadsDir = join(_dirname, "../uploads");
app.use("/api/uploads", express.static(uploadsDir));
app.use("/api", maintenanceGate, router);

// ── Serve frontend in production ──────────────────────────────────────────
// The bundled backend sits at artifacts/api-server/dist/index.mjs,
// so the Vite build output is two levels up: artifacts/vitrine/dist/
if (process.env.NODE_ENV === "production") {
  const frontendDist = join(_dirname, "../../vitrine/dist");
  app.use(
    express.static(frontendDist, {
      setHeaders(res, filePath) {
        // These files control the installed PWA and must be revalidated after
        // every deployment. A stale HTML file can point to a deleted Vite
        // chunk and leave an installed app on a blank screen.
        if (
          filePath.endsWith("/index.html") ||
          filePath.endsWith("/manifest.json") ||
          filePath.endsWith("/sw.js")
        ) {
          res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        }
      },
    }),
  );
  // SPA fallback — let React Router handle all non-API routes
  // Express 5 requires a named wildcard parameter (not bare "*")
  app.get("/*path", (_req: Request, res: Response) => {
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.sendFile(join(frontendDist, "index.html"));
  });
}

// Global error handler — catches any unhandled async errors from route handlers
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error({ err }, "Unhandled error");
  res.status(500).json({ error: "Internal server error" });
});

export default app;
