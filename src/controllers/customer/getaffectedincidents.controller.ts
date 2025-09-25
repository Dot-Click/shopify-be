import { Request, Response } from "express";
import status from "http-status";
import { database } from "@/configs/connection.config";
import { customers } from "@/schema/schema";
import { sql } from "drizzle-orm";

export const getRiskChartData = async (_req: Request, res: Response) => {
  try {
    //Risky users per month
    const riskyUsers = await database
      .select({
        month: sql<string>`TO_CHAR(${customers.riskySince}, 'Mon')`,
        year: sql<string>`TO_CHAR(${customers.riskySince}, 'YYYY')`,
        count: sql<number>`COUNT(*)`,
      })
      .from(customers)
      .where(
        sql`${customers.riskLevel} IS NOT NULL AND ${customers.riskySince} IS NOT NULL`
      )
      .groupBy(
        sql`TO_CHAR(${customers.riskySince}, 'Mon')`,
        sql`TO_CHAR(${customers.riskySince}, 'YYYY')`
      )
      .orderBy(sql`MIN(${customers.riskySince})`);

    //Affected stores per month (distinct storeId)
    const affectedStores = await database
      .select({
        month: sql<string>`TO_CHAR(${customers.riskySince}, 'Mon')`,
        year: sql<string>`TO_CHAR(${customers.riskySince}, 'YYYY')`,
        count: sql<number>`COUNT(DISTINCT ${customers.storeId})`,
      })
      .from(customers)
      .where(
        sql`${customers.riskLevel} IS NOT NULL AND ${customers.riskySince} IS NOT NULL`
      )
      .groupBy(
        sql`TO_CHAR(${customers.riskySince}, 'Mon')`,
        sql`TO_CHAR(${customers.riskySince}, 'YYYY')`
      )
      .orderBy(sql`MIN(${customers.riskySince})`);

    const chartData = riskyUsers.map((u) => {
      const match = affectedStores.find(
        (s) => s.month === u.month && s.year === u.year
      );
      return {
        month: `${u.month} ${u.year}`,
        riskIncidents: u.count,
        affectedStores: match ? match.count : 0,
      };
    });

    res.status(status.OK).json({
      success: true,
      data: chartData,
    });
  } catch (error) {
    console.error("Error fetching risk chart data:", error);
    res.status(status.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Failed to fetch risk chart data",
    });
  }
};
