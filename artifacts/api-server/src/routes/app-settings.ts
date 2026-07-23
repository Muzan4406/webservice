import { Router, type IRouter } from "express";
import { db, appSettingsTable } from "@workspace/db";

const router: IRouter = Router();

// Public endpoint: mobile app polls this on boot to know whether the app is
// in maintenance mode and what the current VIP price is.
router.get("/app-settings", async (_req, res): Promise<void> => {
  let [settings] = await db.select().from(appSettingsTable).limit(1);

  if (!settings) {
    [settings] = await db.insert(appSettingsTable).values({}).returning();
  }

  res.json({
    maintenanceMode: settings.maintenanceMode,
    maintenanceMessage: settings.maintenanceMessage ?? null,
    vipPriceFcfa: parseFloat(settings.vipPriceFcfa),
    whatsappChannelUrl: settings.whatsappChannelUrl ?? null,
    whatsappSupport1Url: settings.whatsappSupport1Url ?? null,
    whatsappSupport2Url: settings.whatsappSupport2Url ?? null,
    telegramSupportUrl: settings.telegramSupportUrl ?? null,
  });
});

export default router;
