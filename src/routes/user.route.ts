import { Router } from "express";
import {
  fetchStoresController,
  updateStoreStatusController,
} from "@/controllers/user.controller";

const userRouter = Router();

userRouter.get("/fetch", fetchStoresController);
userRouter.put("/update", updateStoreStatusController);

export default userRouter;
