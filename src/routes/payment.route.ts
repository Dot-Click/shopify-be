import { Router } from "express";
import { subscriptionController } from "@/controllers/payment.controller";
import { StripePayment } from "@/controllers/payments/stripe.controller";

const paymentRouter = Router();

paymentRouter.post("/create", subscriptionController);
paymentRouter.post("/create-stripe", StripePayment);

export default paymentRouter;
