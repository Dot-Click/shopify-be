CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "activities" (
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"action" text NOT NULL,
	"for" varchar NOT NULL,
	"store_id" varchar(128),
	"customer_id" varchar(128),
	"order_id" varchar(128),
	"meta" json,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"email" text,
	"phone" text,
	"total_refunded" numeric(12, 2),
	"total_orders" integer,
	"risk_level" integer,
	"flagged" boolean,
	"risk_reason" varchar,
	"refunds_from_stores" integer,
	"risky_since" timestamp,
	"store_id" varchar(128),
	"blocked" boolean DEFAULT false,
	"ip" varchar,
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
CREATE TABLE "notifications" (
	"id" varchar PRIMARY KEY NOT NULL,
	"store_id" varchar NOT NULL,
	"customer_id" varchar,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"meta" json,
	"read" boolean DEFAULT false,
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
	"auto_cancel" boolean DEFAULT false,
	"risk_level" varchar(50),
	"total_refunded" numeric(12, 2),
	"risk_recommendation" varchar(50),
	"customerId" varchar(128),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" varchar PRIMARY KEY NOT NULL,
	"store_id" varchar(128) NOT NULL,
	"lost_parcel_threshold" integer DEFAULT 3 NOT NULL,
	"lost_parcel_period" integer DEFAULT 1 NOT NULL,
	"loss_rate_threshold" integer,
	"match_sensitivity" text,
	"primary_action" varchar,
	"require_signature" boolean DEFAULT false,
	"force_signed_delivery" boolean DEFAULT false,
	"photo_on_delivery" boolean DEFAULT false,
	"send_cancellation_email" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "throttle_insight" (
	"wait_time" integer NOT NULL,
	"ms_before_next" integer NOT NULL,
	"end_point" varchar(225),
	"allotted_points" integer NOT NULL,
	"consumed_points" integer NOT NULL,
	"remaining_points" integer NOT NULL,
	"key" varchar(225) PRIMARY KEY NOT NULL,
	"is_first_in_duration" boolean NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean NOT NULL,
	"image" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"banned" boolean DEFAULT false,
	"ban_reason" text,
	"ban_expires" timestamp,
	"company_name" text,
	"mobile_number" text,
	"company_registration_number" text,
	"average_orders_per_month" text,
	"plan" text,
	"package" text,
	"shopify_api_key" text,
	"shopify_access_token" text,
	"shopify_url" text,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp,
	"updated_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_store_id_users_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_store_id_users_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fulfillment_orders" ADD CONSTRAINT "fulfillment_orders_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_store_id_users_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_customerId_customers_id_fk" FOREIGN KEY ("customerId") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settings" ADD CONSTRAINT "settings_store_id_users_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;