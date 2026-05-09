import { Request, Response } from "express";
import { database } from "@/configs/connection.config";
import { users } from "@/schema/schema";
import { or, eq } from "drizzle-orm";
import { logActivity } from "@/service/logactivity.service";
import { logger } from "@/utils/logger.util";

// ---------------------------------------------------------------------------
// POST /api/webhook/app/uninstalled
// Shopify sends this immediately when a merchant uninstalls the app.
// We clear the access token + api key but DO NOT delete the user record.
// ---------------------------------------------------------------------------
export const handleAppUninstalled = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const shopDomain = req.headers["x-shopify-shop-domain"] as string;

    logger.info(`[Uninstall] App uninstalled — store: ${shopDomain}`);

    if (!shopDomain) {
      res.status(400).json({ error: "Missing x-shopify-shop-domain header" });
      return;
    }

    const store = await database.query.users.findFirst({
      where: (u, { or, eq }) =>
        or(
          eq(u.shopify_url, `https://${shopDomain}`),
          eq(u.shopify_url, shopDomain)
        ),
    });

    if (!store) {
      logger.warn(`[Uninstall] Store ${shopDomain} not found in DB — skipping.`);
      res.status(200).send("App uninstall acknowledged");
      return;
    }

    // Clear Shopify credentials — do NOT delete the user record
    await database
      .update(users)
      .set({
        shopify_access_token: null,
        shopify_api_key: null,
      })
      .where(
        or(
          eq(users.shopify_url, `https://${shopDomain}`),
          eq(users.shopify_url, shopDomain)
        )
      );

    await logActivity({
      action: "APP_UNINSTALLED",
      for: "store",
      storeId: store.id,
      meta: {
        shopDomain,
        uninstalledAt: new Date().toISOString(),
      },
    });

    logger.info(
      `[Uninstall] Cleared Shopify credentials for store ${shopDomain} (user ID: ${store.id})`
    );

    res.status(200).send("App uninstall processed");
  } catch (err: any) {
    logger.error("[Uninstall] handleAppUninstalled error:", err.message);
    res.status(500).json({ error: "Failed to process uninstall webhook" });
  }
};
