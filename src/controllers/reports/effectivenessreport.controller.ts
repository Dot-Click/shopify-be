import { database } from "@/configs/connection.config";
import { orders } from "@/schema/schema"; // Only need the orders schema
import { logger } from "@/utils/logger.util";
import { sql } from "drizzle-orm";
import { Request, Response } from "express";
import status from "http-status";


export const effectivenessController = async (_req: Request, res: Response) => {
    try {
        console.log("Request received for Risk Effectiveness data.");

        // 1. Cumulative Effectiveness Statistics
        const [effectivenessStats] = await database
            .select({
                totalFlagged:
                    sql<number>`COUNT(CASE WHEN ${orders.flagged} = true THEN 1 END)`
                        .as("totalFlagged"),
                
                cancelledAndFlagged:
                    sql<number>`COUNT(CASE WHEN ${orders.flagged} = true AND ${orders.fulfillmentStatus} = 'cancelled' THEN 1 END)`
                        .as("cancelledAndFlagged"),
                
                // Note: PostgreSQL SUM on NUMERIC will return a string, so .as() with <number> is important
                preventedLoss:
                    sql<number>`SUM(CASE WHEN ${orders.flagged} = true AND ${orders.fulfillmentStatus} = 'cancelled' THEN ${orders.totalAmount} ELSE 0 END)`
                        .as("preventedLoss"),
            })
            .from(orders);

        // 2. Monthly Prevented Loss
        const monthlyPreventedLoss = await database
            .select({
                month: sql<Date>`DATE_TRUNC('month', ${orders.createdAt})`.as("month"),
                
                // Note: Same SUM logic, aliased as 'amount'
                amount:
                    sql<number>`SUM(CASE WHEN ${orders.flagged} = true AND ${orders.fulfillmentStatus} = 'cancelled' THEN ${orders.totalAmount} ELSE 0 END)`
                        .as("amount"),
            })
            .from(orders)
            .groupBy(sql`month`)
            .orderBy(sql`month`);

        console.log("Risk Effectiveness data calculated successfully.");

        // Assemble and Send Response
        const metricsData = {
            cumulativeStats: {
                totalFlagged: effectivenessStats.totalFlagged,
                cancelledAndFlagged: effectivenessStats.cancelledAndFlagged,
                preventedLoss: effectivenessStats.preventedLoss,
            },
            monthlyPreventedLoss: monthlyPreventedLoss,
        };

        res.status(status.OK).json(metricsData);

    } catch (error: any) {
        // Log the error and send a 500 response
        logger.error("ERROR: Failed to fetch Risk Effectiveness data:", error);
        res.status(status.INTERNAL_SERVER_ERROR).send({
            message: "Could not retrieve effectiveness data.",
            error: error.message,
        });
    }
};