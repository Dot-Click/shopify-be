/**
 * Web Push notifications. Optional: set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY in .env.
 * Generate with: npx web-push generate-vapid-keys
 */
import webpush from "web-push";
import { database } from "@/configs/connection.config";
import { pushSubscriptions } from "@/schema/schema";
import { eq } from "drizzle-orm";
import { logger } from "@/utils/logger.util";

const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(
    "mailto:support@ecomprotect.com",
    vapidPublicKey,
    vapidPrivateKey
  );
}

export interface PushPayload {
  title: string;
  message: string;
  url?: string;
  notificationId?: string;
}

export async function sendPushToStore(
  storeId: string,
  payload: PushPayload
): Promise<void> {
  if (!vapidPublicKey || !vapidPrivateKey) {
    logger.warn("Web Push: VAPID keys not set, skipping push.");
    return;
  }

  const subs = await database
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.storeId, storeId));

  const body = JSON.stringify({
    title: payload.title,
    body: payload.message,
    url: payload.url ?? "/user/notification",
    notificationId: payload.notificationId,
  });

  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dhKey,
            auth: sub.authKey,
          },
        },
        body,
        { TTL: 86400 }
      );
    } catch (err: unknown) {
      const statusCode = (err as { statusCode?: number })?.statusCode;
      if (statusCode === 410 || statusCode === 404) {
        await database
          .delete(pushSubscriptions)
          .where(eq(pushSubscriptions.id, sub.id));
        logger.info(`Removed expired push subscription for store ${storeId}`);
      } else {
        logger.error("Web Push send failed:", err);
      }
    }
  }
}

export function getVapidPublicKey(): string | null {
  return vapidPublicKey ?? null;
}
