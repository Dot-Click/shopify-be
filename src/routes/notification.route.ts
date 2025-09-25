import { Router } from "express";
import { protectRoute } from "@/middlewares/auth.middleware";
import { getNotificationController } from "@/controllers/notification/getnotificaiton.controller";
import { markNotificationSeen } from "@/controllers/notification/marknotification.controller";

const notificationRouter = Router();

notificationRouter.get(
  "/get-notifications",
  protectRoute,
  getNotificationController
);

notificationRouter.put(
  "/mark-as-read/:id",
  protectRoute,
  markNotificationSeen
);

export default notificationRouter;
