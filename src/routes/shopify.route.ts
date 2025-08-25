import { Router } from "express";
import { getCustomers } from "@/controllers/shopify.controller";
import { protectRoute } from "@/middlewares/auth.middleware";

const shopifyRouter = Router();

shopifyRouter.get("/customers", protectRoute, getCustomers);

export default shopifyRouter;
