import { database } from "@/configs/connection.config";
import { customers } from "@/schema/schema";
import { and, desc, eq, isNotNull, sql } from "drizzle-orm";
import { Request, Response } from "express";
import status from "http-status";

export const getTopRiskyIPs = async (_req: Request, res: Response) => {
  try {
    const results = await database
      .select({
        ip: customers.ip,
        count: sql<number>`COUNT(*)`.as("count"),
      })
      .from(customers)
      .where(and(eq(customers.flagged, true), isNotNull(customers.ip)))
      .groupBy(customers.ip)
      .orderBy(desc(sql`COUNT(*)`))
      .limit(10);

    const totalIPs = results.filter((c) => c.count > 0).length;

    res.status(status.OK).json(totalIPs);
  } catch (error) {
    console.error("Error fetching Top Risky IPs:", error);
    res
      .status(status.INTERNAL_SERVER_ERROR)
      .json({ error: "Failed to fetch Top Risky IPs" });
  }
};
