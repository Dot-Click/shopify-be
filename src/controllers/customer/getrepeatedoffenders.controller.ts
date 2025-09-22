import { database } from "@/configs/connection.config";
import { customers } from "@/schema/schema";
import { logger } from "@/utils/logger.util";
import { Request, Response } from "express";
import status from "http-status";
import { gt } from "drizzle-orm";

export const getRepeatedOffenders = async (_req: Request, res: Response) => {
  try {
    const flaggedCustomers = await database
      .select()
      .from(customers)
      .where(gt(customers.riskLevel, 0));

    console.log("flaggedCustomers", flaggedCustomers);

    const offenderMap: Record<string, number> = {};

    flaggedCustomers.forEach((c) => {
      const id = c.email ?? c.id;
      offenderMap[id] = (offenderMap[id] || 0) + 1;
    });

    const repeatOffenders = flaggedCustomers.filter(
      (c) => offenderMap[c.email ?? c.id] > 1
    );

    console.log("repeatOffenders", repeatOffenders);

    res.status(status.OK).json({
      message: "There you go the repeated offenders",
      total: repeatOffenders.length,
      repeatOffenders,
    });
  } catch (error) {
    res.status(status.INTERNAL_SERVER_ERROR).json({ error: error });
    logger.error(error);
  }
};
