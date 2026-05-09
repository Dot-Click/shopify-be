import { Request, Response } from "express";
import { database } from "@/configs/connection.config";
import {
  customers,
  orders,
  settings,
  notifications,
  activities,
  pushSubscriptions,
} from "@/schema/schema";
import { eq, and } from "drizzle-orm";
import { logger } from "@/utils/logger.util";

// ---------------------------------------------------------------------------
// POST /api/webhook/customers/data-request
// Shopify sends this when a customer requests their data (GDPR).
// We are not required to send data back automatically at this stage — just log.
// ---------------------------------------------------------------------------
export const handleCustomerDataRequest = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const shopDomain = req.headers["x-shopify-shop-domain"] as string;
    const payload = req.body;
    const customerEmail: string = payload?.customer?.email ?? "unknown";

    logger.info(
      `[GDPR] Data request — store: ${shopDomain}, customer: ${customerEmail}`
    );

    res.status(200).send("Data request received");
  } catch (err: any) {
    logger.error("[GDPR] handleCustomerDataRequest error:", err.message);
    res.status(500).json({ error: "Failed to process data request webhook" });
  }
};

// ---------------------------------------------------------------------------
// POST /api/webhook/customers/redact
// Shopify sends this when a customer requests deletion of their data.
// Delete all customer records matching the email + store.
// ---------------------------------------------------------------------------
export const handleCustomerRedact = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const shopDomain = req.headers["x-shopify-shop-domain"] as string;
    const payload = req.body;
    const customerEmail: string = payload?.customer?.email ?? "";

    logger.info(
      `[GDPR] Customer redact — store: ${shopDomain}, customer: ${customerEmail}`
    );

    // Find the store user record to get storeId
    const store = await database.query.users.findFirst({
      where: (u, { or, eq }) =>
        or(
          eq(u.shopify_url, `https://${shopDomain}`),
          eq(u.shopify_url, shopDomain)
        ),
    });

    if (store && customerEmail) {
      await database
        .delete(customers)
        .where(
          and(eq(customers.email, customerEmail), eq(customers.storeId, store.id))
        );

      logger.info(
        `[GDPR] Deleted customer records for ${customerEmail} in store ${shopDomain}`
      );
    }

    res.status(200).send("Customer redact processed");
  } catch (err: any) {
    logger.error("[GDPR] handleCustomerRedact error:", err.message);
    res.status(500).json({ error: "Failed to process customer redact webhook" });
  }
};

// ---------------------------------------------------------------------------
// POST /api/webhook/shop/redact
// Shopify sends this 48 hours after a merchant uninstalls.
// Delete ALL data associated with the store.
// ---------------------------------------------------------------------------
export const handleShopRedact = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const shopDomain = req.headers["x-shopify-shop-domain"] as string;

    logger.info(`[GDPR] Shop redact — store: ${shopDomain}`);

    const store = await database.query.users.findFirst({
      where: (u, { or, eq }) =>
        or(
          eq(u.shopify_url, `https://${shopDomain}`),
          eq(u.shopify_url, shopDomain)
        ),
    });

    if (!store) {
      logger.warn(`[GDPR] Shop redact: store ${shopDomain} not found, skipping.`);
      res.status(200).send("Shop redact: store not found, nothing to delete");
      return;
    }

    const storeId = store.id;

    // Delete in dependency order to avoid FK violations
    // 1. Push subscriptions
    await database
      .delete(pushSubscriptions)
      .where(eq(pushSubscriptions.storeId, storeId));

    // 2. Activities
    await database
      .delete(activities)
      .where(eq(activities.storeId, storeId));

    // 3. Notifications
    await database
      .delete(notifications)
      .where(eq(notifications.storeId, storeId));

    // 4. Settings
    await database
      .delete(settings)
      .where(eq(settings.storeId, storeId));

    // 5. Orders cascade-delete via customers (customers have storeId FK)
    //    We fetch customer IDs first, then delete orders, then customers
    const storeCustomers = await database
      .select({ id: customers.id })
      .from(customers)
      .where(eq(customers.storeId, storeId));

    for (const customer of storeCustomers) {
      await database
        .delete(orders)
        .where(eq(orders.customerId, customer.id));
    }

    // 6. Customers
    await database
      .delete(customers)
      .where(eq(customers.storeId, storeId));

    logger.info(
      `[GDPR] Shop redact complete — all data deleted for store ${shopDomain}`
    );

    res.status(200).send("Shop redact processed");
  } catch (err: any) {
    logger.error("[GDPR] handleShopRedact error:", err.message);
    res.status(500).json({ error: "Failed to process shop redact webhook" });
  }
};
