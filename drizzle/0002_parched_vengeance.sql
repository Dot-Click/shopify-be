CREATE TABLE "customers" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"email" text,
	"phone" text,
	"total_refunded" numeric(12, 2),
	"total_orders" integer,
	"risk_level" integer,
	"refunds_from_stores" integer,
	"risky_since" timestamp,
	"store_id" varchar(128),
	"blocked" boolean DEFAULT false,
	"tags" varchar(255),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "fulfillment_orders" (
	"id" text PRIMARY KEY NOT NULL,
	"order_id" varchar(128),
	"status" varchar(50),
	"request_status" varchar(50),
	"fulfill_at" timestamp,
	"fulfill_by" timestamp,
	"delivery_method" varchar(50),
	"delivery_min_date" timestamp,
	"delivery_max_date" timestamp,
	"dest_city" varchar(100),
	"dest_country" varchar(5),
	"dest_zip" varchar(20),
	"on_hold_reason" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" text PRIMARY KEY NOT NULL,
	"order_id" varchar(128),
	"name" varchar(255) NOT NULL,
	"quantity" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" text PRIMARY KEY NOT NULL,
	"name" varchar(50) NOT NULL,
	"total_amount" numeric(12, 2) NOT NULL,
	"currency" varchar(10) NOT NULL,
	"customer_id" varchar NOT NULL,
	"customer_email" varchar(150),
	"customer_phone" varchar(20),
	"display_fulfillment_status" varchar(50),
	"fulfillment_status" varchar(50),
	"tracking_number" varchar(255),
	"tracking_company" varchar(255),
	"delivered_at" timestamp,
	"dispute_opened" boolean DEFAULT false NOT NULL,
	"manual_flag" boolean DEFAULT false,
	"flagged" boolean DEFAULT false,
	"flag_reason" text,
	"risk_level" varchar(50),
	"total_refunded" numeric(12, 2),
	"risk_recommendation" varchar(50),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" varchar PRIMARY KEY NOT NULL,
	"store_id" varchar(128),
	"lost_parcel_threshold" integer,
	"lost_parcel_period" integer,
	"loss_rate_threshold" integer,
	"match_sensitivity" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp
);
--> statement-breakpoint
DROP TABLE "payment_sessions" CASCADE;--> statement-breakpoint
DROP TABLE "payments" CASCADE;--> statement-breakpoint
DROP TABLE "subscriptions" CASCADE;--> statement-breakpoint
DROP TABLE "webhook_events" CASCADE;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "role" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "banned" boolean;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "ban_reason" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "ban_expires" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "shopify_access_token" text;--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_store_id_users_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fulfillment_orders" ADD CONSTRAINT "fulfillment_orders_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settings" ADD CONSTRAINT "settings_store_id_users_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "shopify_api_secret";