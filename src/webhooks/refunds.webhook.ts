import { Request, Response } from "express";
import { database } from "@/configs/connection.config";
import { customers, notifications, orders } from "@/schema/schema";
import { eq } from "drizzle-orm";

export const refundsCreateWebhook = async (req: Request, res: Response) => {
  try {
    const refund = req.body; // Shopify sends refund + order details here
    const orderId = `gid://shopify/Order/${refund.order_id}`;

    // Fetch order & customer
    const [orderRecord] = await database
      .select()
      .from(orders)
      .where(eq(orders.id, orderId));

    if (!orderRecord) {
      res.status(404).send("Order not found");
      return;
    }

    const [customerRecord] = await database
      .select()
      .from(customers)
      .where(eq(customers.id, orderRecord.customerId));

    // Build notification payload
    const notificationData = {
      storeId: customerRecord?.storeId ?? "",
      customerId: customerRecord?.id ?? null,
      type: "REFUND",
      title: `Refund detected for ${orderRecord.name}`,
      message: `${customerRecord?.name || "Customer"} refunded order ${
        orderRecord.name
      }`,
      meta: {
        orderId: orderRecord.id,
        orderName: orderRecord.name,
        totalAmount: orderRecord.totalAmount?.toString(),
        currency: orderRecord.currency,
        customerEmail: customerRecord?.email,
        ip: customerRecord?.ip,
        location: "London, UK", // 👉 you'd enrich this via IP lookup (like ipinfo API)
        riskLevel: `${customerRecord?.riskLevel || "N/A"}%`,
        detectedOn: new Date().toISOString(),
      },
    };

    await database.insert(notifications).values(notificationData);

    console.log("Refund notification created:", notificationData);

    res.status(200).send("✅ Refund webhook processed");
  } catch (error: any) {
    console.error("Refund webhook error:", error);
    res.status(500).send("❌ Failed to process refund webhook");
  }
};
