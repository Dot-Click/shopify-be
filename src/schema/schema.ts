import {
  text,
  pgTable,
  integer,
  varchar,
  boolean,
  timestamp,
  decimal,
  jsonb,
  // uuid,
  pgEnum,
  // ReferenceConfig,
} from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";

// Helper function for timestamps
const timeStamps = {
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").$onUpdateFn(() => new Date()),
};

type UUIDOptions = Exclude<Parameters<typeof varchar>[1], undefined>;

const uuid = (columnName?: string, options?: UUIDOptions) =>
  varchar(columnName ?? "id", options).$defaultFn(() => createId());

// const foreignkeyRef = (
//   columnName: string,
//   refColumn: ReferenceConfig["ref"],
//   actions?: ReferenceConfig["actions"]
// ) => varchar(columnName, { length: 128 }).references(refColumn, actions);

// Enums
export const userRoleEnum = pgEnum("user_role", [
  "customer_admin",
  "sub_user",
  "ecp_admin",
  "ecp_operations",
  "ecp_account_manager",
]);

export const storeStatusEnum = pgEnum("store_status", [
  "pending_approval",
  "active",
  "suspended",
  "disabled",
]);

export const planEnum = pgEnum("plan", [
  "starter",
  "growth",
  "pro",
  "enterprise",
]);

export const packageEnum = pgEnum("package", [
  "ecp_insight",
  "ecp_vision",
  "ecp_shield",
]);

export const orderStatusEnum = pgEnum("order_status", [
  "pending",
  "flagged",
  "held_for_review",
  "auto_cancelled",
  "fulfilled",
  "cancelled",
]);

export const riskLevelEnum = pgEnum("risk_level", [
  "low",
  "medium",
  "high",
  "critical",
]);

export const matchSensitivityEnum = pgEnum("match_sensitivity", [
  "low",
  "medium",
  "high",
]);

export const actionTypeEnum = pgEnum("action_type", [
  "fulfillment_hold",
  "auto_cancel",
  "notify_only",
]);

// Stores/Companies table
export const stores: any = pgTable("stores", {
  id: uuid("id").primaryKey(),
  companyName: varchar("company_name").notNull(),
  companyRegistrationNumber: varchar("company_registration_number").notNull(),
  storeUrl: varchar("store_url").notNull(),
  averageOrdersPerMonth: integer("average_orders_per_month").notNull(),
  plan: planEnum("plan").notNull(),
  package: packageEnum("package"),
  status: storeStatusEnum("status")
    .$defaultFn(() => "pending_approval")
    .notNull(),
  shopifyApiKey: varchar("shopify_api_key"),
  shopifyApiSecret: varchar("shopify_api_secret"),
  shopifyWebhookUrl: varchar("shopify_webhook_url"),
  isActive: boolean("is_active").default(false).notNull(),
  approvedAt: timestamp("approved_at"),
  approvedBy: varchar("approved_by").references(() => users.id, {
    onDelete: "set null",
  }),

  ...timeStamps,
});

export const storeRelations = relations(stores, ({ many }) => ({
  users: many(users),
}));

// Users table (extends existing)
export const users = pgTable("users", {
  id: uuid("id").primaryKey(),
  fullName: text("full_name").notNull(),
  email: text("email").notNull().unique(),
  mobileNumber: text("mobile_number").notNull(),
  password: text("password").notNull(),
  role: userRoleEnum("role").notNull(),
  storeId: varchar("store_id").references(() => stores.id, {
    onDelete: "set null",
  }),

  isActive: boolean("is_active")
    .$defaultFn(() => true)
    .notNull(),
  emailVerified: boolean("email_verified")
    .$defaultFn(() => false)
    .notNull(),
  mfaEnabled: boolean("mfa_enabled")
    .$defaultFn(() => false)
    .notNull(),
  lastLoginAt: timestamp("last_login_at"),
  image: text("image"),
  imagePublicId: text("image_public_id"),
  ...timeStamps,
});

export const usersRelations = relations(users, ({ one }) => ({
  store: one(stores, {
    fields: [users.storeId],
    references: [stores.id],
  }),
}));

