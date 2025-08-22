import {
  text,
  pgTable,
  integer,
  varchar,
  boolean,
  timestamp,
  // ReferenceConfig,
} from "drizzle-orm/pg-core";
// import { createInsertSchema } from "drizzle-zod";
// import { createId } from "@paralleldrive/cuid2";

// const timeStamps = {
//   createdAt: timestamp("created_at").defaultNow(),
//   updatedAt: timestamp("updated_at").$onUpdateFn(() => new Date()),
// };

// type UUIDOptions = Exclude<Parameters<typeof varchar>[1], undefined>;

// const uuid = (columnName?: string, options?: UUIDOptions) =>
//   varchar(columnName ?? "id", options).$defaultFn(() => createId());

// const foreignkeyRef = (
//   columnName: string,
//   refColumn: ReferenceConfig["ref"],
//   actions?: ReferenceConfig["actions"]
// ) => varchar(columnName, { length: 128 }).references(refColumn, actions);

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified")
    .$defaultFn(() => false)
    .notNull(),
  image: text("image"),
  createdAt: timestamp("created_at")
    .$defaultFn(() => /* @__PURE__ */ new Date())
    .notNull(),
  updatedAt: timestamp("updated_at")
    .$defaultFn(() => /* @__PURE__ */ new Date())
    .notNull(),
  company_name: text("company_name"),
  mobile_number: text("mobile_number"),
  company_registration_number: text("company_registration_number"),
  average_orders_per_month: text("average_orders_per_month"),
  plan: text("plan"),
  package: text("package"),
  shopify_api_key: text("shopify_api_key"),
  shopify_api_secret: text("shopify_api_secret"),
  shopify_url: text("shopify_url"),
  image_public_id: text("image_public_id"),
  // TODO: add image_public_id
  subscription_status: text("subscription_status").default("inactive"), // inactive, pending, active, cancelled
  gocardless_customer_id: text("gocardless_customer_id"),
  gocardless_mandate_id: text("gocardless_mandate_id"),
  subscription_id: text("subscription_id"),
  subscription_start_date: timestamp("subscription_start_date"),
  subscription_end_date: timestamp("subscription_end_date"),
  trial_end_date: timestamp("trial_end_date"),
  is_account_active: boolean("is_account_active").default(false),
});

export const payment_sessions = pgTable("payment_sessions", {
  id: text("id").primaryKey(),
  user_id: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  session_token: text("session_token").notNull(),
  billing_request_id: text("billing_request_id").notNull(),
  redirect_flow_id: text("redirect_flow_id").notNull(),
  plan_name: text("plan_name").notNull(),
  amount: integer("amount").notNull(), // in pence/cents
  currency: text("currency").notNull().default("GBP"),
  status: text("status").notNull().default("pending"), // pending, completed, failed, expired
  created_at: timestamp("created_at")
    .$defaultFn(() => new Date())
    .notNull(),
  updated_at: timestamp("updated_at")
    .$defaultFn(() => new Date())
    .notNull(),
});

export const payments = pgTable("payments", {
  id: text("id").primaryKey(),
  user_id: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  payment_session_id: text("payment_session_id").references(
    () => payment_sessions.id
  ),
  gocardless_payment_id: text("gocardless_payment_id").notNull(),
  mandate_id: text("mandate_id").notNull(),
  amount: integer("amount").notNull(),
  currency: text("currency").notNull().default("GBP"),
  status: text("status").notNull(), // pending_submission, submitted, confirmed, paid_out, cancelled, customer_approval_denied, failed
  plan_name: text("plan_name").notNull(),
  description: text("description"),
  created_at: timestamp("created_at")
    .$defaultFn(() => new Date())
    .notNull(),
  updated_at: timestamp("updated_at")
    .$defaultFn(() => new Date())
    .notNull(),
});

export const subscriptions = pgTable("subscriptions", {
  id: text("id").primaryKey(),
  user_id: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  gocardless_subscription_id: text("gocardless_subscription_id").notNull(),
  mandate_id: text("mandate_id").notNull(),
  plan_name: text("plan_name").notNull(),
  amount: integer("amount").notNull(),
  currency: text("currency").notNull().default("GBP"),
  interval: text("interval").notNull().default("monthly"), // monthly, yearly
  status: text("status").notNull(), // pending_customer_approval, customer_approval_denied, active, finished, cancelled, paused
  start_date: timestamp("start_date"),
  end_date: timestamp("end_date"),
  next_payment_date: timestamp("next_payment_date"),
  created_at: timestamp("created_at")
    .$defaultFn(() => new Date())
    .notNull(),
  updated_at: timestamp("updated_at")
    .$defaultFn(() => new Date())
    .notNull(),
});

export const webhook_events = pgTable("webhook_events", {
  id: text("id").primaryKey(),
  gocardless_event_id: text("gocardless_event_id").notNull().unique(),
  resource_type: text("resource_type").notNull(),
  action: text("action").notNull(),
  resource_id: text("resource_id").notNull(),
  processed: boolean("processed").notNull().default(false),
  created_at: timestamp("created_at")
    .$defaultFn(() => new Date())
    .notNull(),
  processed_at: timestamp("processed_at"),
  error_message: text("error_message"),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").$defaultFn(
    () => /* @__PURE__ */ new Date()
  ),
  updatedAt: timestamp("updated_at").$defaultFn(
    () => /* @__PURE__ */ new Date()
  ),
});

export const throttleinsight = pgTable("throttle_insight", {
  waitTime: integer("wait_time").notNull(),
  msBeforeNext: integer("ms_before_next").notNull(),
  endPoint: varchar("end_point", { length: 225 }),
  pointsAllotted: integer("allotted_points").notNull(),
  consumedPoints: integer("consumed_points").notNull(),
  remainingPoints: integer("remaining_points").notNull(),
  key: varchar("key", { length: 225 }).primaryKey().notNull(),
  isFirstInDuration: boolean("is_first_in_duration").notNull(),
});
