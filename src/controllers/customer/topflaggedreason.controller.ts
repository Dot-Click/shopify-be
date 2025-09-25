import { Request, Response } from "express";
import { database } from "@/configs/connection.config";
import { customers } from "@/schema/schema";
import { eq, desc, sql } from "drizzle-orm";
import status from "http-status";

export const getTopFlaggedReasons = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      res
        .status(status.UNAUTHORIZED)
        .json({ message: "User not authenticated" });
      return;
    }

    const reasons = await database
      .select({
        riskReason: customers.riskReason,
        count: sql<number>`COUNT(*)`,
      })
      .from(customers)
      .where(eq(customers.flagged, true))
      .groupBy(customers.riskReason)
      .orderBy(desc(sql`COUNT(*)`))
      .limit(3);

    res.status(status.OK).json({
      message: "Top flagged reasons fetched successfully",
      data: reasons,
    });
  } catch (error: any) {
    console.error("Error in getTopFlaggedReasons:", error);
    res.status(status.INTERNAL_SERVER_ERROR).json({
      message: "Failed to fetch flagged reasons",
    });
  }
};
