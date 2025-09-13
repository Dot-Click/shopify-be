import { Router } from "express";
import { protectRoute } from "@/middlewares/auth.middleware";
import { createSettings } from "@/controllers/setting.controller";

const settingsRouter = Router();

settingsRouter.post("/create", protectRoute, createSettings);

export default settingsRouter;
