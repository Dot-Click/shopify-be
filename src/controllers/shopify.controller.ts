import { database } from "@/configs/connection.config";
import axios from "axios";
import { Request, Response } from "express";
import status from "http-status";
import { eq, ne } from "drizzle-orm";
import {
  customers,
  fulfillmentOrders,
  orderItems,
  orders,
  users,
} from "@/schema/schema";

/**
 * This is to fetch all the customers from the Shopfiy of logged in user and the other controllers should be deleted.
 */
export const getCustomerRefundsAcrossStores = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const data = req.user;
    const storeUrl = data?.shopify_url;
    const accessToken = data?.shopify_access_token;

    if (!storeUrl || !accessToken) {
      res
        .status(status.UNAUTHORIZED)
        .json({ error: "Missing Shopify credentials" });
      return;
    }

    const query = `
      {
        customers(first: 20) {
          edges {
            node {
              id
              displayName
              email
              numberOfOrders
              orders(first: 50) {
                edges {
                  node {
                    refunds(first: 10) {
                      id
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

    if (response.data.errors) {
      console.error("Shopify API returned errors:", response.data.errors);
      throw new Error("Failed to fetch data from Shopify due to API errors.");
    }

    const customerEdges = response.data.data.customers.edges;

    const otherStores = await database
      .select()
      .from(users)
      .where(ne(users.shopify_url, storeUrl as string));

    const results: any[] = [];

    for (const edge of customerEdges) {
      const node = edge.node;
      const email = node.email;

      const totalOrders = node.orders.edges.length;

      const totalRefunds = node.orders.edges.reduce(
        (acc: number, o: any) => acc + (o.node.refunds?.length || 0),
        0
      );

      const riskLevel =
        totalOrders > 0 ? Math.round((totalRefunds / totalOrders) * 100) : 0;

      const refundedStores = new Set<string>();

      for (const s of otherStores) {
        if (!s.shopify_url?.includes(".myshopify.com")) continue;
        try {
          const refundQuery = `
            {
              customers(first: 1, query: "email:${email}") {
                edges {
                  node {
                    orders(first: 20) {
                      edges {
                        node {
                          refunds(first: 1) {
                            
                              
                                id
                              
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

          const resp = await axios.post(
            `${s.shopify_url}/admin/api/2025-07/graphql.json`,
            { query: refundQuery },
            {
              headers: {
                "X-Shopify-Access-Token": s.shopify_access_token,
                "Content-Type": "application/json",
              },
            }
          );

          const custEdges = resp.data.data.customers.edges;
          if (custEdges.length > 0) {
            const custNode = custEdges[0].node;

            const refundsHere = custNode.orders.edges.some(
              (o: any) => (o.node.refunds?.length || 0) > 0
            );
            if (refundsHere) {
              refundedStores.add(s.shopify_url as string);
            }
          }
        } catch (err) {
          console.error("Error checking other store:", s.shopify_url, err);
        }
      }

      const existingProfile = await database
        .select()
        .from(customers)
        .where(eq(customers.id, node.id));

      if (existingProfile.length > 0) {
        // If profile exists, UPDATE it
        await database
          .update(customers)
          .set({
            totalOrders: totalOrders,
            totalRefunded: totalRefunds,
            riskLevel: riskLevel,
            refundsFromStores: refundedStores.size,
            updatedAt: new Date(), // Update the timestamp
          })
          .where(eq(customers.id, node.id));
      } else {
        // If profile does not exist, INSERT it
        await database.insert(customers).values({
          id: node.id,
          email: email,
          totalOrders: totalOrders,
          totalRefunded: totalRefunds,
          riskLevel: riskLevel,
          refundsFromStores: refundedStores.size,
        });
      }

      results.push({
        id: node.id,
        displayName: node.displayName,
        email,
        riskLevel,
        totalOrders,
        totalRefunds,
        refundsFromStores: refundedStores.size,
      });
    }

    res.status(status.OK).json(results);
  } catch (error: any) {
    console.error(
      "Error fetching customer risk:",
      error.response?.data || error
    );
    res
      .status(status.INTERNAL_SERVER_ERROR)
      .json({ error: "Failed to fetch customer risk" });
  }
};

/**
 *
 * This is to fetch all the orders from the Shopfiy
 */
export const getOrders = async (req: Request, res: Response) => {
  try {
    const data = req.user;

    const storeUrl = data?.shopify_url;
    const accessToken = data?.shopify_access_token;
    console.log(storeUrl, storeUrl);
    let order: any[] = [];
    // let hasNextPage = true;
    // let cursor: string | null = null;
    // let count = 0;

    // while (hasNextPage) {

    const query = `
  query GetOrdersWithFulfillment {
    orders(first: 10) {
      edges {
        cursor
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
          customer {
            id
            firstName
            lastName
            email
            phone
          }
          riskLevel
          refunds(){
            id
            totalRefundedSet {
              shopMoney {
                amount
                currencyCode
              }
            }
          }
          lineItems(first: 5) {
            edges {
              node {
                id
                name
                quantity
              }
            }
          }

          fulfillmentOrders(first: 5) {
            nodes {
              id
              status
              requestStatus
              createdAt
              updatedAt
              fulfillAt
              fulfillBy
              fulfillmentHolds {
                reason
                reasonNotes
              }
              deliveryMethod {
                methodType
                minDeliveryDateTime
                maxDeliveryDateTime
              }
              destination {
                city
                countryCode
                zip
              }
            }
          }
        }
      }
      pageInfo {
        hasNextPage
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

    const orderData = response.data.data.orders;
    const edges = orderData.edges;

    for (const edge of edges) {
      const node = edge.node;

      let totalRefunded = 0;
      if (node.refunds && node.refunds.length > 0) {
        totalRefunded = node.refunds.reduce((sum: number, refund: any) => {
          return sum + Number(refund.totalRefundedSet.shopMoney.amount);
        }, 0);
      }

      const existing = await database
        .select()
        .from(orders)
        .where(eq(orders.id, node.id));

      if (existing.length > 0) {
        await database
          .update(orders)
          .set({
            name: node.displayName,
            totalAmount: node.totalPriceSet.shopMoney.amount,
            currency: node.totalPriceSet.shopMoney.currencyCode,
            customerId: node.customer.id,
            customerEmail: node.customer.email,
            customerPhone: node.customer.phone,
            riskLevel: node.riskLevel,
            totalRefunded: totalRefunded.toString(),
            updatedAt: new Date(),
          })
          .where(eq(orders.id, node.id));
      } else {
        await database.insert(orders).values({
          id: node.id,
          name: node.customer.firstName + " " + node.customer.lastName,
          totalAmount: node.totalPriceSet.shopMoney.amount,
          currency: node.totalPriceSet.shopMoney.currencyCode,
          customerId: node.customer.id,
          customerEmail: node.customer.email,
          customerPhone: node.customer.phone,
          riskLevel: node.riskLevel,
          totalRefunded: totalRefunded.toString(),
          createdAt: node.createdAt ? new Date(node.createdAt) : new Date(),
          updatedAt: new Date(),
        });
      }

      for (const lineItem of node.lineItems.edges) {
        const lineItemNode = lineItem.node;

        const existingLineItem = await database
          .select()
          .from(orderItems)
          .where(eq(orderItems.id, lineItemNode.id));

        if (existingLineItem.length > 0) {
          await database
            .update(orderItems)
            .set({
              name: lineItemNode.name,
              quantity: lineItemNode.quantity,
            })
            .where(eq(orderItems.id, lineItemNode.id));
        } else {
          await database.insert(orderItems).values({
            id: lineItemNode.id,
            orderId: node.id,
            name: lineItemNode.name,
            quantity: lineItemNode.quantity,
          });
        }
      }

      for (const fo of node.fulfillmentOrders.nodes) {
        const existingFO = await database
          .select()
          .from(fulfillmentOrders)
          .where(eq(fulfillmentOrders.id, fo.id));

        if (existingFO.length > 0) {
          await database
            .update(fulfillmentOrders)
            .set({
              orderId: node.id,
              status: fo.status,
              requestStatus: fo.requestStatus,
              fulfillAt: fo.fulfillAt ? new Date(fo.fulfillAt as string) : null,
              fulfillBy: fo.fulfillBy ? new Date(fo.fulfillBy as string) : null,
              deliveryMethod: fo.deliveryMethod?.methodType,
              deliveryMinDate: fo.deliveryMethod?.minDeliveryDateTime,
              deliveryMaxDate: fo.deliveryMethod?.maxDeliveryDateTime,
              destCity: fo.destination?.city,
              destCountry: fo.destination?.countryCode,
              destZip: fo.destination?.zip,
              onHoldReason: fo.fulfillmentHolds?.[0]?.reason || null,
            })
            .where(eq(fulfillmentOrders.id, fo.id));
        } else {
          await database.insert(fulfillmentOrders).values({
            id: fo.id,
            orderId: node.id,
            status: fo.status,
            requestStatus: fo.requestStatus,
            fulfillAt: fo.fulfillAt ? new Date(fo.fulfillAt as string) : null,
            fulfillBy: fo.fulfillBy ? new Date(fo.fulfillBy as string) : null,
            deliveryMethod: fo.deliveryMethod?.methodType,
            deliveryMinDate: fo.deliveryMethod?.minDeliveryDateTime
              ? new Date(fo.deliveryMethod.minDeliveryDateTime as string)
              : null,
            deliveryMaxDate: fo.deliveryMethod?.maxDeliveryDateTime
              ? new Date(fo.deliveryMethod.maxDeliveryDateTime as string)
              : null,
            destCity: fo.destination?.city,
            destCountry: fo.destination?.countryCode,
            destZip: fo.destination?.zip,
            onHoldReason: fo.fulfillmentHolds?.[0]?.reason || null,
          });
        }
      }

      order.push(node);
    }

    const simplifiedOrders = edges.map((edge: any) => {
      const node = edge.node;

      return {
        id: node.id,
        name: node.name,
        createdAt: node.createdAt,
        totalAmount: node.totalPriceSet.shopMoney.amount,
        currency: node.totalPriceSet.shopMoney.currencyCode,
        customerId: node.customer?.id,
        customerEmail: node.customer?.email,
        customerPhone: node.customer?.phone,
        riskLevel: node.riskLevel,
        totalRefunded: node.totalRefunded,
        fulfillmentOrders: node.fulfillmentOrders.nodes.map((fo: any) => ({
          id: fo.id,
          status: fo.status,
          requestStatus: fo.requestStatus,
          createdAt: fo.createdAt,
          updatedAt: fo.updatedAt,
          fulfillAt: fo.fulfillAt,
          fulfillBy: fo.fulfillBy,
          deliveryMethod: fo.deliveryMethod?.methodType || null,
          deliveryMinDate: fo.deliveryMethod?.minDeliveryDateTime || null,
          deliveryMaxDate: fo.deliveryMethod?.maxDeliveryDateTime || null,
          destination: {
            city: fo.destination?.city || null,
            countryCode: fo.destination?.countryCode || null,
            zip: fo.destination?.zip || null,
          },
          holds: fo.fulfillmentHolds.map((h: any) => ({
            reason: h.reason,
            notes: h.reasonNotes,
          })),
        })),

        // Items still included
        items: node.lineItems.edges.map((li: any) => ({
          orderItemId: li.node.id,
          orderItemName: li.node.name,
          orderItemQuantity: li.node.quantity,
        })),
      };
    });

    res.status(status.OK).json(simplifiedOrders);
  } catch (error: any) {
    console.error("Error fetching orders:", error.response?.data || error);
    res.status(status.INTERNAL_SERVER_ERROR).json({
      error: "Failed to fetch orders",
    });
  }
};

/**
 * this is for admin dashboard, to fetch all customer of all stores
 */
export const getCustomersForAdminDashboard = async (
  _req: Request,
  res: Response
) => {
  try {
    const allStores = await database.select().from(users);

    const customerMap: Record<string, any> = {};

    for (const s of allStores) {
      if (!s.shopify_url?.includes(".myshopify.com")) continue;

      const query = `
      {
        customers(first: 20) {
          edges {
            node {
              id
              displayName
              email
              phone
              numberOfOrders
              orders(first: 50) {
                edges {
                  node {
                    legacyResourceId
                    refunds(first: 10) {
                      id

                    }
                  }
                }
              }
            }
          }
        }
      }`;

      const resp = await axios.post(
        `${s.shopify_url}/admin/api/2025-07/graphql.json`,
        { query },
        {
          headers: {
            "X-Shopify-Access-Token": s.shopify_access_token,
            "Content-Type": "application/json",
          },
        }
      );

      const customerEdges = resp.data.data.customers.edges;

      for (const edge of customerEdges) {
        const node = edge.node;
        const email = node.email;
        if (!email) continue;

        const totalOrders = node.orders.edges.length;
        const totalRefunds = node.orders.edges.reduce(
          (acc: number, o: any) => acc + o.node.refunds.length,
          0
        );

        let lastKnownIp = null;

        if (node.orders.edges.length > 0) {
          const mostRecentOrder = node.orders.edges[0].node;
          const orderId = mostRecentOrder.legacyResourceId;

          try {
            const orderDetailsResp = await axios.get(
              `${s.shopify_url}/admin/api/2025-07/orders/${orderId}.json?fields=browser_ip`,
              {
                headers: {
                  "X-Shopify-Access-Token": s.shopify_access_token,
                },
              }
            );

            lastKnownIp = orderDetailsResp.data.order.browser_ip;
          } catch (apiError: any) {
            console.error(
              `Failed to fetch order ${orderId} for IP:`,
              apiError.response?.data
            );
          }
        }

        if (!customerMap[email]) {
          customerMap[email] = {
            id: node.id,
            displayName: node.displayName,
            email,
            phone: node.phone,
            totalOrders: 0,
            totalRefunds: 0,
            storesRefunded: new Set<string>(),
            lastKnownIp: null,
          };
        }

        customerMap[email].totalOrders += totalOrders;
        customerMap[email].totalRefunds += totalRefunds;

        if (lastKnownIp && !customerMap[email].lastKnownIp) {
          customerMap[email].lastKnownIp = lastKnownIp;
        }

        if (totalRefunds > 0) {
          customerMap[email].storesRefunded.add(s.shopify_url as string);
        }
      }
    }

    const results = Object.values(customerMap).map((c: any) => ({
      id: c.id,
      email: c.email,
      displayName: c.displayName,
      lastKnownIp: c.lastKnownIp,
      totalOrders: c.totalOrders,
      phone: c.phone,
      totalRefunds: c.totalRefunds,
      riskLevel:
        c.totalOrders > 0
          ? Math.round((c.totalRefunds / c.totalOrders) * 100)
          : 0,
      refundsFromStores: c.storesRefunded.size, // ✅ fixed
    }));

    res.status(status.OK).json(results);
  } catch (error: any) {
    console.error(
      "Error fetching customers for admin dashboard:",
      error.response?.data || error
    );
    res.status(status.INTERNAL_SERVER_ERROR).json({
      error: "Failed to fetch customers for admin dashboard",
    });
  }
};
