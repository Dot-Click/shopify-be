import { Request, Response } from "express";
import axios from "axios";
import { database } from "@/configs/connection.config";
import { customers, users, settings, notifications } from "@/schema/schema";
import { and, eq } from "drizzle-orm";
import { calculateRiskyOrders } from "@/service/risk.service";
import { sendPushToStore } from "@/service/push.service";
import { highRiskOrderNotificationTemplate } from "@/utils/sendgrid.util";
import { sendEmail } from "@/configs/brevo.config";

export const ordersCreateWebhook = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const order = req.body;
    const customerEmail = order.customer?.email;
    const shopDomain = req.headers["x-shopify-shop-domain"] as string;

    console.log(`Received webhook from shop: ${shopDomain} for order: ${order.name}`);

    if (!shopDomain) {
      res.status(400).send("Missing shop domain header");
      return;
    }

    // 1. Find the store owner (user) by shop domain
    const [store] = await database
      .select()
      .from(users)
      .where(eq(users.shopify_url, `https://${shopDomain}`));

    if (!store) {
      console.error(`Store not found in DB for domain: ${shopDomain}`);
      res.status(404).send("Store not found");
      return;
    }

    const storeId = store.id;
    const storeUrl = store.shopify_url;
    const storeAccessToken = store.shopify_access_token;

    // 2. Find the customer for THIS specific store
    const [customerRecord] = await database
      .select()
      .from(customers)
      .where(
        and(
          eq(customers.email, customerEmail as string),
          eq(customers.storeId, storeId as string)
        )
      );

    console.log("customerRecord", customerRecord);

    if (!customerRecord) {
      console.error(`Customer ${customerEmail} not found in DB for store ${shopDomain}`);
      // Optional: Auto-create customer if missing, but for now we follow existing logic
      res.status(404).send("Customer record not found for this store");
      return;
    }

    // Ensure customerId is a proper Global ID
    let rawCustomerId = order.customer?.id;
    let customerId = "";
    if (rawCustomerId) {
      customerId = String(rawCustomerId).startsWith("gid://shopify/Customer/")
        ? String(rawCustomerId)
        : `gid://shopify/Customer/${rawCustomerId}`;
    }

    console.log("Customer GID for analysis:", customerId);

    console.log("storeUrl", storeUrl);
    console.log("storeAccessToken", storeAccessToken);
    
    // --- NEW: Fetch Notification Settings ---
    const [storeSettings] = await database
      .select()
      .from(settings)
      .where(eq(settings.storeId, storeId as string));

    // Fallback to defaults if no settings exist (shouldn't happen if properly seeded)
    const emailNotificationsEnabled =
      storeSettings?.emailNotificationsEnabled ?? true;
    const notificationEmail = storeSettings?.notificationEmail || store.email; // Use store.email as a final fallback
    const includeReasonForFlag = storeSettings?.includeReasonForFlag ?? true;
    const includeOrderDetails = storeSettings?.includeOrderDetails ?? true;
    const includeRecommendedAction =
      storeSettings?.includeRecommendedAction ?? true;
    const includeWavierLink = storeSettings?.includeWavierLink ?? false;
    const autoHoldRiskyOrders = storeSettings?.autoHoldRiskyOrders ?? false;
    const primaryAction = storeSettings?.primaryAction || "hold"; // Default to hold
    // ----------------------------------------

    if (customerRecord?.tags?.includes("BLOCKED")) {
      await axios.post(
        `${storeUrl}/admin/api/2025-07/orders/${order.id}/cancel.json`,
        {
          reason: "declined", // Or "fraud"
          email: true,
          note: "Order cancelled because the customer is on the blocked list in eComProtect.",
        },
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

    const riskResult = await calculateRiskyOrders({
      storeId: storeId as string,
      customerId: customerId as string,
      storeUrl: storeUrl as string,
      accessToken: storeAccessToken as string,
    });

    const highRiskOrder = riskResult.orders.find((o) => o.flagged === true);

    // Sync Shopify ID if it changed (e.g., found via fallback)
    if (riskResult.customer.id && riskResult.customer.id !== customerId) {
      console.log(`Syncing corrected Shopify Customer ID to DB: ${riskResult.customer.id}`);
      await database
        .update(customers)
        .set({ id: riskResult.customer.id })
        .where(eq(customers.email, customerEmail));
    }

    console.log("Risk Analysis Result:", {
      isFlagged: !!highRiskOrder,
      reasons: highRiskOrder?.reasons || [],
      settings: {
        autoHoldRiskyOrders,
        primaryAction,
        emailNotificationsEnabled
      }
    });

    // --- Action: Automatic Fulfillment Hold or Cancellation (Risky Orders) ---
    if (highRiskOrder && autoHoldRiskyOrders) {
      if (primaryAction === "hold") {
        try {
          console.log(`Attempting to hold fulfillment for risky order: ${order.id}`);

          // 1. Fetch fulfillment orders for the order
          const fulfillmentOrdersResponse = await axios.get(
            `${storeUrl}/admin/api/2025-07/orders/${order.id}/fulfillment_orders.json`,
            {
              headers: {
                "X-Shopify-Access-Token": storeAccessToken,
              },
            }
          );

          const openFulfillmentOrders =
            fulfillmentOrdersResponse.data.fulfillment_orders.filter(
              (fo: any) => fo.status === "open"
            );

          console.log(
            `Found ${openFulfillmentOrders.length} open fulfillment orders to hold.`
          );

          // 2. Put each fulfillment order on hold
          for (const fo of openFulfillmentOrders) {
            await axios.post(
              `${storeUrl}/admin/api/2025-07/fulfillment_orders/${fo.id}/hold.json`,
              {
                fulfillment_hold: {
                  reason: "other",
                  reason_notes: `High-risk order detected by eComProtect. Reasons: ${highRiskOrder.reasons.join(", ")}`,
                },
              },
              {
                headers: {
                  "X-Shopify-Access-Token": storeAccessToken,
                  "Content-Type": "application/json",
                },
              }
            );
            console.log(`Fulfillment order ${fo.id} placed on hold.`);
          }
        } catch (holdError: any) {
          console.error(
            "Error placing fulfillment on hold:",
            holdError?.response?.data || holdError.message
          );
        }
      } else if (primaryAction === "auto_cancel") {
        try {
          console.log(`Attempting to automatically cancel risky order: ${order.id}`);
          await axios.post(
            `${storeUrl}/admin/api/2025-07/orders/${order.id}/cancel.json`,
            {
              reason: "fraud",
              email: true,
              note: `Automatically cancelled by eComProtect due to high risk. Reasons: ${highRiskOrder.reasons.join(", ")}`,
            },
            {
              headers: {
                "X-Shopify-Access-Token": storeAccessToken,
                "Content-Type": "application/json",
              },
            }
          );
          console.log(`Order ${order.id} automatically cancelled.`);
        } catch (cancelError: any) {
          console.error(
            "Error automatically cancelling order:",
            cancelError?.response?.data || cancelError.message
          );
        }
      }
    }
    // ---------------------------------------------------------

    // --- Conditional Email Sending Based on Settings ---
    if (highRiskOrder && emailNotificationsEnabled) {
      const emailSubject = `High-Risk Order Alert: ${order.name}`;
      const orderLink = `${storeUrl}/admin/orders/${order.id}`;

      // Prepare data for the template, now checking settings
      const reasons = includeReasonForFlag
        ? highRiskOrder.reasons
        : ["Risk detected. Please check the order details."];

      // NOTE: You'll need to update your highRiskOrderNotificationTemplate
      // to accept these new options and conditionally render sections.
      const emailHtml = highRiskOrderNotificationTemplate({
        adminName: store.name || "Admin",
        orderName: order.name,
        customerEmail,
        riskReasons: reasons,
        orderLink: orderLink,
        // Passing new flags to the template for advanced rendering
        includeOrderDetails,
        includeRecommendedAction,
        includeWavierLink,
        // You'll need logic to pass the actual content for these too
        // recommendedAction: storeSettings?.primaryAction, // Example
      });

      try {
        const emailSent = await sendEmail({
          to: notificationEmail, // Use the configured notification email
          subject: emailSubject,
          htmlContent: emailHtml,
        });

        if (emailSent) {
          console.log(
            `Successfully sent high-risk alert email to ${notificationEmail} via Brevo.`
          );
        } else {
          console.error(
            `Failed to send high-risk alert email to ${notificationEmail}.`
          );
        }
      } catch (emailError) {
        console.error("Error sending high-risk email via Brevo:", emailError);
      }
    }

    // Create in-app notification and send push for high-risk orders
    if (highRiskOrder) {
      const notificationPayload = {
        storeId: storeId as string,
        customerId: customerRecord.id,
        type: "HIGH_RISK_ORDER",
        title: `High-Risk Order: ${order.name}`,
        message: `Risk detected for order ${order.name} (${customerEmail}).`,
        meta: {
          orderId: `gid://shopify/Order/${order.id}`,
          orderName: order.name,
          reasons: highRiskOrder.reasons,
        },
      };
      const [inserted] = await database
        .insert(notifications)
        .values(notificationPayload)
        .returning({ id: notifications.id });
      if (inserted?.id) {
        sendPushToStore(storeId as string, {
          title: notificationPayload.title,
          message: notificationPayload.message,
          notificationId: inserted.id,
        }).catch(() => {});
      }
    }
    // ----------------------------------------------------

    res.status(200).send("✅ Webhook processed with risk check");
  } catch (error: any) {
    console.log("error", error);
    res.status(500).send("❌ Error processing webhook");
  }
};