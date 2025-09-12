import { Router } from "express";
import {
  // getCustomers,
  getCustomerRefundsAcrossStores,
  getCustomersForAdminDashboard,
  getOrders,
} from "@/controllers/shopify.controller";
import { protectRoute } from "@/middlewares/auth.middleware";

const shopifyRouter = Router();

shopifyRouter.get("/customers", protectRoute, getCustomerRefundsAcrossStores);
shopifyRouter.get("/orders", protectRoute, getOrders);

shopifyRouter.get("/admin-customers", getCustomersForAdminDashboard);

export default shopifyRouter;
