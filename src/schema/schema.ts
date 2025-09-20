import {
  text,
  pgTable,
  integer,
  varchar,
  boolean,
  timestamp,
  numeric,
  ReferenceConfig,
  json,
} from "drizzle-orm/pg-core";
// import { createInsertSchema } from "drizzle-zod";
import { createId } from "@paralleldrive/cuid2";
import { relations } from "drizzle-orm";

const timeStamps = {
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").$onUpdateFn(() => new Date()),
};

type UUIDOptions = Exclude<Parameters<typeof varchar>[1], undefined>;

const uuid = (columnName?: string, options?: UUIDOptions) =>
  varchar(columnName ?? "id", options).$defaultFn(() => createId());

const foreignkeyRef = (
  columnName: string,
  refColumn: ReferenceConfig["ref"],
  actions?: ReferenceConfig["actions"]
) => varchar(columnName, { length: 128 }).references(refColumn, actions);

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
  role: text("role"),
  banned: boolean("banned"),
  banReason: text("ban_reason"),
  banExpires: timestamp("ban_expires"),
  company_name: text("company_name"),
  mobile_number: text("mobile_number"),
  company_registration_number: text("company_registration_number"),
  average_orders_per_month: text("average_orders_per_month"),
  plan: text("plan"),
  package: text("package"),
  shopify_api_key: text("shopify_api_key"),
  shopify_access_token: text("shopify_access_token"),
  shopify_url: text("shopify_url"),
});

export const customers = pgTable("customers", {
  id: text("id").primaryKey(),
  name: text("name"),
  email: text("email"),
  phone: text("phone"),
  totalRefunded: numeric("total_refunded", { precision: 12, scale: 2 }),
  totalOrders: integer("total_orders"),
  riskLevel: integer("risk_level"),
  flagged: boolean("flagged"),
  refundsFromStores: integer("refunds_from_stores"),
  riskySince: timestamp("risky_since"),
  storeId: foreignkeyRef("store_id", () => users.id, { onDelete: "cascade" }),
  blocked: boolean("blocked").default(false),
  tags: varchar("tags", { length: 255 }),
  ...timeStamps,
});

export const orders = pgTable("orders", {
  id: text("id").primaryKey(),
  name: varchar("name", { length: 50 }).notNull(),
  totalAmount: numeric("total_amount", { precision: 12, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 10 }).notNull(),
  customerId: varchar("customer_id").notNull(),
  customerEmail: varchar("customer_email", { length: 150 }),
  customerPhone: varchar("customer_phone", { length: 20 }),
  displayFulfillmentStatus: varchar("display_fulfillment_status", {
    length: 50,
  }),
  fulfillmentStatus: varchar("fulfillment_status", { length: 50 }),
  trackingNumber: varchar("tracking_number", { length: 255 }),
  trackingCompany: varchar("tracking_company", { length: 255 }),
  deliveredAt: timestamp("delivered_at"),
  disputeOpened: boolean("dispute_opened").default(false).notNull(),
  manualFlag: boolean("manual_flag").default(false),
  flagged: boolean("flagged").default(false),
  flagReason: text("flag_reason"),
  riskLevel: varchar("risk_level", { length: 50 }),
  totalRefunded: numeric("total_refunded", { precision: 12, scale: 2 }),
  riskRecommendation: varchar("risk_recommendation", { length: 50 }),
  ...timeStamps,
});

export const orderItems = pgTable("order_items", {
  id: text("id").primaryKey(),
  orderId: foreignkeyRef("order_id", () => orders.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  quantity: integer("quantity").notNull(),
  // price: numeric("price", { precision: 12, scale: 2 }).notNull(),
  ...timeStamps,
});

export const fulfillmentOrders = pgTable("fulfillment_orders", {
  id: text("id").primaryKey(),
  orderId: foreignkeyRef("order_id", () => orders.id, { onDelete: "cascade" }),

  status: varchar("status", { length: 50 }),
  requestStatus: varchar("request_status", { length: 50 }),
  fulfillAt: timestamp("fulfill_at"),
  fulfillBy: timestamp("fulfill_by"),

  deliveryMethod: varchar("delivery_method", { length: 50 }),
  deliveryMinDate: timestamp("delivery_min_date"),
  deliveryMaxDate: timestamp("delivery_max_date"),

  destCity: varchar("dest_city", { length: 100 }),
  destCountry: varchar("dest_country", { length: 5 }),
  destZip: varchar("dest_zip", { length: 20 }),

  onHoldReason: text("on_hold_reason"),

  ...timeStamps,
});

// TODO: Relations B/W orders and orderLineItems
export const orderRelations = relations(orders, ({ many }) => ({
  orderItems: many(orderItems),
  fulfillmentOrders: many(fulfillmentOrders),
}));

export const fulfillmentOrdersRelations = relations(
  fulfillmentOrders,
  ({ one }) => ({
    order: one(orders, {
      fields: [fulfillmentOrders.orderId],
      references: [orders.id],
    }),
  })
);

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
}));

// *This is the schema of settings
export const settings = pgTable("settings", {
  id: uuid("id").primaryKey(),
  storeId: foreignkeyRef("store_id", () => users.id, {
    onDelete: "cascade",
  }).notNull(),
  lostParcelThreshold: integer("lost_parcel_threshold").notNull(),
  lostParcelPeriod: integer("lost_parcel_period").notNull(),
  lossRateThreshold: integer("loss_rate_threshold"),
  matchSensitivity: text("match_sensitivity"),
  ...timeStamps,
});

// export const settingsRelations = relations(settings, ({ many }) => ({
//   settings: many(settings),
// }));

export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey(),
  storeId: uuid("store_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  customerId: uuid("customer_id").references(() => customers.id, {
    onDelete: "set null",
  }),
  type: text("type").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  meta: json("meta").$type<{
    orderId?: string;
    orderName?: string;
    reasons?: string[];
    totalAmount?: string;
    currency?: string;
  }>(),
  read: boolean("read").default(false),
  ...timestamp,
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
