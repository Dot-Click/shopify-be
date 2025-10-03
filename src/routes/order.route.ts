import { Router } from "express";
import { getOrders } from "@/controllers/orders/getorders.controller";
import { protectRoute } from "@/middlewares/auth.middleware";
import { getRiskyOrders } from "@/controllers/orders/riskyorders.controller";
import { addFlag } from "@/controllers/orders/addflag.controller";
import { deleteFlag } from "@/controllers/orders/deleteflag.controller";
import { getCustomerRefundHistoryFromShopify } from "@/controllers/orders/getrefunds.controller";

const orderRouter = Router();

orderRouter.get("/orders", protectRoute, getOrders);
orderRouter.get("/risky-orders", protectRoute, getRiskyOrders);
orderRouter.post("/add-flag", protectRoute, addFlag);
orderRouter.post("/delete-flag", protectRoute, deleteFlag);
orderRouter.get(
  "/customer-refunds/:userId",
  protectRoute,
  getCustomerRefundHistoryFromShopify
);

export default orderRouter;
