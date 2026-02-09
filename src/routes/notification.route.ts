import { Router } from "express";
import { protectRoute } from "@/middlewares/auth.middleware";
import { getNotificationController } from "@/controllers/notification/getnotificaiton.controller";
import { markNotificationSeen } from "@/controllers/notification/marknotification.controller";
import {
  getVapidPublicKeyController,
  savePushSubscriptionController,
} from "@/controllers/notification/pushsubscription.controller";

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

notificationRouter.get("/vapid-public-key", getVapidPublicKeyController);

notificationRouter.post(
  "/push-subscription",
  protectRoute,
  savePushSubscriptionController
);

export default notificationRouter;
