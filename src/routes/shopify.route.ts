import { Router } from "express";
import {
  // getCustomers,
  getCustomerRefundsAcrossStores,
  getCustomersForAdminDashboard,
  getOrders,
} from "@/controllers/shopify.controller";
import { protectRoute } from "@/middlewares/auth.middleware";
import { getRiskyOrders } from "@/controllers/orders/riskyorders.controller";
import { addFlag } from "@/controllers/orders/addflag.controller";
import { deleteFlag } from "@/controllers/orders/deleteflag.controller";
import { blockCustomer } from "@/controllers/customer/blockcustomer.controller";

const shopifyRouter = Router();

shopifyRouter.get("/customers", protectRoute, getCustomerRefundsAcrossStores);
shopifyRouter.get("/orders", protectRoute, getOrders);
shopifyRouter.get("/risky-orders", protectRoute, getRiskyOrders);
shopifyRouter.post("/add-flag", protectRoute, addFlag);
shopifyRouter.post("/delete-flag", protectRoute, deleteFlag);
shopifyRouter.get("/admin-customers", getCustomersForAdminDashboard);
shopifyRouter.post("/block-customer", protectRoute, blockCustomer);

export default shopifyRouter;
