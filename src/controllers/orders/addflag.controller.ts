import { database } from "@/configs/connection.config";
import { orders } from "@/schema/schema";
import { eq } from "drizzle-orm";
import { Request, Response } from "express";
import status from "http-status";

export const addFlag = async (req: Request, res: Response): Promise<void> => {
  try {
    const { orderId } = req.query;

    if (!orderId) {
      res.status(status.BAD_REQUEST).json({ message: "Order ID is required" });
    }

    const order = await database.query.orders.findFirst({
      where: eq(orders.id, orderId as string),
    });

    if (order?.manualFlag === true || order?.flagged === true) {
      res.status(status.BAD_REQUEST).json({ message: "It is already flagged" });
    }

    if (!order) {
      res.status(status.NOT_FOUND).json({ message: "Order not found" });
    }

    const updatedOrder = await database
      .update(orders)
      .set({
        manualFlag: true,
      })
      .where(eq(orders.id, orderId as string));

    res
      .status(status.OK)
      .json({ message: "Flag added successfully", order: updatedOrder });
  } catch (error) {
    res
      .status(status.INTERNAL_SERVER_ERROR)
      .json({ message: "Internal server error" });
  }
};
