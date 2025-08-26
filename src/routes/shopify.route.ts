import { Router } from "express";
import { getCustomers, getOrders } from "@/controllers/shopify.controller";
import { protectRoute } from "@/middlewares/auth.middleware";

const shopifyRouter = Router();

shopifyRouter.get("/customers", protectRoute, getCustomers);
shopifyRouter.get("/orders", protectRoute, getOrders);

export default shopifyRouter;
