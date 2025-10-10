import { fetchSettings } from "./../controllers/settings/getsettings.controller";
import { Router } from "express";
import { protectRoute } from "@/middlewares/auth.middleware";
import { createSettings } from "@/controllers/settings/setting.controller";

const settingsRouter = Router();

settingsRouter.post("/create", protectRoute, createSettings);
settingsRouter.get("/fetch", protectRoute, fetchSettings);

export default settingsRouter;
