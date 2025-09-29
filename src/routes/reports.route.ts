import { combinedReport } from "@/controllers/reports/combinationreport.controller";
import { customerReport } from "@/controllers/reports/customerreport.controller";
import { getHighRiskActivityReport } from "@/controllers/reports/highriskcustomer.controller";
import { getLossPreventionValueReport } from "@/controllers/reports/lossprevention.controller";
import { storeReportActivity } from "@/controllers/reports/storereport.controller";
import { getSuspiciousOrdersSummary } from "@/controllers/reports/suspiciousorder.controller";
import { Router } from "express";

const reportsRouter = Router();

// These are PDFs
reportsRouter.get("/store-activity-report", storeReportActivity);
reportsRouter.get("/customer-report", customerReport);
reportsRouter.get("/combined-report", combinedReport);
reportsRouter.get("/high-risk-csutomer-report", getHighRiskActivityReport);

// These are Tables for report page
reportsRouter.get("/suspicious-order-report", getSuspiciousOrdersSummary);
reportsRouter.get("/loss-prevention-report", getLossPreventionValueReport);

export default reportsRouter;
