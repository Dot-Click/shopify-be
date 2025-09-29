import { database } from "@/configs/connection.config";
import { orders } from "@/schema/schema";
import { between } from "drizzle-orm";
import { Request, Response } from "express";

// Suspicious Orders Summary
export const getSuspiciousOrdersSummary = async (
  req: Request,
  res: Response
) => {
  try {
    const { startDate, endDate } = req.query;
    console.log("QUERY:-", req.query);
    const end = endDate ? new Date(endDate as string) : new Date();
    const start = startDate
      ? new Date(startDate as string)
      : new Date(new Date().setDate(end.getDate() - 30));

    const allOrders = await database
      .select()
      .from(orders)
      .where(between(orders.createdAt, start, end));

    const totalOrders = allOrders.length;

    const flaggedOrders = allOrders.filter((o) => o.flagged).length;

    const autoCancelled = allOrders.filter((o) => o.autoCancel).length;

    const preventedValue = allOrders
      .filter((o) => o.flagged || o.autoCancel)
      .reduce((sum, o) => sum + Number(o.totalAmount ?? 0), 0);

    // Chart data (group by day)
    const flaggedByDay: Record<string, number> = {};
    allOrders
      .filter((o) => o.flagged)
      .forEach((o) => {
        const day = o?.createdAt?.toISOString().split("T")[0];
        if (day) {
          flaggedByDay[day] = (flaggedByDay[day] || 0) + 1;
        }
      });

    res.json({
      range: { start, end },
      metrics: {
        totalOrders,
        flaggedOrders,
        autoCancelled,
        preventedValue,
      },
      chartData: Object.entries(flaggedByDay).map(([date, count]) => ({
        date,
        count,
      })),
    });

    return;
  } catch (err) {
    console.error("Error generating Suspicious Orders Summary:", err);
    res.status(500).json({ error: "Failed to generate report" });
  }
};
