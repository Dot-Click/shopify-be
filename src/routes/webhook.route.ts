import { Router } from "express";
import { ordersCreateWebhook } from "@/webhooks/order.webhook";
import { refundsCreateWebhook } from "@/webhooks/refunds.webhook";

const webhookRouter = Router();

webhookRouter.post("/orders/create", ordersCreateWebhook);
webhookRouter.post("/refunds/create", refundsCreateWebhook);

export default webhookRouter;
