import axios from "axios";
import { Request, Response } from "express";
import status from "http-status";

export const getCustomers = async (req: Request, res: Response) => {
  try {
    const data = req.user;

    const storeUrl = data?.shopify_url;
    const accessToken = data?.shopify_access_token;

    const query = `
    {
      customers(first: 10) {
        edges {
          node {
            displayName
            orders(first: 5) {
                edges {
                    node {id}
                }
            }
            numberOfOrders
            email
            phone
          }
        }
      }
    }`;

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

    console.log("This is the response:-", response.data.ip);

    res.status(status.OK).json(response.data.data.customers.edges);
  } catch (error) {
    console.error("Error fetching customers:", error);
    res.status(status.INTERNAL_SERVER_ERROR).json({
      error: "Failed to fetch customers",
    });
  }
};
