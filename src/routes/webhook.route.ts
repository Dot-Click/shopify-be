import { Router } from "express";
import { ordersCreateWebhook } from "@/webhooks/order.webhook";

const webhookRouter = Router();

webhookRouter.post("/orders/create", ordersCreateWebhook);
webhookRouter.post("/refunds/create", ordersCreateWebhook);

export default webhookRouter;
