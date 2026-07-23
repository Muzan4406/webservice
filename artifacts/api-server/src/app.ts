import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { join } from "node:path";
import router from "./routes";
import webhookRouter from "./routes/webhooks";
import { logger } from "./lib/logger";
import { maintenanceGate } from "./middlewares/maintenance";

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
app.use(cors());
app.use("/webhooks/sendavapay", express.raw({ type: "application/json" }), webhookRouter);
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true }));
app.use("/api/uploads", express.static(join(process.cwd(), "uploads")));
app.use("/api", maintenanceGate, router);

// Global error handler — catches any unhandled async errors from route handlers
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error({ err }, "Unhandled error");
  res.status(500).json({ error: "Internal server error" });
});

export default app;
