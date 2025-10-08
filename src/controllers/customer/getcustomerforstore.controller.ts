import status from "http-status";
import { Request, Response } from "express";
import { customers, settings } from "@/schema/schema";
import { eq, and } from "drizzle-orm";
import { database } from "@/configs/connection.config";
import axios from "axios";
import { logger } from "@/utils/logger.util";
import { calculateCustomerRisk } from "@/service/riskycustomer.service";
import { logActivity } from "@/service/logactivity.service";
import { decrypt } from "@/service/encryption.service";

/**
 * This is to fetch all the customers from the Shopfiy of logged in user.
 */
export const getCustomerRefundsAcrossStores = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const data = req.user;
    const storeUrl = data?.shopify_url;

    const getAccessToken = data?.shopify_access_token;
    const storeId = data?.id;

    if (!storeUrl || !getAccessToken || !storeId) {
      res
        .status(status.UNAUTHORIZED)
        .json({ error: "Missing Shopify credentials or Store ID" });
    }

    const accessToken = await decrypt(getAccessToken!);

    const settingsResult = await database
      .select()
      .from(settings)
      .where(eq(settings.storeId, storeId as string));

    if (!settingsResult) {
      res
        .status(status.BAD_REQUEST)
        .json({ error: "Please configure you settings." });
    }

    const riskSettings = settingsResult[0];

    const query = `
      {
        customers(first: 20) {
          edges {
            node {
              id
              displayName
              email
              phone
              tags
              orders(first: 50) {
                edges {
                  node {
                    legacyResourceId
                    createdAt
                    refunds(first: 10) {
                      id
                      createdAt
                    }
                  }
                }
              }
            }
          }
        }
      }
    `;

    const response = await axios.post(
      `${storeUrl}/admin/api/2025-07/graphql.json`,
      { query },
      {
        headers: {
          "X-Shopify-Access-Token": accessToken,
          "Content-Type": "application/json",
        },
      }
    );

    const customerEdges = response.data.data.customers.edges;

    const upsertPromises = [];

    for (const edge of customerEdges) {
      const node = edge.node;
      const refundedStores = new Set<string>();

      let lastKnownIp: string | null = null;
      let riskProfile = calculateCustomerRisk(node, riskSettings);

      const totalOrders = node.orders.edges.length;
      const totalRefunds = node.orders.edges.reduce(
        (acc: number, o: any) => acc + o.node.refunds.length,
        0
      );
      if (totalRefunds > 0 && storeId) {
        refundedStores.add(storeId);
      }
      if (node.orders.edges.length > 0) {
        const mostRecentOrder = node.orders.edges[0].node;
        const orderId = mostRecentOrder.legacyResourceId;

        try {
          const orderDetailsResp = await axios.get(
            `${storeUrl}/admin/api/2025-07/orders/${orderId}.json?fields=browser_ip`,
            {
              headers: {
                "X-Shopify-Access-Token": accessToken,
              },
            }
          );
          lastKnownIp = orderDetailsResp.data.order.browser_ip;
        } catch (apiError: any) {
          console.error(
            `Failed to fetch order ${orderId} for IP:`,
            apiError.response?.data || apiError.message
          );
        }
      }
      if (lastKnownIp) {
        const flaggedOnSameIp = await database
          .select()
          .from(customers)
          .where(
            and(eq(customers.ip, lastKnownIp), eq(customers.flagged, true))
          );

        if (flaggedOnSameIp.length > 0) {
          riskProfile = {
            isFlagged: true,
            riskLevel: 100,
            riskReason: `Shares IP (${lastKnownIp}) with a flagged customer.`,
          };
        }
      }

      const customerEmail = node.email ?? "N/A";

      let flaggedStoresCount = 0;
      if (customerEmail !== "N/A") {
        const flaggedStores = await database
          .selectDistinct({ storeId: customers.storeId })
          .from(customers)
          .where(
            and(eq(customers.email, customerEmail), eq(customers.flagged, true))
          );

        flaggedStoresCount = flaggedStores.length;
      }

      await logActivity({
        action: "UPSERT_CUSTOMER",
        for: "customer",
        storeId,
        customerId: node.id,
        meta: {
          totalOrders,
          totalRefunds,
          ip: lastKnownIp,
          flagged: riskProfile.isFlagged,
        },
      });
      const customerDataToUpsert = {
        id: node.id,
        name: node.displayName ?? "N/A",
        email: node.email ?? "N/A",
        phone: node.phone ?? "N/A",
        totalRefunded: String(totalRefunds),
        ip: lastKnownIp,
        totalOrders: totalOrders,
        flagged: riskProfile.isFlagged,
        riskLevel: Number(riskProfile.riskLevel),
        riskReason: riskProfile.riskReason ?? "",
        refundsFromStores: refundedStores.size,
        flaggedStoresCount,
        storeId: storeId,
        tags: Array.isArray(node.tags) ? node.tags.join(",") : "",
      };

      const promise = database
        .insert(customers)
        .values(customerDataToUpsert)
        .onConflictDoUpdate({
          target: customers.id,
          set: {
            ...customerDataToUpsert,
          },
        })
        .returning();

      upsertPromises.push(promise);
    }

    const resultFinal = await Promise.all(upsertPromises);

    res.status(status.OK).json({
      message: "Customers synced successfully.",
      data: resultFinal.flat(),
    });
  } catch (error: any) {
    console.error("Full error object in sync customers:", error);

    logger.error(
      "Error syncing customers:",
      error.response?.data || error.message
    );
    res
      .status(status.INTERNAL_SERVER_ERROR)
      .json({ error: "Failed to sync customers" });
  }
};
