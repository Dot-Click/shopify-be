import { getActivities } from "@/controllers/activity/getactivity.controller";
import { Router } from "express";

const activityRouter = Router();

activityRouter.get("/activities", getActivities)
export default activityRouter;
