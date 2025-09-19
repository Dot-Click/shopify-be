import { database } from "@/configs/connection.config";
import { customers, orders, settings, users } from "@/schema/schema";
import { eq, sql, and } from "drizzle-orm";
import axios from "axios";

export const calculateRiskyOrders = async ({
  storeId,
  customerId,
  storeUrl,
  accessToken,
}: {
  storeId: string;
  customerId: string;
  storeUrl?: string;
  accessToken?: string;
}) => {
  // ---- Load settings ----
  const [setting] = await database
    .select()
    .from(settings)
    .where(eq(settings.storeId, storeId));

  if (!setting) throw new Error("Settings not found");

  const { lossRateThreshold } = setting;

  // ---- Load customer ----
  const [customerRecord] = await database
    .select()
    .from(customers)
    .where(eq(customers.id, customerId));

  if (!customerRecord) throw new Error("Customer not found");

  const { totalOrders, totalRefunded, riskySince, email, phone, riskLevel } =
    customerRecord;

  // Calculate percentage of refunds
  const refundRate =
    totalOrders && totalOrders > 0
      ? (Number(totalRefunded) / totalOrders) * 100
      : 0;

  const crossStoreQuery = await database
    .select({ storeId: customers.id })
    .from(customers)
    .innerJoin(users, eq(customers.id, users.id))
    .where(
      and(
        totalRefunded ? sql`${customers.totalRefunded} > 0` : sql`false`,
        email
          ? eq(customers.email, email)
          : phone
          ? eq(customers.phone, phone)
          : sql`false`
      )
    );

  const refundsFromStores = new Set(
    crossStoreQuery.map((row: any) => row.storeId)
  ).size;

  const customerRiskReasons: string[] = [];
  let isNowRisky = false;

  if (refundRate > (lossRateThreshold ?? 0)) {
    isNowRisky = true;
    customerRiskReasons.push(
      `Refund rate ${refundRate.toFixed(
        2
      )}% exceeds threshold ${lossRateThreshold}%`
    );
  }

  let effectiveRiskySince = riskySince;

  if (isNowRisky && !riskySince) {
    effectiveRiskySince = new Date();
    await database
      .update(customers)
      .set({ riskySince: effectiveRiskySince })
      .where(eq(customers.id, customerId));
  }

  // ---- Fetch customer orders via Shopify API ----
  const query = `
    query {
      customer(id: "${customerId}") {
        id
        displayName
        email
        phone
        orders(first: 10) {
          edges {
            node {
              id
              name
              createdAt
              totalPriceSet {
                shopMoney {
                  amount
                  currencyCode
                }
              }
              riskLevel
              refunds(first: 5) {                
                id
                totalRefundedSet {
                  shopMoney {
                    amount
                    currencyCode
                  }
                }
              }
              fulfillmentOrders(first: 5) {
                nodes {
                  id
                  status
                  requestStatus
                  fulfillBy
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
    { query, variables: { customerId } },
    {
      headers: {
        "X-Shopify-Access-Token": accessToken,
        "Content-Type": "application/json",
      },
    }
  );

  const customerData = response.data.data.customer;
  if (!customerData)
    throw new Error("Failed to fetch customer orders from Shopify");

  const shopifyOrders = customerData.orders.edges.map((edge: any) => edge.node);

  const orderResults: any[] = [];

  for (const ord of shopifyOrders) {
    const orderCreatedDate = new Date(ord.createdAt);

    let flagged = false;
    const reasons: string[] = [];

    // Only flag if customer is risky AND order created after riskySince
    if (
      isNowRisky &&
      effectiveRiskySince &&
      orderCreatedDate > effectiveRiskySince
    ) {
      flagged = true;
      reasons.push("Order placed after customer became risky");
    }

    let refundsTotal = 0;
    if (ord.refunds && ord.refunds.nodes && ord.refunds.nodes.length > 0) {
      refundsTotal = ord.refunds.nodes.reduce((sum: number, r: any) => {
        const amt = Number(r.totalSet.shopMoney.amount);
        return sum + (isNaN(amt) ? 0 : amt);
      }, 0);
    }

    const totalAmount = Number(ord.totalPriceSet.shopMoney.amount);

    if (refundsTotal >= totalAmount) {
      flagged = true;
      reasons.push("Order fully refunded");
    }

    if (ord.riskLevel === "HIGH") {
      flagged = true;
      reasons.push("Shopify risk level HIGH");
    }

    if (ord.fulfillmentOrders && ord.fulfillmentOrders.nodes) {
      for (const fo of ord.fulfillmentOrders.nodes) {
        if (fo.status !== "FULFILLED" && fo.fulfillBy) {
          const fulfillByDate = new Date(fo.fulfillBy);
          if (fulfillByDate < new Date()) {
            flagged = true;
            reasons.push("Fulfillment overdue");
            break;
          }
        }
      }
    }

    // Save order in DB if new
    const existing = await database
      .select()
      .from(orders)
      .where(eq(orders.id, ord.id));

    if (existing.length > 0 && existing[0].manualFlag) {
      if (existing[0].manualFlag === true) {
        flagged = true;
        reasons.push("Manually flagged");
      } else if (existing[0].manualFlag === false) {
        flagged = false;
        reasons.push("Manually unflagged");
      }
    }

    if (existing.length === 0) {
      await database.insert(orders).values({
        id: ord.id,
        name: ord.name,
        totalAmount: ord.totalPriceSet.shopMoney.amount,
        currency: ord.totalPriceSet.shopMoney.currencyCode,
        customerId,
        customerEmail: customerData.email,
        customerPhone: customerData.phone,
        riskLevel: ord.riskLevel,
        flagged,
        manualFlag: null,
        createdAt: orderCreatedDate,
        updatedAt: new Date(),
        totalRefunded: refundsTotal.toString(),
      });
    }

    orderResults.push({
      ...ord,
      totalAmount,
      flagged,
      manualFlag: null,
      reasons,
      refundsTotal,
    });
  }

  return {
    customer: {
      id: customerRecord.id,
      email: customerRecord.email,
      totalOrders: customerRecord.totalOrders,
      totalRefunded: customerRecord.totalRefunded,
      refundRate: refundRate.toFixed(2) + "%",
      isRisky: isNowRisky,
      riskySince: effectiveRiskySince,
      reasons: customerRiskReasons,
      manualFlag: null,
      refundsFromStores,
      riskLevel,
    },
    orders: orderResults,
  };
};