// Store settings for risk detection
export const storeSettings = pgTable("store_settings", {
  id: uuid("id").primaryKey(),
  storeId: varchar("store_id")
    .references(() => stores.id, {
      onDelete: "cascade",
    })
    .notNull(),

  // Risk Detection Settings
  lostParcelThreshold: integer("lost_parcel_threshold").notNull(),
  lossRateThreshold: decimal("loss_rate_threshold", { precision: 5, scale: 2 }),
  timePeriodMonths: integer("time_period_months").notNull(),
  matchSensitivity: matchSensitivityEnum("match_sensitivity")
    .$defaultFn(() => "medium")
    .notNull(),

  // Action Settings
  actionType: actionTypeEnum("action_type")
    .$defaultFn(() => "fulfillment_hold")
    .notNull(),
  requireCustomerSignature: boolean("require_customer_signature")
    .$defaultFn(() => false)
    .notNull(),
  forceSignedDelivery: boolean("force_signed_delivery")
    .$defaultFn(() => false)
    .notNull(),
  requirePhotoOnDelivery: boolean("require_photo_on_delivery")
    .$defaultFn(() => false)
    .notNull(),
  sendCancellationEmail: boolean("send_cancellation_email")
    .$defaultFn(() => false)
    .notNull(),
  includeWaiverLink: boolean("include_waiver_link")
    .$defaultFn(() => false)
    .notNull(),

  // Notification Settings
  emailNotificationsEnabled: boolean("email_notifications_enabled")
    .$defaultFn(() => true)
    .notNull(),
  notificationRecipients: jsonb("notification_recipients").$type<string[]>(),
  includeOrderDetails: boolean("include_order_details")
    .$defaultFn(() => true)
    .notNull(),
  includeReasonForFlag: boolean("include_reason_for_flag")
    .$defaultFn(() => true)
    .notNull(),
  includeRecommendedAction: boolean("include_recommended_action")
    .$defaultFn(() => true)
    .notNull(),

  // Additional Settings
  actionDelayHours: integer("action_delay_hours"),
  shopifyIntegrationEnabled: boolean("shopify_integration_enabled")
    .$defaultFn(() => true)
    .notNull(),

  ...timeStamps,
});

// Customer exclusions (trusted customers)
export const customerExclusions = pgTable("customer_exclusions", {
  id: uuid("id").primaryKey(),
  storeId: text("store_id")
    .references(() => stores.id, { onDelete: "cascade" })
    .notNull(),
  customerEmail: text("customer_email"),
  customerAddress: text("customer_address"),
  customerPhone: text("customer_phone"),
  reason: text("reason"),
  isActive: boolean("is_active")
    .$defaultFn(() => true)
    .notNull(),
  ...timeStamps,
});

