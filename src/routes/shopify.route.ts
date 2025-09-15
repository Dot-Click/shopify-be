import { Router } from "express";
import {
  // getCustomers,
  getCustomerRefundsAcrossStores,
  getCustomersForAdminDashboard,
  getOrders,
} from "@/controllers/shopify.controller";
import { protectRoute } from "@/middlewares/auth.middleware";
import { getRiskyOrders } from "@/controllers/shopify/riskyorders.controller";

const shopifyRouter = Router();

shopifyRouter.get("/customers", protectRoute, getCustomerRefundsAcrossStores);
shopifyRouter.get("/orders", protectRoute, getOrders);
shopifyRouter.get("/risky-orders", protectRoute, getRiskyOrders);

shopifyRouter.get("/admin-customers", getCustomersForAdminDashboard);

export default shopifyRouter;
