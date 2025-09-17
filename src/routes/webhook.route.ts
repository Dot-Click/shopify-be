import { Router } from "express";
import { ordersCreateWebhook } from "@/webhooks/order.webhook";

const webhookRouter = Router();

webhookRouter.post("/orders/create", ordersCreateWebhook);

export default webhookRouter;
