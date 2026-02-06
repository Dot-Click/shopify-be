import { database } from "@/configs/connection.config";
import { users } from "@/schema/schema";
import { logger } from "@/utils/logger.util";
import { count, sql, desc, gte } from "drizzle-orm"; // gt is for dates, gte is safer
import { Request, Response } from "express";
import status from "http-status";
import { subDays } from "date-fns"; // Import subDays

/**
 * Fetches key metrics related to store management, including 
 * new stores added in the last 30 days and store count by plan.
 */
export const OnboardingReportController = async (_req: Request, res: Response) => {
    try {
        console.log("Request received for Store Metrics data.");

        // 1. New Stores in the Last 30 Days
        const thirtyDaysAgo = subDays(new Date(), 30);
        
        const newStoresLast30Days = await database
            .select({ value: count() })
            .from(users)
            // Use gte (Greater Than or Equal) with the Drizzle eq helper for comparison
            .where(gte(users.createdAt, thirtyDaysAgo)); 
            // Note: The original raw SQL template: 
            // .where(sql`${users.createdAt} >= ${subDays(new Date(), 30)}`); 
            // is also valid but the Drizzle helper 'gte' is often preferred.

        // 2. Store Count Grouped by Plan
        const storesByPlan = await database
            .select({ plan: users.plan, count: count().as("count") })
            .from(users)
            .groupBy(users.plan)
            // Fix for PostgreSQL: use double quotes for the alias in ORDER BY
            .orderBy(desc(sql.raw('"count"'))); 

        console.log("Store Metrics data calculated successfully.");

        // Assemble and Send Response
        const metricsData = {
            newStoresLast30Days: newStoresLast30Days[0]?.value ?? 0,
            storesByPlan: storesByPlan,
        };

        res.status(status.OK).json(metricsData);

    } catch (error: any) {
        // Ensure the error is logged clearly
        logger.error("ERROR: Failed to fetch Store Metrics data:", error);
        res.status(status.INTERNAL_SERVER_ERROR).send({
            message: "Could not retrieve store metrics data.",
            error: error.message,
        });
    }
};