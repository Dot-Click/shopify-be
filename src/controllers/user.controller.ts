import { database } from "@/configs/connection.config";
import { users } from "@/schema/schema";
import { logger } from "@/utils/logger.util";
import { eq } from "drizzle-orm";
import { Request, Response } from "express";
import { status } from "http-status";

export const fetchStoresController = async (
  _req: Request,
  res: Response
): Promise<void> => {
  try {
    const allStores = await database.query.users.findMany();

    res.status(status.OK).json({
      message: "All stores fetched successfully",
      data: allStores,
    });
  } catch (error) {
    logger.error("Error in fetchStoresController:", error);
    res.status(status.INTERNAL_SERVER_ERROR).json({
      message: "An error occurred while fetching stores.",
    });
  }
};

export const updateStoreStatusController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { userId, isVerified } = req.body;
    const store = await database.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!store) {
      res.status(status.NOT_FOUND).json({
        message: "Store not found.",
      });
      return;
    }

    await database
      .update(users)
      .set({ emailVerified: isVerified })
      .where(eq(users.id, userId));

    res.status(status.OK).json({
      message: "Store status updated successfully",
    });
  } catch (error) {
    logger.error("Error in updateStoreStatusController:", error);
    res.status(status.INTERNAL_SERVER_ERROR).json({
      message: "An error occurred while updating store status.",
    });
  }
};
