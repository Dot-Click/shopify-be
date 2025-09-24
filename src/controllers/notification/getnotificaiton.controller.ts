import { desc, eq } from "drizzle-orm";
import { database } from "@/configs/connection.config";
import { notifications, customers } from "@/schema/schema";
import { logger } from "@/utils/logger.util";
import { Request, Response } from "express";
import status from "http-status";

export const getNotificationController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(status.UNAUTHORIZED).json({ message: "Unauthorized" });
      return;
    }

    const notifs = await database
      .select({
        notification: notifications,
        customerName: customers.name,
      })
      .from(notifications)
      .leftJoin(customers, eq(notifications.customerId, customers.id))
      .where(eq(notifications.storeId, userId as string))
      .orderBy(desc(notifications.createdAt));

    const data = notifs.map((row) => {
      return {
        ...row.notification,
        customerName: row.customerName ?? null,
      };
    });

    res.status(status.OK).json({ data });
  } catch (error: any) {
    logger.error("Error in getNotificationController:", error);
    res
      .status(status.INTERNAL_SERVER_ERROR)
      .json({ message: "Internal Server Error" });
  }
};
