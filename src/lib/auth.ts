import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { database } from "../configs/connection.config";
import * as schema from "@/schema/schema";
import { betterAuth } from "better-auth";
import { admin as adminPlugin } from "better-auth/plugins";
import { env } from "@/utils/env.util";
import { adminApprovalNotificationTemplate } from "@/utils/sendgrid.util";
import { sendgridClient } from "@/configs/sendgrid.config";
import { eq } from "drizzle-orm";

const isProduction = process.env.NODE_ENV === "production";
export const auth = betterAuth({
  database: drizzleAdapter(database, { provider: "pg", schema }),
  secret: env.COOKIE_SECRET,
  trustedOrigins: [env.FRONTEND_DOMAIN],
  session: {
    expiresIn: 60 * 60 * 24 * 7,
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
  plugins: [adminPlugin()],
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
    sendVerificationEmail: async ({
      user,
      url,
    }: {
      user: any;
      url: string;
    }) => {
      const autoActivation = process.env.AUTO_ACTIVATION === "true";

      if (autoActivation) {
        await database
          .update(schema.users)
          .set({ emailVerified: true })
          .where(eq(schema.users.id, user.id));

        console.log(`User ${user.email} auto-activated`);
        return;
      }

      const approvalLink = url;
      const subscriptionPlan = user.package || "Not Specified";
      const userName = user.name || user.email.split("@")[0];
      const userEmail = user.email;
      const companyName = user.company_name || "Not Provided";
      const shopifyUrl = user.shopify_url || "Not Provided";
      const companyRegistrationNumber =
        user.company_registration_number || "Not Provided";
      const averageOrdersPerMonth =
        user.average_orders_per_month || "Not Provided";

      console.log("This is the user", user);

      const msg = {
        to: env.ADMIN_EMAIL!,
        from: {
          email: env.SENDGRID_SENDER_EMAIL!,
          name: env.SENDGRID_SENDER_NAME!,
        },
        subject: "New User Registration - Approval Required",
        html: adminApprovalNotificationTemplate({
          userName,
          userEmail,
          companyName,
          shopifyUrl,
          companyRegistrationNumber,
          averageOrdersPerMonth,
          subscriptionPlan,
          approvalLink,
        }),
        replyTo: env.SENDGRID_SENDER_EMAIL!,
      };

      await sendgridClient.send(msg);
    },
    // autoSignInAfterVerification: true,
    sendOnSignUp: false,
  },
  user: {
    modelName: "users",
    additionalFields: {
      company_name: {
        type: "string",
        required: false,
        fieldName: "company_name",
        returned: true,
      },
      mobile_number: {
        type: "string",
        required: false,
        fieldName: "mobile_number",
        returned: true,
      },
      company_registration_number: {
        type: "string",
        required: false,
        fieldName: "company_registration_number",
        returned: true,
      },
      average_orders_per_month: {
        type: "string",
        required: false,
        fieldName: "average_orders_per_month",
        returned: true,
      },
      plan: {
        type: "string",
        required: false,
        fieldName: "plan",
        returned: true,
      },
      package: {
        type: "string",
        required: false,
        fieldName: "package",
        returned: true,
      },
      shopify_api_key: {
        type: "string",
        required: false,
        fieldName: "shopify_api_key",
        returned: true,
      },
      shopify_access_token: {
        type: "string",
        required: false,
        fieldName: "shopify_access_token",
        returned: true,
      },
      shopify_url: {
        type: "string",
        required: false,
        fieldName: "shopify_url",
        returned: true,
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
