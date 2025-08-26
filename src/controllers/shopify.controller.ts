import { database } from "@/configs/connection.config";
import axios from "axios";
import { Request, Response } from "express";
import status from "http-status";
import { eq } from "drizzle-orm";
import { customers, orderItems, orders } from "@/schema/schema";

export const getCustomers = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const data = req.user;

    const storeUrl = data?.shopify_url;
    const accessToken = data?.shopify_access_token;

    let customer: any[] = [];
    let hasNextPage = true;
    let cursor: string | null = null;
    // let count = 0;

    while (hasNextPage) {
      const query: any = `
        {
          customers(first: 20 ${cursor ? `, after: "${cursor}"` : ""}) {
            edges {
              cursor
              node {
                id
                displayName
                email
                phone
                image{
                  url
                }
               orders(first: 10){
                edges{
                  node{
                    refunds(first: 10){
                      id
                    }
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

      const customerData = response.data.data.customers;
      const edges = customerData.edges;

      for (const edge of edges) {
        const node = edge.node;

        const existing = await database
          .select()
          .from(customers)
          .where(eq(customers.id, node.id));

        if (existing.length > 0) {
          await database
            .update(customers)
            .set({
              name: node.displayName,
              email: node.email,
              phone: node.phone,
            })
            .where(eq(customers.id, node.id));
        } else {
          await database.insert(customers).values({
            id: node.id,
            name: node.displayName,
            email: node.email,
            phone: node.phone,
          });
        }

        customer.push(node);
      }

      hasNextPage = customerData.pageInfo.hasNextPage;
      cursor = edges.length > 0 ? edges[edges.length - 1].cursor : null;
    }

    res.status(status.OK).json(customer);
  } catch (error: any) {
    console.error("Error fetching customers:", error.response?.data || error);
    res.status(status.INTERNAL_SERVER_ERROR).json({
      error: "Failed to fetch customers",
    });
  }
};

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
