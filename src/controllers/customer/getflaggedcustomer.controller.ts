import { database } from "@/configs/connection.config";
import { customers, users } from "@/schema/schema";
import { eq, inArray, sql } from "drizzle-orm";
import { Request, Response } from "express";
import status from "http-status";

export const getFlaggedCustomersAndStores = async (
  _req: Request,
  res: Response
) => {
  try {
    const flaggedCustomers = await database
      .select({
        id: sql<string>`MIN(${customers.id})`.as("id"),
        email: customers.email,
        name: sql<string>`MIN(${customers.name})`.as("name"),
        riskLevel: sql<number>`MAX(${customers.riskLevel})`.as("riskLevel"),
        totalRiskReport: sql<number>`COUNT(DISTINCT ${customers.storeId})`.as(
          "totalRiskReport"
        ),
        storeIds: sql<string[]>`ARRAY_AGG(DISTINCT ${customers.storeId})`.as(
          "storeIds"
        ),
      })
      .from(customers)
      .where(eq(customers.flagged, true))
      .groupBy(customers.email);

    // Fetch all affected stores
    const storeIds = flaggedCustomers.flatMap((c) => c.storeIds);
    const storesAffected = await database
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        shopifyApiKey: users.shopify_api_key,
      })
      .from(users)
      .where(inArray(users.id, storeIds));
    console.log(storesAffected);
    console.log(flaggedCustomers);
    res.status(status.OK).json({
      success: true,
      flaggedCustomers,
      storesAffected,
    });
  } catch (error) {
    console.error("Error fetching flagged customers and stores:", error);
    res.status(status.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Failed to fetch flagged customers and stores",
    });
  }
};
