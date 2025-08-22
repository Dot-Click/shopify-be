import { Request, Response } from "express";
// import gocardlessClient from "@/lib/gocardless.config";
import client from "@/lib/gocardless.config";
import { env } from "@/utils/env.util";

// export const paymentController = async (
//   _req: Request,
//   _res: Response
// ): Promise<void> => {
//   const listResponse = await client.customers.list();
//   const customers = listResponse.customers;
//   console.log(customers);
//   // const { userId, planName, userEmail, userName } = req.body;

//   // if (!userId || !planName) {
//   //   res.status(400).json({ error: "User ID and Plan Name are required." });
//   //   return;
//   // }

//   // try {
//   //   const billingRequest = await gocardlessClient.billingRequests.create({
//   //     mandate_request: {
//   //       scheme: "sepa_core",
//   //     },

//   //     metadata: {
//   //       user_id: userId,
//   //       plan_name: planName,
//   //     },
//   //   });

//   //   const redirectFlow = await gocardlessClient.redirectFlows.create({
//   //     description: `Subscription for ${planName} Plan`,
//   //     session_token: `SESSION_${userId}_${Date.now()}`,
//   //     prefilled_customer: {
//   //       email: userEmail,
//   //       given_name: userName.split(" ")[0],
//   //       family_name: userName.split(" ")[1] || "",
//   //     },
//   //     links: {
//   //       billing_request: billingRequest.id,
//   //     },
//   //   });

//   //   res.status(200).json({ redirect_url: redirectFlow.redirect_url });
//   // } catch (error) {
//   //   console.error("GoCardless API Error:", error);
//   //   res.status(500).json({ error: "Failed to create payment session." });
//   // }
// };

export const subscriptionController = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { userId, planName, amount, currency, userEmail, userName } = req.body;

  if (!userId || !planName || !amount || !currency) {
    res.status(400).json({ error: "Missing required fields." });
    return;
  }

  try {
    const getSchemeForCurrency = (currency: string) => {
      switch (currency.toUpperCase()) {
        case "GBP":
          return "bacs";
        case "EUR":
          return "sepa_core";
        case "AUD":
          return "becs";
        default:
          throw new Error(`Unsupported currency: ${currency}`);
      }
    };
    const scheme = getSchemeForCurrency(req.body.currency);

    // STEP 1: Create Billing Request (payment + mandate)
    const billingRequest = await client.billingRequests.create({
      payment_request: {
        description: `${planName} Plan – First Payment`,
        amount: amount, // in minor units (e.g., 1000 = £10.00)
        currency: currency, // "GBP", "EUR", etc.
        metadata: { userId, planName },
      },
      mandate_request: {
        currency: currency,
        scheme: scheme, // or "bacs" for UK
        verify: "recommended",
        metadata: { userId, planName },
      },
      metadata: { billing_purpose: "subscription" },
    });

    // STEP 2: Create Billing Request Flow (redirect URL)
    const billingFlow = await client.billingRequestFlows.create({
      redirect_uri: `${env.FRONTEND_DOMAIN}/under-review`,
      exit_uri: `${env.FRONTEND_DOMAIN}`,
      prefilled_customer: {
        given_name: userName.split(" ")[0],
        family_name: userName.split(" ")[1] || "",
        email: userEmail,
      },
      links: {
        billing_request: billingRequest.id,
      },
    });

    res.status(200).json({ redirect_url: billingFlow.authorisation_url });
  } catch (error) {
    console.error("GoCardless Error:", error);
    res.status(500).json({ error: "Failed to create subscription payment." });
  }
};
