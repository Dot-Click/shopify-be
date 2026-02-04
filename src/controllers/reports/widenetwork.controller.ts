import { database } from "@/configs/connection.config";
import { customers, orders } from "@/schema/schema";
import { logger } from "@/utils/logger.util";
import { count, sql, desc, eq, and, inArray, gt } from "drizzle-orm"; // Added eq, and, inArray, gt
import { Request, Response } from "express";
import status from "http-status";

/**
 * Fetches the required data for the Risk Dashboard, including
 * total flags, top domains, repeat risk trend, and location data.
 */
export const riskDashboardController = async (_req: Request, res: Response) => {
    try {
        console.log("Request received for Risk Dashboard Data.");

        // 1. Total Flagged Orders Network-Wide
        const totalFlaggedOrders = await database
            .select({ value: count() })
            .from(orders)
            .where(eq(orders.flagged, true)); // Using eq for safety

        // 2. Top 10 Repeated Email Domains
        const topDomains = await database
            .select({
                domain:
                    sql`SUBSTRING(${customers.email} FROM POSITION('@' IN ${customers.email}) + 1)`.as(
                        "domain"
                    ),
                count: count().as("count"),
            })
            .from(orders) // Join orders to filter only flagged ones
            .innerJoin(customers, eq(orders.customerId, customers.id))
            .where(eq(orders.flagged, true))
            .groupBy(sql`domain`)
            .orderBy(desc(sql`count`))
            .limit(10);

        // 3. Growth of “repeat risk” cases month over month
        // Logic: An order is "repeat risk" if the customer has more than one flagged order.

        // 3a. Find all customer IDs that have been flagged more than once
        const repeatCustomerIds = await database
            .select({ id: orders.customerId })
            .from(orders)
            .where(eq(orders.flagged, true))
            .groupBy(orders.customerId)
            .having(gt(count(orders.id), 1)); // Count orders by ID to ensure correct grouping

        const customerIdsList = repeatCustomerIds
            .map(c => c.id)
            .filter((id): id is string => id !== null) as string[];

        // 3b. Count the flagged orders by month *for those repeat risk customers*
        // Only proceed if there are repeat customers to avoid an empty `inArray` causing errors
        const monthlyRepeatRiskOrders = customerIdsList.length > 0
            ? await database
                .select({
                    month: sql<Date>`date_trunc('month', ${orders.createdAt})`.as("month"),
                    count: count().as("count"),
                })
                .from(orders)
                .where(
                    and(
                        eq(orders.flagged, true),
                        inArray(orders.customerId, customerIdsList)
                    )
                )
                .groupBy(sql`month`)
                .orderBy(sql`month`)
            : [];

        // 4. Geographic Data for Heat Map (Using Postcodes as location data)
        // Needs a query to get locations with the highest number of flagged orders.
        const topFlaggedLocations = await database
            .select()
            .from(orders)
            .innerJoin(customers, eq(orders.customerId, customers.id))
            .where(and(
                eq(orders.flagged, true)
            ))
            .orderBy(desc(sql`count`))
            .limit(100); // Limit to a reasonable number for map rendering

        console.log("Risk Dashboard data calculated successfully.");

        // Assemble and Send Response
        const dashboardData = {
            totalFlaggedOrders: totalFlaggedOrders[0].value,
            top10Domains: topDomains,
            monthlyRepeatRisk: monthlyRepeatRiskOrders,
            flaggedLocations: topFlaggedLocations,
        };

        res.status(status.OK).json(dashboardData);

    } catch (error: any) {
        logger.error("ERROR: Failed to fetch Risk Dashboard data:", error);
        res.status(status.INTERNAL_SERVER_ERROR).send({
            message: "Could not retrieve dashboard data.",
            error: error.message,
        });
    }
};