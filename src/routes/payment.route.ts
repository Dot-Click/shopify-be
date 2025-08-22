import { Router } from "express";
import { subscriptionController } from "@/controllers/payment.controller";

const paymentRouter = Router();

paymentRouter.post("/create", subscriptionController);

export default paymentRouter;
