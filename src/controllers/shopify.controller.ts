import { database } from "@/configs/connection.config";
import axios from "axios";
import { Request, Response } from "express";
import status from "http-status";
import { eq, ne } from "drizzle-orm";
import { orderItems, orders, users } from "@/schema/schema";

/**
 * This is to fetch all the customers from the Shopfiy of logged in user and the other controllers should be deleted.
 */
export const getCustomerRefundsAcrossStores = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const data = req.user; // logged in store
    const storeUrl = data?.shopify_url;
    const accessToken = data?.shopify_access_token;

    if (!storeUrl || !accessToken) {
      res
        .status(status.UNAUTHORIZED)
        .json({ error: "Missing Shopify credentials" });
    }

    // Fetch customers from THIS store only
    const query = `
      {
        customers(first: 20) {
          edges {
            node {
              id
              displayName
              email
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

    const customerEdges = response.data.data.customers.edges;

    // Fetch all other stores (exclude logged-in one)
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
        (acc: number, o: any) => acc + o.node.refunds.length,
        0
      );

      const riskLevel =
        totalOrders > 0 ? Math.round((totalRefunds / totalOrders) * 100) : 0;

      // Check how many OTHER stores this customer refunded in
      const refundedStores = new Set<string>();

      for (const s of otherStores) {
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
              (o: any) => o.node.refunds.length > 0
            );
            if (refundsHere) {
              refundedStores.add(s.shopify_url as string);
            }
          }
        } catch (err) {
          console.error("Error checking other store:", s.shopify_url, err);
        }
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

    let order: any[] = [];
    // let hasNextPage = true;
    // let cursor: string | null = null;
    // let count = 0;

    // while (hasNextPage) {

    const query = `
        {
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
                lineItems(first: 5) {
                  edges {
                    node {
                      id
                      name
                      quantity           
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
      if (!s.shopify_url?.includes(".myshopify.com")) continue; // skip fake stores

      const query = `
      {
        customers(first: 20) {
          edges {
            node {
              id
              displayName
              email
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

        if (!customerMap[email]) {
          customerMap[email] = {
            id: node.id,
            displayName: node.displayName,
            email,
            totalOrders: 0,
            totalRefunds: 0,
            storesRefunded: new Set<string>(),
          };
        }

        customerMap[email].totalOrders += totalOrders;
        customerMap[email].totalRefunds += totalRefunds;

        // ✅ only add store if refunds exist
        if (totalRefunds > 0) {
          customerMap[email].storesRefunded.add(s.shopify_url as string);
        }
      }
    }

    const results = Object.values(customerMap).map((c: any) => ({
      email: c.email,
      displayName: c.displayName,
      totalOrders: c.totalOrders,
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
