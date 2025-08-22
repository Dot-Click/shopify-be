import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { database } from "../configs/connection.config";
import * as schema from "@/schema/schema";
import { betterAuth } from "better-auth";
import { env } from "@/utils/env.util";

const isProduction = process.env.NODE_ENV === "production";
export const auth = betterAuth({
  database: drizzleAdapter(database, { provider: "pg", schema }),
  secret: env.COOKIE_SECRET,
  trustedOrigins: [env.FRONTEND_DOMAIN],
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days ( session expiry )
    updateAge: 60 * 60 * 24, // 1 day( "expiresIn = now + expiry" after every updateAge time, if session is used )
    cookieCache: {
      enabled: true, // Enable caching session in cookie
      maxAge: 5 * 60, // 5 minutes
    },
  },
  advanced: {
    useSecureCookies: isProduction, // required for HTTPS domains
    cookies: {
      session_token: {
        attributes: {
          sameSite: isProduction ? "none" : "lax", // 'lax' for dev, 'none' for prod
          httpOnly: isProduction, // false for dev, true for prod
          secure: isProduction, // false for dev, true for prod
        },
      },
    },
  },
  // signup/signin/reset-password
  emailAndPassword: {
    sendResetPassword: async () => {
      // Send reset password email
    },
    // requireEmailVerification: true,
    // maxPasswordLength: 10,
    // minPasswordLength: 8,
    // autoSignIn: true,

    enabled: true,
  },
  emailVerification: {
    sendVerificationEmail: async () => {
      // Send verification email to user
    },
    autoSignInAfterVerification: true,
    sendOnSignUp: true,
  },
  user: {
    modelName: "users",
    additionalFields: {
      company_name: {
        type: "string",
        required: false,
        fieldName: "company_name",
      },
      mobile_number: {
        type: "string",
        required: false,
        fieldName: "mobile_number",
      },
      company_registration_number: {
        type: "string",
        required: false,
        fieldName: "company_registration_number",
      },
      average_orders_per_month: {
        type: "string",
        required: false,
        fieldName: "average_orders_per_month",
      },
      plan: {
        type: "string",
        required: false,
        fieldName: "plan",
      },
      package: {
        type: "string",
        required: false,
        fieldName: "package",
      },
      shopify_api_key: {
        type: "string",
        required: false,
        fieldName: "shopify_api_key",
      },
      shopify_api_secret: {
        type: "string",
        required: false,
        fieldName: "shopify_api_secret",
      },
      shopify_url: {
        type: "string",
        required: false,
        fieldName: "shopify_url",
      },
      image_public_id: {
        type: "string",
        required: false,
        fieldName: "image_public_id",
      },
    },
    changeEmail: {
      enabled: true,
      sendChangeEmailVerification: async () => {
        // Send change email verification
      },
    },
    deleteUser: {
      enabled: true,
      sendDeleteAccountVerification: async () => {
        // Send delete account verification
      },
      beforeDelete: async () => {
        // Perform actions before user deletion
      },
      afterDelete: async () => {
        // Perform cleanup after user deletion
      },
    },
  },
});
