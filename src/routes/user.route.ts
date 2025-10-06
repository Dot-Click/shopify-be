import { Router } from "express";
import {
  fetchStoresController,
  imageUpload,
  updateStoreStatusController,
} from "@/controllers/user.controller";

const userRouter = Router();

userRouter.get("/fetch", fetchStoresController);
userRouter.put("/update", updateStoreStatusController);

userRouter.post("/upload-avatar", imageUpload);

export default userRouter;
