import { Request, Response } from "express";
import axios from "axios";
import { database } from "@/configs/connection.config";
import { customers, users } from "@/schema/schema";
import { eq } from "drizzle-orm";
import { calculateRiskyOrders } from "@/service/risk.service";
import { highRiskOrderNotificationTemplate } from "@/utils/sendgrid.util";
import { env } from "@/utils/env.util";
import { sendgridClient } from "@/configs/sendgrid.config";

export const ordersCreateWebhook = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const order = req.body;
    const customerEmail = order.customer?.email;
    const customerId = order.customer?.id;

    if (!customerEmail || !customerId) {
      res.status(400).send("Missing customer info");
      return;
    }

    const [customerRecord] = await database
      .select()
      .from(customers)
      .where(eq(customers.email, customerEmail));

    const storeId = customerRecord.storeId;
    const [store] = await database
      .select()
      .from(users)
      .where(eq(users.id, storeId as string));

    const storeUrl = store.shopify_url;
    const storeAccessToken = store.shopify_access_token;

    if (customerRecord?.tags?.includes("BLOCKED")) {
      await axios.post(
        `${storeUrl}/admin/api/2025-07/orders/${order.id}/cancel.json`,
        {},
        {
          headers: {
            "X-Shopify-Access-Token": storeAccessToken,
            "Content-Type": "application/json",
          },
        }
      );
      res.status(200).send("❌ Order cancelled (blocked)");
      return;
    }

    console.log("Customer ID:", customerId)

    const riskResult = await calculateRiskyOrders({
      storeId: storeId as string,
      customerId: customerId as string,
    });

    const highRiskOrder = riskResult.orders.find(
      (o) => o.flagged && o.reasons.includes("Shopify flagged HIGH risk")
    );

    console.log("THEEEE", highRiskOrder);

    if (highRiskOrder) {
      const msg = {
        to: store.email,
        from: {
          email: env.SENDGRID_SENDER_EMAIL!,
          name: env.SENDGRID_SENDER_NAME!,
        },
        subject: `High-Risk Order Alert: ${order.name}`,
        html: highRiskOrderNotificationTemplate({
          adminName: store.name || "Admin",
          orderName: order.name,
          customerEmail,
          riskReasons: highRiskOrder.reasons,
          orderLink: `${storeUrl}/admin/orders/${order.id}`,
        }),
        replyTo: env.SENDGRID_SENDER_EMAIL!,
      };

      await sendgridClient.send(msg);

      console.log("High-risk order email sent!");
    }

    res.status(200).send("✅ Webhook processed with risk check");
  } catch (error: any) {
    console.error("Webhook error:", error.response?.data || error);
    res.status(500).send("❌ Error processing webhook");
  }
};
