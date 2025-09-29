import { database } from "@/configs/connection.config";
import { orders } from "@/schema/schema";
import { and, gte, lte, eq, or } from "drizzle-orm";
import { Request, Response } from "express";

export const getLossPreventionValueReport = async (
  req: Request,
  res: Response
) => {
  try {
    const { startDate, endDate } = req.query as {
      startDate?: string;
      endDate?: string;
    };

    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate
      ? new Date(startDate)
      : new Date(new Date().setDate(new Date().getDate() - 30));

    const flaggedOrders = await database
      .select()
      .from(orders)
      .where(
        and(
          gte(orders.createdAt, start),
          lte(orders.createdAt, end),
          or(eq(orders.flagged, true), eq(orders.autoCancel, true))
        )
      );

    const numPreventedOrFlagged = flaggedOrders.length;

    const revenueSaved = flaggedOrders.reduce((sum, o) => {
      return sum + (o.totalAmount ? Number(o.totalAmount) : 0);
    }, 0);

    const chartData: { date: string; orders: number }[] = [];

    flaggedOrders.forEach((o) => {
      if (!o.createdAt) return;
      const date = o.createdAt.toISOString().split("T")[0]; // Group by date (YYYY-MM-DD)

      const existing = chartData.find((d) => d.date === date);

      if (existing) {
        existing.orders += 1;
      } else {
        chartData.push({ date, orders: 1 });
      }
    });

    res.json({
      numPreventedOrFlagged,
      revenueSaved,
      chartData,
    });
  } catch (err) {
    console.error("Error generating Loss Prevention Value Report:", err);
    res.status(500).json({ error: "Failed to generate report" });
  }
};
