import { database } from "@/configs/connection.config";
import { settings } from "@/schema/schema";
import status from "http-status";
import { Request, Response } from "express";
import { eq } from "drizzle-orm";

/**
 * Fetches settings for ANY store, used by Admins.
 * GET /api/settings/admin/fetch?storeId=ST_123
 */
export const adminFetchSettings = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { storeId } = req.query;

    if (!storeId || typeof storeId !== "string") {
      res.status(status.BAD_REQUEST).json({ message: "storeId is required as a query parameter" });
      return;
    }

    const [data] = await database
      .select()
      .from(settings)
      .where(eq(settings.storeId, storeId));

    res.status(status.OK).json({ 
        message: "Setting fetched successfully", 
        data: data || null 
    });
  } catch (error) {
    console.error("Admin Fetch Settings Error:", error);
    res.status(status.INTERNAL_SERVER_ERROR).json({ message: "Internal server error" });
  }
};

/**
 * Creates or updates settings for ANY store, used by Admins.
 * POST /api/settings/admin/update
 */
export const adminUpdateSettings = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const {
      storeId, // REQUIRED in body for admin update
      lostParcelThreshold,
      lostParcelPeriod,
      lossRateThreshold,
      matchSensitivity,
      primaryAction,
      requireESignature,
      forceCourierSignedDelivery,
      photoOnDelivery,
      sendCancellationEmail,
      includeWavierLink,
      emailNotificationsEnabled,
      notificationEmail,
      includeOrderDetails,
      includeReasonForFlag,
      includeRecommendedAction,
      autoHoldRiskyOrders,
      exclusionList,
      actionDelayHours,
    } = req.body;

    if (!storeId) {
      res.status(status.BAD_REQUEST).json({ message: "storeId is required in request body" });
      return;
    }

    const existing = await database
      .select()
      .from(settings)
      .where(eq(settings.storeId, storeId));

    if (existing.length > 0) {
      // Update
      await database
        .update(settings)
        .set({
          lostParcelThreshold,
          lostParcelPeriod,
          lossRateThreshold,
          matchSensitivity,
          primaryAction,
          requireESignature,
          forceCourierSignedDelivery,
          photoOnDelivery,
          sendCancellationEmail,
          includeWavierLink,
          autoHoldRiskyOrders,
          emailNotificationsEnabled,
          notificationEmail,
          includeOrderDetails,
          includeReasonForFlag,
          includeRecommendedAction,
          exclusionList,
          actionDelayHours,
          updatedAt: new Date(),
        })
        .where(eq(settings.storeId, storeId));
    } else {
      // Insert
      await database.insert(settings).values({
        storeId,
        lostParcelThreshold,
        lostParcelPeriod,
        lossRateThreshold,
        matchSensitivity,
        primaryAction,
        requireESignature,
        forceCourierSignedDelivery,
        photoOnDelivery,
        sendCancellationEmail,
        includeWavierLink,
        autoHoldRiskyOrders,
        emailNotificationsEnabled,
        notificationEmail,
        includeOrderDetails,
        includeReasonForFlag,
        includeRecommendedAction,
        exclusionList,
        actionDelayHours,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    res.status(status.OK).json({ message: "Store settings updated successfully by admin" });
  } catch (error) {
    console.error("Admin Update Settings Error:", error);
    res.status(status.INTERNAL_SERVER_ERROR).json({ message: "Internal server error" });
  }
};
