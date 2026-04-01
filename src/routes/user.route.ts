import { Router } from "express";
import {
  fetchStoresController,
  imageUpload,
  incrementSearchCount,
  updateStoreStatusController,
} from "@/controllers/user.controller";
import { protectRoute } from "@/middlewares/auth.middleware";

const userRouter = Router();

userRouter.get("/fetch", fetchStoresController);
userRouter.put("/update", updateStoreStatusController);
userRouter.put("/increment-searches", protectRoute, incrementSearchCount);

userRouter.post("/upload-avatar", imageUpload);

export default userRouter;
