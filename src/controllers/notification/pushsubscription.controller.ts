import { Request, Response } from "express";
import status from "http-status";
import { database } from "@/configs/connection.config";
import { pushSubscriptions } from "@/schema/schema";
import { eq, and } from "drizzle-orm";
import { getVapidPublicKey } from "@/service/push.service";
import { logger } from "@/utils/logger.util";

export const getVapidPublicKeyController = (_req: Request, res: Response) => {
  const key = getVapidPublicKey();
  if (!key) {
    res.status(status.SERVICE_UNAVAILABLE).json({
      message: "Push notifications are not configured",
    });
    return;
  }
  res.json({ vapidPublicKey: key });
};

export const savePushSubscriptionController = async (
  req: Request,
  res: Response
) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(status.UNAUTHORIZED).json({ message: "Unauthorized" });
      return;
    }

    const { endpoint, keys } = req.body as {
      endpoint: string;
      keys: { p256dh: string; auth: string };
    };

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      res.status(status.BAD_REQUEST).json({
        message: "Missing endpoint or keys (p256dh, auth)",
      });
      return;
    }

    const existing = await database
      .select()
      .from(pushSubscriptions)
      .where(
        and(
          eq(pushSubscriptions.storeId, userId),
          eq(pushSubscriptions.endpoint, endpoint)
        )
      );

    if (existing.length > 0) {
      res.status(status.OK).json({ message: "Subscription already saved" });
      return;
    }

    await database.insert(pushSubscriptions).values({
      storeId: userId,
      endpoint,
      p256dhKey: keys.p256dh,
      authKey: keys.auth,
    });

    res.status(status.CREATED).json({ message: "Push subscription saved" });
  } catch (error) {
    logger.error("Error saving push subscription:", error);
    res
      .status(status.INTERNAL_SERVER_ERROR)
      .json({ message: "Failed to save push subscription" });
  }
};
