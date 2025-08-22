import { Request, Response } from "express";
import gocardlessClient from "@/lib/gocardless.config";
import { logger } from "@/utils/logger.util";
import status from "http-status";

export const paymentController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { userId, planName, userEmail, userName } = req.body;

    if (!userId || !planName) {
      res
        .status(status.BAD_REQUEST)
        .json({ error: "User ID and Plan Name are required." });
    }

    const billingRequest = await gocardlessClient.billingRequests.create({
      mandate_request: {
        scheme: "sepa_core",
      },

      metadata: {
        user_id: userId,
        plan_name: planName,
      },
    });

    const redirectFlow = await gocardlessClient.redirectFlows.create({
      description: `Subscription for ${planName} Plan`,
      session_token: `SESSION_${userId}_${Date.now()}`,
      prefilled_customer: {
        email: userEmail,
        given_name: userName.split(" ")[0],
        family_name: userName.split(" ")[1] || "",
      },
      links: {
        billing_request: billingRequest.id,
      },
    });

    res.status(status.OK).json({ redirect_url: redirectFlow.redirect_url });
  } catch (error) {
    logger.error("GoCardless API Error:", error);
    res
      .status(status.INTERNAL_SERVER_ERROR)
      .json({ error: "Failed to create payment session." });
  }
};
