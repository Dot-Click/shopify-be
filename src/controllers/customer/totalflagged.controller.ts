import { database } from "@/configs/connection.config";
import { customers } from "@/schema/schema";
import { logger } from "@/utils/logger.util";
import { Request, Response } from "express";
import status from "http-status";

export const TotalFlaggedCustomers = async (
  _req: Request,
  res: Response
): Promise<void> => {
  try {
    const allCustomers = await database
      .select({ flagged: customers.flagged, ip: customers.ip })
      .from(customers);

    if (!allCustomers) {
      res.status(status.BAD_REQUEST);
    }

    const numberOfFlagged = allCustomers.filter(
      (c) => c.flagged === true
    ).length;

    console.log(numberOfFlagged);

    res.status(status.OK).json({
      message: "Fetched successfully total flagged customer",
      numberOfFlagged,
    });
  } catch (error) {
    res.status(status.INTERNAL_SERVER_ERROR);
    logger.error(error);
  }
};
