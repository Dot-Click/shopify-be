import { status } from "http-status";
import { Request, Response } from "express";
import { logger } from "@/utils/logger.util";
import { database } from "@/configs/connection.config";
import { customers } from "@/schema/schema";
import { eq } from "drizzle-orm";
import axios from "axios";

export const blockCustomer = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { customerId } = req.query;
    const storeUrl = req.user?.shopify_url;
    const storeToken = req.user?.shopify_access_token;

    if (!customerId) {
      res
        .status(status.BAD_REQUEST)
        .json({ message: "Customer ID is required" });
    }

    const customer = await database
      .select()
      .from(customers)
      .where(eq(customers.id, customerId as string));

    if (!customer) {
      res.status(status.NOT_FOUND).json({ message: "Customer not found" });
    }

    const mutation = `
    mutation customerUpdate($id: ID!, $tags: [String!]) {
        customerUpdate(input: {id: $id, tags: $tags}) {
            customer{
                id
                tags
            }
            userErrors {
                field
                message
            }
        }
    }`;

    const response = await axios.post(
      `${storeUrl}/admin/api/2025-07/graphql.json`,
      {
        query: mutation,
        variables: { id: customerId as string, tags: ["BLOCKED"] },
      },
      {
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": storeToken,
        },
      }
    );

    if (response.data.data.customerUpdate.userErrors.length <= 0) {
      await database
        .update(customers)
        .set({ blocked: true, tags: "BLOCKED" })
        .where(eq(customers.id, customerId as string));
    }

    res.status(status.OK).json({ message: "Customer blocked successfully" });
  } catch (error: any) {
    res.status(status.INTERNAL_SERVER_ERROR).json({ message: error.message });
    logger.error(error.message);
  }
};
