import { Request, Response } from "express";
import axios from "axios";
import { database } from "@/configs/connection.config";
import { customers, users, settings, notifications } from "@/schema/schema";
import { eq } from "drizzle-orm";
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
    const customerId = `gid://shopify/Customer/${order.customer?.id}`;

    if (!customerEmail || !customerId) {
      res.status(400).send("Missing customer info");
      return;
    }

    const [customerRecord] = await database
      .select()
      .from(customers)
      .where(eq(customers.email, customerEmail));

    if (!customerRecord) {
      console.error("No matching customer in DB for email:", customerEmail);
      res.status(404).send("Customer record not found");
      return; // Added return
    }
    const storeId = customerRecord.storeId;

    const [store] = await database
      .select()
      .from(users)
      .where(eq(users.id, storeId as string));
      
    // Defensive check
    if (!store) {
      res.status(404).send("Store owner not found");
      return;
    }

    const storeUrl = store.shopify_url;
    const storeAccessToken = store.shopify_access_token;

    console.log("storeUrl", storeUrl);
    console.log("storeAccessToken", storeAccessToken);
    
    // --- NEW: Fetch Notification Settings ---
    const [storeSettings] = await database
      .select()
      .from(settings)
      .where(eq(settings.storeId, storeId as string));

    // Fallback to defaults if no settings exist (shouldn't happen if properly seeded)
    const emailNotificationsEnabled = storeSettings?.emailNotificationsEnabled ?? true;
    const notificationEmail = storeSettings?.notificationEmail || store.email; // Use store.email as a final fallback
    const includeReasonForFlag = storeSettings?.includeReasonForFlag ?? true;
    const includeOrderDetails = storeSettings?.includeOrderDetails ?? true;
    const includeRecommendedAction = storeSettings?.includeRecommendedAction ?? true;
    const includeWavierLink = storeSettings?.includeWavierLink ?? false;
    // ----------------------------------------


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

    const riskResult = await calculateRiskyOrders({
      storeId: storeId as string,
      customerId: customerId as string,
      storeUrl: storeUrl as string,
      accessToken: storeAccessToken as string,
    });

    const highRiskOrder = riskResult.orders.find((o) => o.flagged === true);

    // --- Conditional Email Sending Based on Settings ---
    if (highRiskOrder && emailNotificationsEnabled) {
      const emailSubject = `High-Risk Order Alert: ${order.name}`;
      const orderLink = `${storeUrl}/admin/orders/${order.id}`;

      // Prepare data for the template, now checking settings
      const reasons = includeReasonForFlag ? highRiskOrder.reasons : ['Risk detected. Please check the order details.'];
      
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
          htmlContent: emailHtml
        });

        if (emailSent) {
          console.log(`Successfully sent high-risk alert email to ${notificationEmail} via Brevo.`);
        } else {
          console.error(`Failed to send high-risk alert email to ${notificationEmail}.`);
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