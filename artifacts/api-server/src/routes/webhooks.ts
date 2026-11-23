import { Router, type IRouter, type Request, type Response } from "express";
import { logger } from "../lib/logger.js";
import {
  DrimPayError,
  getDrimPayWebhookSecret,
  verifyDrimPayWebhookSignature,
} from "../lib/drimpay.js";
import { settleDrimPayPayment } from "../lib/drimpay-settlement.js";

const router: IRouter = Router();

router.post("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const rawBody = Buffer.isBuffer(req.body) ? req.body : null;
    if (!rawBody) {
      res.status(400).json({ error: "Corps de webhook invalide." });
      return;
    }

    const signature = req.header("X-DrimPay-Signature");
    const timestamp = req.header("X-DrimPay-Timestamp");
    const secret = getDrimPayWebhookSecret();
    if (!verifyDrimPayWebhookSignature(rawBody, signature, timestamp, secret)) {
      res.status(401).json({ error: "Signature de webhook invalide." });
      return;
    }

    const payload = JSON.parse(rawBody.toString("utf8")) as {
      event?: string;
      status?: string;
      mode?: string;
      reference?: string;
      order_id?: string;
    };
    if (payload.mode !== "live") {
      res.status(400).json({ error: "Seuls les événements de paiement live sont acceptés." });
      return;
    }

    const supportedEvents = new Set([
      "payin.success",
      "payin.failed",
      "payin.expired",
      "payin.processing",
      "payin.reversed",
    ]);
    if (!payload.event || !supportedEvents.has(payload.event)) {
      res.status(200).json({ received: true, ignored: true });
      return;
    }

    await settleDrimPayPayment({ ...payload, status: payload.event.replace(/^payin\./, "") });
    logger.info({ event: payload.event, reference: payload.reference }, "DrimPay webhook vérifié et traité");
    res.status(200).json({ received: true });
  } catch (error) {
    if (error instanceof DrimPayError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }
    logger.error({ err: error }, "Échec de traitement du webhook DrimPay");
    res.status(500).json({ error: "Webhook DrimPay non traité." });
  }
});

export default router;
