import { Router } from "express";
import { paymentController } from "@/controllers/payment.controller";

const paymentRouter = Router();

paymentRouter.post("/", paymentController);

export default paymentRouter;
