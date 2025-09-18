import { Request, Response } from "express";
import axios from "axios";
import { database } from "@/configs/connection.config";
import { customers, users } from "@/schema/schema";
import { eq } from "drizzle-orm";

export const ordersCreateWebhook = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const order = req.body;
    console.log("🚀 New order received:", order);

    const customerEmail = order.customer?.email;
    const customerId = order.customer?.id;

    if (!customerEmail || !customerId) {
      res.status(400).send("Missing customer info");
      return;
    }

    // 🔎 Check if blocked in your DB
    const [customerRecord] = await database
      .select()
      .from(customers)
      .where(eq(customers.email, customerEmail));

    const storeId = customerRecord.storeId;

    const store = await database
      .select()
      .from(users)
      .where(eq(users.id, storeId as string));

    const storeUrl = store[0].shopify_url;
    const storeAccessToken = store[0].shopify_access_token;
    console.log("store URL:-", storeUrl);
    console.log("Store Access Token:-", storeAccessToken);
    if (customerRecord?.tags?.includes("BLOCKED")) {
      console.log(`⚠️ Blocked customer tried ordering: ${customerEmail}`);

      // ❌ Cancel order via Shopify API
      const response = await axios.post(
        `${storeUrl}/admin/api/2025-07/orders/${order.id}/cancel.json`,
        {},
        {
          headers: {
            "X-Shopify-Access-Token": storeAccessToken!,
            "Content-Type": "application/json",
          },
        }
      );

      console.log("This is response:-", response.data);
    }

    res.status(200).send("✅ Webhook processed");
  } catch (error: any) {
    console.error("Webhook error:", error.response?.data || error);
    res.status(500).send("❌ Error processing webhook");
  }
};
