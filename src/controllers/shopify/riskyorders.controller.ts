import { database } from "@/configs/connection.config";
import { Request, Response } from "express";
import status from "http-status";
import { eq } from "drizzle-orm";
import { customers, orders, settings } from "@/schema/schema";

export const getRiskyOrders = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const storeId = req.user?.id;
    const customerId = req.query.customerId as string;

    if (!storeId || !customerId) {
      res
        .status(status.BAD_REQUEST)
        .json({ message: "Store ID and Customer ID are required" });
      return;
    }

    // ---- Store settings ----
    const setting = await database
      .select()
      .from(settings)
      .where(eq(settings.storeId, storeId));

    if (setting.length === 0) {
      res.status(status.NOT_FOUND).json({ message: "Settings not found" });
      return;
    }

    const { lostParcelThreshold, lossRateThreshold } = setting[0];

    // ---- Customer info ----
    const customer = await database
      .select()
      .from(customers)
      .where(eq(customers.id, customerId));

    if (customer.length === 0) {
      res.status(status.NOT_FOUND).json({ message: "Customer not found" });
      return;
    }

    const { totalOrders, totalRefunded } = customer[0];
    const refundRate =
      totalOrders && totalOrders > 0
        ? (Number(totalRefunded) / totalOrders) * 100
        : 0;

    // Customer-level risk
    const customerRisk: { isRisky: boolean; reasons: string[] } = {
      isRisky: false,
      reasons: [],
    };
    if (refundRate > (lossRateThreshold ?? 0)) {
      customerRisk.isRisky = true;
      customerRisk.reasons.push(
        `Refund rate ${refundRate.toFixed(
          2
        )}% exceeds threshold ${lossRateThreshold}%`
      );
    }

    // ---- Orders for this customer ----
    const customerOrders = await database.query.orders.findMany({
      where: eq(orders.customerId, customerId),
      with: { fulfillmentOrders: true },
    });

    const orderResults: any[] = [];
    const flaggedOrders: { id: string; reason: string }[] = [];

    // Global overdue count (all orders for this customer)
    let globalOverdueCount = 0;
    for (const order of customerOrders) {
      const overdueOrders = order.fulfillmentOrders.filter(
        (fo) =>
          fo.fulfillBy &&
          new Date(fo.fulfillBy) < new Date() &&
          fo.status !== "FULFILLED"
      );
      globalOverdueCount += overdueOrders.length;
    }

    for (const order of customerOrders) {
      let flagged = false;
      const reasons: string[] = [];

      // Shopify risk checks
      if (order.riskLevel === "HIGH" || order.riskRecommendation === "CANCEL") {
        flagged = true;
        reasons.push("Shopify flagged this order as high risk");
      }

      // Full refund check
      if (
        order.totalRefunded &&
        Number(order.totalRefunded) >= Number(order.totalAmount)
      ) {
        flagged = true;
        reasons.push("Order fully refunded");
      }

      // Fulfillment overdue (per order)
      const overdueOrders = order.fulfillmentOrders.filter(
        (fo) =>
          fo.fulfillBy &&
          new Date(fo.fulfillBy) < new Date() &&
          fo.status !== "FULFILLED"
      );
      if (overdueOrders.length > 0) {
        flagged = true;
        reasons.push("Order fulfillment overdue");
      }

      // Global lost parcel threshold (all orders)
      if (globalOverdueCount >= (lostParcelThreshold ?? 0)) {
        flagged = true;
        reasons.push(
          `Lost parcel threshold exceeded (${globalOverdueCount}/${lostParcelThreshold})`
        );
      }

      // Fulfillment on hold / rejected
      for (const fo of order.fulfillmentOrders) {
        if (fo.onHoldReason) {
          flagged = true;
          reasons.push(`Fulfillment on hold: ${fo.onHoldReason}`);
        }
        if (fo.requestStatus === "REJECTED") {
          flagged = true;
          reasons.push("Fulfillment request rejected");
        }
      }

      if (flagged) {
        flaggedOrders.push({
          id: order.id,
          reason: reasons.join("; "),
        });
      }

      orderResults.push({
        ...order,
        flagged,
        reasons,
      });
    }

    // ---- Batch update flagged orders ----
    if (flaggedOrders.length > 0) {
      for (const fo of flaggedOrders) {
        await database
          .update(orders)
          .set({ flagged: true, flagReason: fo.reason })
          .where(eq(orders.id, fo.id));
      }
    }

    res.status(status.OK).json({
      customer: {
        ...customer[0],
        refundRate: refundRate.toFixed(2) + "%",
        isRisky: customerRisk.isRisky,
        reasons: customerRisk.reasons,
      },
      orders: orderResults,
    });
  } catch (error: any) {
    console.error(error);
    res
      .status(status.INTERNAL_SERVER_ERROR)
      .json({ message: "Internal server error" });
  }
};
