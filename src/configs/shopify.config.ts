import "@shopify/shopify-api/adapters/node";
import { shopifyApi, ApiVersion, LogSeverity } from "@shopify/shopify-api";
import { env } from "@/utils/env.util";

/**
 * Shopify API client — configured for Option B (external dashboard, not embedded).
 * hostName must be the backend domain without the https:// prefix.
 *
 * v13 of @shopify/shopify-api fixes the "non-expiring access tokens" error by
 * sending grant_options[]='' (empty) for offline OAuth, which causes Shopify to
 * issue an expiring offline token. It also provides migrateToExpiringToken()
 * to exchange old stored tokens without requiring the merchant to re-authenticate.
 */
export const shopify = shopifyApi({
  apiKey: env.SHOPIFY_API_KEY,
  apiSecretKey: env.SHOPIFY_API_SECRET,
  scopes: [
    "read_customers",
    "write_customers",
    "read_orders",
    "write_orders",
    "read_fulfillments",
    "write_fulfillments",
  ],
  hostName: env.SHOPIFY_APP_URL.replace(/^https?:\/\//, ""),
  apiVersion: ApiVersion.July26,
  isEmbeddedApp: false,
  logger: {
    level: LogSeverity.Warning,
  },
});
