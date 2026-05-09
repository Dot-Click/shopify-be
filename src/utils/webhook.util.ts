import axios from "axios";
import { env } from "@/utils/env.util";

export async function registerOrderWebhook(
  shopUrl: string,
  accessToken: string
) {
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
    callbackUrl: `${env.BACKEND_DOMAIN}/api/webhook/orders/create`,
  };
  const resp = await axios.post(
    `${shopUrl}/admin/api/2025-07/graphql.json`,
    { query: mutation, variables },
    {
      headers: {
        "X-Shopify-Access-Token": accessToken,
        "Content-Type": "application/json",
      },
    }
  );
  console.log("Order webhook:", resp.data.data.webhookSubscriptionCreate);
}

export async function registerRefundWebhook(
  shopUrl: string,
  accessToken: string
) {
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
    topic: "REFUNDS_CREATE", // Shopify’s GraphQL topic for refund create :contentReference[oaicite:0]{index=0}
    callbackUrl: `${env.BACKEND_DOMAIN}/api/webhook/refunds/create`,
  };
  const resp = await axios.post(
    `${shopUrl}/admin/api/2025-07/graphql.json`,
    { query: mutation, variables },
    {
      headers: {
        "X-Shopify-Access-Token": accessToken,
        "Content-Type": "application/json",
      },
    }
  );
  console.log("Refund webhook:", resp.data.data.webhookSubscriptionCreate);
}
