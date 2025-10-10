import { database } from "@/configs/connection.config";
import { settings } from "@/schema/schema";
import status from "http-status";
import { Request, Response } from "express";
import { eq } from "drizzle-orm";

export const fetchSettings = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const storeId = req.user?.id;

    if (!storeId) {
      res.status(status.BAD_REQUEST).json({ message: "Store ID is required" });
      return;
    }
    const [existing] = await database
      .select()
      .from(settings)
      .where(eq(settings.storeId, storeId as string));

    res
      .status(status.OK)
      .json({ message: "Setting created successfully", data: existing });
  } catch (error) {
    res
      .status(status.INTERNAL_SERVER_ERROR)
      .json({ message: "Internal server error" });
  }
};
