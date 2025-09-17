import axios from "axios";
import { env } from "@/utils/env.util";

export async function registerWebhook(shopUrl: string, accessToken: string) {
  const mutation = `
    mutation webhookSubscriptionCreate($topic: WebhookSubscriptionTopic!, $callbackUrl: URL!) {
      webhookSubscriptionCreate(topic: $topic, webhookSubscription: {callbackUrl: $callbackUrl, format: JSON}) {
        webhookSubscription {
          id
          topic
          callbackUrl
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const variables = {
    topic: "ORDERS_CREATE",
    callbackUrl: `${env.FRONTEND_DOMAIN}/api/webhook/orders/create`,
  };

  const response = await axios.post(
    `${shopUrl}/admin/api/2025-07/graphql.json`,
    { query: mutation, variables },
    {
      headers: {
        "X-Shopify-Access-Token": accessToken,
        "Content-Type": "application/json",
      },
    }
  );
  // For delopment
  console.log(
    "RESPONSE:-",
    response.data.data.webhookSubscriptionCreate.webhookSubscription
  );
  console.log(
    "Errors:-",
    response.data.data.webhookSubscriptionCreate.userErrors
  );
}
