import { combinedReport } from "@/controllers/reports/combinationreport.controller";
import { customerReport } from "@/controllers/reports/customerreport.controller";
import { storeReportActivity } from "@/controllers/reports/storereport.controller";
import { Router } from "express";

const reportsRouter = Router();

reportsRouter.get("/store-activity-report", storeReportActivity);
reportsRouter.get("/customer-report", customerReport);
reportsRouter.get("/combined-report", combinedReport);

export default reportsRouter;
