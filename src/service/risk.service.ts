import { database } from "@/configs/connection.config";
import { customers, orders, settings, users } from "@/schema/schema";
import { eq, sql, and } from "drizzle-orm";
import axios from "axios";

interface ExclusionItem {
  id: string;
  type: "customer" | "address";
  value: string;
}

/** Check if customer email is in the exclusion list (email only, no order/address logic). */
function isEmailExcluded(
  exclusionList: string | null | undefined,
  customerEmail: string | null | undefined
): boolean {
  if (!exclusionList || !customerEmail) return false;
  try {
    const exclusions: ExclusionItem[] = Array.isArray(exclusionList)
      ? exclusionList
      : JSON.parse(exclusionList || "[]");
    if (!Array.isArray(exclusions) || exclusions.length === 0) return false;
    const emailLower = customerEmail.toLowerCase().trim();
    return exclusions.some(
      (item) =>
        item.type === "customer" &&
        item.value.toLowerCase().trim() === emailLower
    );
  } catch (error) {
    console.error("Error parsing exclusion list:", error);
    return false;
  }
}

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

  const { lossRateThreshold, exclusionList } = setting;

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

  // If customer email is in exclusion list, do not treat as risky (orders still appear, none flagged)
  const customerExcluded = isEmailExcluded(exclusionList, email);

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

  if (!customerExcluded && refundRate > (lossRateThreshold ?? 0)) {
    isNowRisky = true;
    customerRiskReasons.push(
      `Refund rate ${refundRate.toFixed(
        2
      )}% exceeds threshold ${lossRateThreshold}%`
    );
  }

  let effectiveRiskySince = riskySince;

  if (isNowRisky && !riskySince) {
    const now = new Date();
    effectiveRiskySince = now;
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
        orders(first: 100) {
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

  let response;
  try {
    response = await axios.post(
      `${storeUrl}/admin/api/2024-07/graphql.json`,
      { query, variables: { customerId } },
      {
        headers: {
          "X-Shopify-Access-Token": accessToken,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (axiosError: any) {
    console.error("Axios error fetching from Shopify:", axiosError.response?.data || axiosError.message);
    throw axiosError;
  }

  if (response.data.errors) {
    console.error("Shopify GraphQL Errors:", JSON.stringify(response.data.errors, null, 2));
  }

  let customerData = response.data.data?.customer;

  // Fallback: If searching by ID failed, try searching by email
  if (!customerData && email) {
    console.log(`Customer not found by ID (${customerId}). Attempting fallback search by email: ${email}`);
    const searchQuery = `
      query($emailQuery: String!) {
        customers(first: 1, query: $emailQuery) {
          edges {
            node {
              id
              displayName
              email
              phone
              orders(first: 100) {
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
        }
      }
    `;

    try {
      const searchResponse = await axios.post(
        `${storeUrl}/admin/api/2024-07/graphql.json`,
        { 
          query: searchQuery, 
          variables: { emailQuery: `email:${email}` } 
        },
        {
          headers: {
            "X-Shopify-Access-Token": accessToken,
            "Content-Type": "application/json",
          },
        }
      );

      const firstMatch = searchResponse.data.data?.customers?.edges?.[0]?.node;
      if (firstMatch) {
        console.log(`Found customer match via email search. New ID: ${firstMatch.id}`);
        customerData = firstMatch;
      }
    } catch (searchError: any) {
      console.error("Error during fallback email search:", searchError.message);
    }
  }

  if (!customerData) {
    console.error("Shopify Response Data (Final Failure):", JSON.stringify(response.data, null, 2));
    throw new Error(`Failed to fetch customer orders from Shopify. Customer ID: ${customerId}, Email: ${email}`);
  }

  const shopifyOrders = customerData.orders.edges.map((edge: any) => edge.node);

  const orderResults: any[] = [];

  for (const ord of shopifyOrders) {
    let flagged = false;
    const reasons: string[] = [];

    let riskySinceDate: number | null = null;

    if (effectiveRiskySince) {
      riskySinceDate = new Date(effectiveRiskySince).getTime();
    }

    const orderCreatedDate = new Date(ord.createdAt).getTime();
    const orderCreatedDateVal = new Date(ord.createdAt);
    const isRiskyCustomer = !customerExcluded && (isNowRisky || !!effectiveRiskySince);

    if (
      isRiskyCustomer &&
      riskySinceDate !== null &&
      orderCreatedDate >= riskySinceDate
    ) {
      flagged = true;
      reasons.push("Customer became risky before this order");
      // Add the specific reasons why the customer was flagged
      if (customerRiskReasons.length > 0) {
        reasons.push(...customerRiskReasons);
      }
    }

    let refundsTotal = 0;
    if (ord.refunds && Array.isArray(ord.refunds) && ord.refunds.length > 0) {
      refundsTotal = ord.refunds.reduce((sum: number, r: any) => {
        const amt = Number(r.totalRefundedSet?.shopMoney?.amount || 0);
        return sum + (isNaN(amt) ? 0 : amt);
      }, 0);
    }

    const totalAmount = Number(ord.totalPriceSet.shopMoney.amount);

    if (refundsTotal >= totalAmount) {
      flagged = true;
      reasons.push("Order fully refunded");
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
        flagged: customerExcluded ? false : flagged,
        manualFlag: null,
        createdAt: orderCreatedDateVal,
        updatedAt: new Date(),
        totalRefunded: refundsTotal.toString(),
      });
    }

    orderResults.push({
      ...ord,
      totalAmount,
      flagged: customerExcluded ? false : flagged,
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
