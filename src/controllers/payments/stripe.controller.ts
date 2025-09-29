import { env } from "@/utils/env.util";
import { logger } from "./../../utils/logger.util";
import { Response } from "express";
import { Request } from "express";
import status from "http-status";
import Stripe from "stripe";

export const StripePayment = async (req: Request, res: Response) => {
  try {
    const { priceId } = req.body;

    console.log("This is request body", req.body);
    if (!priceId) {
      res.status(status.BAD_REQUEST).json({ message: "No id provided" });
      return;
    }

    const stripe = new Stripe(env.STRIPE_SECRET_KEY);

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${env.FRONTEND_DOMAIN}/under-review?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${env.FRONTEND_DOMAIN}/cancel`,
    });

    res.status(status.OK).json({ url: session.url });
  } catch (error) {
    res
      .status(status.INTERNAL_SERVER_ERROR)
      .json({ message: "Internal Error, something went wrong" });
    logger.error(error);
    console.log("Something went wrong", error);
  }
};