// Orders table
export const orders = pgTable("orders", {
  id: uuid("id").primaryKey(),
  storeId: text("store_id")
    .references(() => stores.id, { onDelete: "cascade" })
    .notNull(),
  shopifyOrderId: text("shopify_order_id"),
  orderNumber: text("order_number").notNull(),
  customerEmail: text("customer_email").notNull(),
  customerFirstName: text("customer_first_name").notNull(),
  customerLastName: text("customer_last_name").notNull(),
  customerAddress: jsonb("customer_address").$type<{
    address1: string;
    address2?: string;
    city: string;
    state: string;
    postcode: string;
    country: string;
  }>(),
  customerPhone: text("customer_phone"),
  customerIp: text("customer_ip"),
  orderValue: decimal("order_value", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency")
    .$defaultFn(() => "GBP")
    .notNull(),
  deliveryMethod: text("delivery_method"),
  status: orderStatusEnum("status")
    .$defaultFn(() => "pending")
    .notNull(),
  riskLevel: riskLevelEnum("risk_level"),
  riskScore: integer("risk_score"),
  riskReason: text("risk_reason"),
  isFlagged: boolean("is_flagged")
    .$defaultFn(() => false)
    .notNull(),
  flaggedAt: timestamp("flagged_at"),
  flaggedBy: text("flagged_by").references(() => users.id),
  reviewNotes: text("review_notes"),
  actionTaken: text("action_taken"),
  actionTakenAt: timestamp("action_taken_at"),
  actionTakenBy: text("action_taken_by").references(() => users.id),
  ...timeStamps,
});

// Risk history for customers
export const customerRiskHistory = pgTable("customer_risk_history", {
  id: uuid("id").primaryKey(),
  storeId: text("store_id")
    .references(() => stores.id, { onDelete: "cascade" })
    .notNull(),
  customerEmail: text("customer_email").notNull(),
  customerAddress: text("customer_address"),
  customerPhone: text("customer_phone"),
  customerIp: text("customer_ip"),
  totalOrders: integer("total_orders")
    .$defaultFn(() => 0)
    .notNull(),
  flaggedOrders: integer("flagged_orders")
    .$defaultFn(() => 0)
    .notNull(),
  lostOrders: integer("lost_orders")
    .$defaultFn(() => 0)
    .notNull(),
  lossRate: decimal("loss_rate", { precision: 5, scale: 2 }),
  lastFlaggedAt: timestamp("last_flagged_at"),
  riskLevel: riskLevelEnum("risk_level"),
  isActive: boolean("is_active")
    .$defaultFn(() => true)
    .notNull(),
  ...timeStamps,
});

// Package subscriptions
export const packageSubscriptions = pgTable("package_subscriptions", {
  id: uuid("id").primaryKey(),
  storeId: text("store_id")
    .references(() => stores.id, { onDelete: "cascade" })
    .notNull(),
  package: packageEnum("package").notNull(),
  plan: planEnum("plan").notNull(),
  status: text("status")
    .$defaultFn(() => "pending")
    .notNull(), // pending, active, cancelled, suspended
  goCardlessMandateId: text("go_cardless_mandate_id"),
  goCardlessSubscriptionId: text("go_cardless_subscription_id"),
  monthlyPrice: decimal("monthly_price", { precision: 10, scale: 2 }),
  nextBillingDate: timestamp("next_billing_date"),
  cancelledAt: timestamp("cancelled_at"),
  ...timeStamps,
});

// Application reviews (for ECP operations team)
export const applicationReviews = pgTable("application_reviews", {
  id: uuid("id").primaryKey(),
  storeId: text("store_id")
    .references(() => stores.id, { onDelete: "cascade" })
    .notNull(),
  status: text("status")
    .$defaultFn(() => "pending")
    .notNull(), // pending, approved, rejected
  reviewedBy: text("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  reviewNotes: text("review_notes"),
  dueDiligenceCompleted: boolean("due_diligence_completed")
    .$defaultFn(() => false)
    .notNull(),
  billingSetupCompleted: boolean("billing_setup_completed")
    .$defaultFn(() => false)
    .notNull(),
  ...timeStamps,
});

// Email notifications log
export const emailNotifications = pgTable("email_notifications", {
  id: uuid("id").primaryKey(),
  storeId: text("store_id").references(() => stores.id),
  recipientEmail: text("recipient_email").notNull(),
  recipientType: text("recipient_type").notNull(), // ops_team, account_manager, store_admin
  subject: text("subject").notNull(),
  content: text("content").notNull(),
  sentAt: timestamp("sent_at")
    .$defaultFn(() => new Date())
    .notNull(),
  status: text("status")
    .$defaultFn(() => "sent")
    .notNull(), // sent, failed, delivered
  errorMessage: text("error_message"),
  ...timeStamps,
});

// Audit log for all system actions
export const auditLog = pgTable("audit_log", {
  id: uuid("id").primaryKey(),
  userId: text("user_id").references(() => users.id),
  storeId: text("store_id").references(() => stores.id),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(), // store, user, order, setting
  entityId: text("entity_id"),
  oldValues: jsonb("old_values"),
  newValues: jsonb("new_values"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  ...timeStamps,
});

// Sessions table (extends existing)
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

// Account table (extends existing)
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

// Verification table (extends existing)
export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").$defaultFn(() => new Date()),
  updatedAt: timestamp("updated_at").$defaultFn(() => new Date()),
});

// Throttle insight table (extends existing)
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

// Report queries cache for performance
export const reportCache = pgTable("report_cache", {
  id: uuid("id").primaryKey(),
  reportType: text("report_type").notNull(),
  storeId: text("store_id").references(() => stores.id),
  parameters: jsonb("parameters"),
  result: jsonb("result").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  ...timeStamps,
});

// MFA tokens for mobile authentication
export const mfaTokens = pgTable("mfa_tokens", {
  id: uuid("id").primaryKey(),
  userId: text("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  token: text("token").notNull(),
  type: text("type").notNull(), // sms, totp, email
  expiresAt: timestamp("expires_at").notNull(),
  isUsed: boolean("is_used")
    .$defaultFn(() => false)
    .notNull(),
  usedAt: timestamp("used_at"),
  ...timeStamps,
});

// Store API usage tracking
export const apiUsage = pgTable("api_usage", {
  id: uuid("id").primaryKey(),
  storeId: text("store_id")
    .references(() => stores.id, { onDelete: "cascade" })
    .notNull(),
  endpoint: text("endpoint").notNull(),
  method: text("method").notNull(),
  responseTime: integer("response_time"),
  statusCode: integer("status_code"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  ...timeStamps,
});

// ZOD validation for the schema
export const storeValidation = createInsertSchema(stores);
export const packageValidation = createInsertSchema(packageSubscriptions);

// Export all tables for use in the application
export const tables = {
  users,
  stores,
  storeSettings,
  customerExclusions,
  orders,
  customerRiskHistory,
  packageSubscriptions,
  applicationReviews,
  emailNotifications,
  auditLog,
  session,
  account,
  verification,
  throttleinsight,
  reportCache,
  mfaTokens,
  apiUsage,
};
