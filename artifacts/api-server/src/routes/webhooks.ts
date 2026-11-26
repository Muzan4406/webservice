import { Router, type IRouter, type Request, type Response } from "express";
import { logger } from "../lib/logger.js";
import { reconcileAshtechPayWebhook } from "./ashtechpay.js";

const router: IRouter = Router();

router.post("/", (req: Request, res: Response): void => {
  const payload = req.body as {
    event?: unknown;
    transaction_id?: unknown;
    reference?: unknown;
  };

  if (
    !payload ||
    typeof payload !== "object" ||
    typeof payload.event !== "string" ||
    typeof payload.transaction_id !== "string"
  ) {
    res.status(400).json({ error: "Corps de notification invalide." });
    return;
  }

  res.status(200).json({ received: true });
  void reconcileAshtechPayWebhook({
    event: payload.event,
    transaction_id: payload.transaction_id,
    ...(typeof payload.reference === "string" ? { reference: payload.reference } : {}),
  }).catch((error: unknown) => {
    logger.error(
      { errorType: error instanceof Error ? error.name : typeof error },
      "Ashtechpay callback reconciliation failed",
    );
  });
});

export default router;
