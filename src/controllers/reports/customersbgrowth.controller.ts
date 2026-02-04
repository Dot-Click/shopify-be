import { database } from "@/configs/connection.config";
import { users } from "@/schema/schema";
import { logActivity } from "@/service/logactivity.service";
import { logger } from "@/utils/logger.util";
import { subDays } from "date-fns";
import { count, sql, desc, asc } from "drizzle-orm";
import { Request, Response } from "express";
import status from "http-status";

export const getStoreGrowthMetrics = async (req: Request, res: Response) => {
    try {
        const user = req.user?.id;

        if (!user) {
            res.status(status.BAD_REQUEST).json({ message: "Not a valid user!" });
            logger.error("Not a valid user!");
            return;
        }

        // 1. Total Stores Count
        const [totalStoresResult] = await database
            .select({ count: count() })
            .from(users);

        // 2. New Stores (Last 30 Days)
        const [newStoresResult] = await database
            .select({ count: count() })
            .from(users)
            .where(sql`${users.createdAt} >= ${subDays(new Date(), 30)}`);

        // 3. Stores by Plan Distribution
        const storesByPlan = await database
            .select({
                plan: users.plan,
                count: count()
            })
            .from(users)
            .groupBy(users.plan)
            .orderBy(desc(count()));

        // 4. Monthly Growth Trend (New stores per month)
        // Useful for a Line/Bar chart
        const monthlyGrowth = await database
            .select({
                month: sql`TO_CHAR(${users.createdAt}, 'YYYY-MM')`.as("month"), // PostgreSQL specific
                // For MySQL use: sql`DATE_FORMAT(${users.createdAt}, '%Y-%m')`
                count: count().as("count"),
            })
            .from(users)
            .groupBy(sql`month`)
            .orderBy(asc(sql`month`))
            .limit(12); // Last 12 months

        const data = {
            totalStores: totalStoresResult?.count ?? 0,
            newStoresLast30Days: newStoresResult?.count ?? 0,
            storesByPlan: storesByPlan.map(p => ({
                plan: p.plan || "Unknown",
                count: p.count
            })),
            growthTrend: monthlyGrowth
        };

        // Log the view action
        await logActivity({
            action: "VIEW_STORE_GROWTH",
            for: "store",
            storeId: user,
            meta: { timestamp: new Date().toISOString() },
        });

        res.status(status.OK).json({
            success: true,
            data: data,
        });

    } catch (error: any) {
        console.error("ERROR: Failed to fetch Store Growth metrics:", error);
        res.status(status.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: "Could not fetch store growth metrics.",
            error: error.message,
        });
    }
};