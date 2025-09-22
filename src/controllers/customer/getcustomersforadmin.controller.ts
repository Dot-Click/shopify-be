import { database } from "@/configs/connection.config";
import { customers } from "@/schema/schema";
import { Request, Response } from "express";
import status from "http-status";

/**
 * this is for admin dashboard, to fetch all customer of all stores
 */
export const getCustomersForAdminDashboard = async (
  _req: Request,
  res: Response
) => {
  try {
    const allCustomers = await database.select().from(customers);

    const customerMap: Record<string, any> = {};

    for (const c of allCustomers) {
      const email = c.email;
      if (!email) continue;

      if (!customerMap[email]) {
        customerMap[email] = {
          id: c.id,
          displayName: c.name,
          email,
          phone: c.phone,
          lastKnownIp: c.ip,
          totalOrders: 0,
          totalRefunds: 0,
          storesRefunded: new Set<string>(),
          riskLevel: 0,
          reasons: [] as string[],
        };
      }

      customerMap[email].totalOrders += c.totalOrders;
      customerMap[email].totalRefunds += Number(c.totalRefunded);

      const totalRefunded = c.totalRefunded ? Number(c.totalRefunded) : 0;

      if (totalRefunded > 0) {
        customerMap[email].storesRefunded.add(c.storeId);
      }

      const riskLevel = c.riskLevel ? Number(c.riskLevel) : 0;

      // Keep max risk level across stores
      customerMap[email].riskLevel = Math.max(
        customerMap[email].riskLevel,
        riskLevel
      );
    }

    const results = Object.values(customerMap).map((c: any) => ({
      id: c.id,
      displayName: c.displayName,
      email: c.email,
      phone: c.phone ?? null,
      lastKnownIp: c.lastKnownIp ?? null,
      totalOrders: c.totalOrders,
      totalRefunds: c.totalRefunds,
      riskLevel: c.riskLevel,
      refundsFromStores: c.storesRefunded.size,
      reasons: c.reasons,
    }));

    res.status(status.OK).json(results);
  } catch (error: any) {
    console.error("Error fetching customers for admin dashboard:", error);
    res.status(status.INTERNAL_SERVER_ERROR).json({
      error: "Failed to fetch customers for admin dashboard",
    });
  }
};
