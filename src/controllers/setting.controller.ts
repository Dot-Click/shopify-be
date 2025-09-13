import { database } from "@/configs/connection.config";
import { settings } from "@/schema/schema";
import status from "http-status";
import { Request, Response } from "express";
import { eq } from "drizzle-orm";

export const createSettings = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const storeId = req.user?.id;

    if (!storeId) {
      res.status(status.BAD_REQUEST).json({ message: "Store ID is required" });
    }

    const {
      lostParcelThreshold,
      lostParcelPeriod,
      lossRateThreshold,
      matchSensitivity,
    } = req.body;

    const existing = await database
      .select()
      .from(settings)
      .where(eq(settings.storeId, storeId as string));

    if (existing.length > 0) {
      // Update existing
      await database
        .update(settings)
        .set({
          lostParcelThreshold,
          lostParcelPeriod,
          lossRateThreshold,
          matchSensitivity,
          updatedAt: new Date(),
        })
        .where(eq(settings.storeId, storeId as string));
    } else {
      // Insert new
      await database.insert(settings).values({
        storeId,
        lostParcelThreshold,
        lostParcelPeriod,
        lossRateThreshold,
        matchSensitivity,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    res.status(status.OK).json({ message: "Setting created successfully" });
  } catch (error) {
    res
      .status(status.INTERNAL_SERVER_ERROR)
      .json({ message: "Internal server error" });
  }
};
