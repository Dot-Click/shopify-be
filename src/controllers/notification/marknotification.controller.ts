import { Request, Response } from "express";
import { database } from "@/configs/connection.config";
import { notifications } from "@/schema/schema";
import { and, eq } from "drizzle-orm";
import status from "http-status";
import { logger } from "@/utils/logger.util";

export const markNotificationSeen = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const user = req.user;

    if (!user) {
      res.status(status.UNAUTHORIZED).json({
        message: "User not authenticated",
      });
      return;
    }

    const notif = await database.query.notifications.findFirst({
      where: eq(notifications.id, id),
    });

    if (!notif) {
      console.log("Notification not found:", id);
      res.status(status.NOT_FOUND).json({ message: "Notification not found" });
    }

    // Update notification to mark as read
    await database
      .update(notifications)
      .set({ read: true, updatedAt: new Date() })
      .where(and(eq(notifications.id, id), eq(notifications.storeId, user.id)));

    res.status(200).json({
      message: "Notification marked as read",
      data: { id, read: true },
    });
  } catch (error: any) {
    logger.error("Error in markNotificationSeen:", error);
    res
      .status(status.INTERNAL_SERVER_ERROR)
      .json({ message: "Internal Server Error" });
  }
};
