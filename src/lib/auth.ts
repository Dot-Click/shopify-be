import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { database } from "../configs/connection.config";
import * as schema from "@/schema/schema";
import { betterAuth } from "better-auth";
import {
  admin as adminPlugin,
  createAuthMiddleware,
  emailOTP,
} from "better-auth/plugins";
import { env } from "@/utils/env.util";
import {
  adminApprovalNotificationTemplate,
  resetPasswordTemplate,
  staffInvitationTemplate,
  storeInvitationAcceptedTemplate,
} from "@/utils/sendgrid.util";
import { sendgridClient } from "@/configs/sendgrid.config";
import { eq } from "drizzle-orm";
import {
  registerOrderWebhook,
  registerRefundWebhook,
} from "@/utils/webhook.util";
import { ac, manager, support, admin } from "./permission";
import { decrypt, encrypt } from "@/service/encryption.service";

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

  plugins: [
    adminPlugin({
      ac,
      roles: {
        admin,
        manager,
        support,
      },
    }),
    emailOTP({
      async sendVerificationOTP({ email, otp }) {
        try {
          const user = await database.query.users.findFirst({
            where: eq(schema.users.email, email),
          });

          let emailSubject = "";
          let emailHtml = "";
          let userName = email.split("@")[0];

          if (user && user.role === "sub-admin") {
            emailSubject = "Welcome! Please Verify Your Store's Email";
            userName = user.name || userName; // Use their actual name if available
            emailHtml = storeInvitationAcceptedTemplate({
              staffName: userName,
              staffEmail: email,
              dashboardLink: `${env.FRONTEND_DOMAIN}/verify-store?email=${email}&otp=${otp}`,
              companyName: "eComProtect",
            });
          } else {
            emailSubject = "You're Invited to Join Your Team!";
            emailHtml = staffInvitationTemplate({
              staffName: userName,
              staffEmail: email,
              invitationLink: `${env.FRONTEND_DOMAIN}/accept-invite?email=${email}&otp=${otp}`,
              companyName: "eComProtect", // You could even make this dynamic by looking up the store they belong to
            });
          }

          // --- Step 3: Construct and send the email ---
          const msg = {
            to: email,
            from: {
              email: env.SENDGRID_SENDER_EMAIL!,
              name: env.SENDGRID_SENDER_NAME!,
            },
            subject: emailSubject, // Use the dynamic subject
            html: emailHtml, // Use the dynamic HTML template
            replyTo: env.SENDGRID_SENDER_EMAIL!,
          };

          await sendgridClient.send(msg);
          console.log(
            `Successfully sent '${emailSubject}' email to ${email} via SendGrid.`
          );
        } catch (error) {
          console.error("Failed to send verification email:", error);
          throw new Error("Failed to send verification email.");
        }
      },
    }),
  ],

  emailAndPassword: {
    sendResetPassword: async ({ token, user }: any) => {
      try {
        const resetLink = `${env.FRONTEND_DOMAIN}/reset-password?token=${token}`;

        console.log(user);
        const msg = {
          to: user.email,
          from: {
            email: env.SENDGRID_SENDER_EMAIL!,
            name: env.SENDGRID_SENDER_NAME!,
          },
          subject: "Your Password Reset Request",
          html: resetPasswordTemplate({
            resetLink: resetLink,
            userName:
              user.name || (user.email ? user.email.split("@")[0] : "user"),
          }),
          replyTo: env.SENDGRID_SENDER_EMAIL!,
        };

        await sendgridClient.send(msg);
        console.log("Successfully sent password reset email via SendGrid.");
      } catch (error) {
        console.error("Failed to send password reset email:", error);
        throw new Error("Failed to send password reset email.");
      }
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

  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path === "/sign-in/email") {
        const userVerified = ctx.context;
        // console.log("Email verified:-", ctx.context.tables.user.fields);
        // console.log("TABLES:-", ctx.context?.adapter?.options?.schema.user);
        if (!userVerified) {
          throw new Error(
            "Your email is not verified. Please verify before signing in."
          );
        }
      }
    }),
    after: createAuthMiddleware(async (ctx) => {
      if (ctx.path === "/sign-up/email") {
        const newUser = ctx.context.newSession?.user;
        if (!newUser) {
          console.log("No new user found");
          return;
        }

        const shopUrl = newUser.shopify_url;
        const accessToken = newUser.shopify_access_token;

        if (shopUrl && accessToken) {
          try {
            await registerOrderWebhook(shopUrl, accessToken);
            await registerRefundWebhook(shopUrl, accessToken);
            console.log("Webhook registered after signup for shop:", shopUrl);
          } catch (err) {
            console.error("Failed registering webhook after signup:", err);
          }
        }
      }
    }),
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
        transform: {
          input: (val: any) => (typeof val === "string" ? encrypt(val) : val),
          output: (val: any) => (typeof val === "string" ? decrypt(val) : val),
        },
      },
      shopify_access_token: {
        type: "string",
        required: false,
        fieldName: "shopify_access_token",
        returned: true,
        transform: {
          input: (val) => (typeof val === "string" ? encrypt(val) : val),
          output: (val) => (typeof val === "string" ? decrypt(val) : val),
        },
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
