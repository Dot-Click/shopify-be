import { Request, Response } from "express";
import { database } from "@/configs/connection.config";
import { customers } from "@/schema/schema";
import { sql } from "drizzle-orm";
import status from "http-status";

export const getMonthlyRiskIncidents = async (_req: Request, res: Response) => {
  try {
    const incidents = await database
      .select({
        month: sql<string>`TO_CHAR(${customers.createdAt}, 'YYYY-MM')`,
        count: sql<number>`COUNT(*)`,
      })
      .from(customers)
      .where(sql`${customers.flagged} = true`)
      .groupBy(sql`TO_CHAR(${customers.createdAt}, 'YYYY-MM')`)
      .orderBy(sql`TO_CHAR(${customers.createdAt}, 'YYYY-MM')`);

    res.status(status.OK).json({
      message: "Monthly flagged risk incidents fetched successfully",
      data: incidents,
    });
  } catch (error: any) {
    console.error("Error in getMonthlyRiskIncidents:", error);
    res.status(status.INTERNAL_SERVER_ERROR).json({
      message: "Failed to fetch monthly risk incidents",
    });
  }
};
