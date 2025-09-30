import { database } from "@/configs/connection.config";
import { activities } from "@/schema/schema";
import { createId } from "@paralleldrive/cuid2";

interface LogActivityParams {
  action: string;
  for: "store" | "customer"
  storeId?: string | null;
  customerId?: string;
  orderId?: string;
  meta?: Record<string, any>;
}

export async function logActivity(params: LogActivityParams) {
  try {
    await database.insert(activities).values({
      id: createId(),
      action: params.action,
      for: params.for,
      storeId: params.storeId ?? null,
      customerId: params.customerId ?? null,
      orderId: params.orderId ?? null,
      meta: params.meta ?? {},
      createdAt: new Date(),
    });
  } catch (err) {
    console.error("logActivity error:", err);
  }
}
