import { calculateRiskyOrders } from "@/service/risk.service";
import { Request, Response } from "express";
import status from "http-status";

export const getRiskyOrders = async (req: Request, res: Response) => {
  try {
    const storeId = req.user?.id;
    const customerId = req.query.customerId as string;
    const storeUrl = req.user?.shopify_url;
    const accessToken = req.user?.shopify_access_token;

    if (!storeId || !customerId || !storeUrl || !accessToken) {
      res.status(status.BAD_REQUEST).json({
        message: "Store ID, Customer ID, Shopify URL, and Token are required",
      });
      return;
    }

    const data = await calculateRiskyOrders({
      storeId,
      customerId,
      storeUrl,
      accessToken,
    });

    res.setHeader("Cache-Control", "no-store");
    res.status(status.OK).json(data);
  } catch (error: any) {
    console.error(error.response?.data || error.message || error);
    res
      .status(status.INTERNAL_SERVER_ERROR)
      .json({ message: error.message || "Internal server error" });
  }
};
