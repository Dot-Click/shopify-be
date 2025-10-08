import { combinedReport } from "@/controllers/reports/combinationreport.controller";
import { customerReport } from "@/controllers/reports/customerreport.controller";
import { getHighRiskActivityReport } from "@/controllers/reports/highriskcustomer.controller";
import { getLossPreventionValueReport } from "@/controllers/reports/lossprevention.controller";
import { storeReportActivity } from "@/controllers/reports/storereport.controller";
import { getSuspiciousOrdersSummary } from "@/controllers/reports/suspiciousorder.controller";
import { protectRoute } from "@/middlewares/auth.middleware";
import { Router } from "express";

const reportsRouter = Router();

// These are PDFs
reportsRouter.get("/store-activity-report", protectRoute, storeReportActivity);
reportsRouter.get("/customer-report", protectRoute, customerReport);
reportsRouter.get("/combined-report", protectRoute, combinedReport);
reportsRouter.get(
  "/high-risk-csutomer-report",
  protectRoute,
  getHighRiskActivityReport
);

// These are Tables for report page
reportsRouter.get(
  "/suspicious-order-report",
  protectRoute,
  getSuspiciousOrdersSummary
);
reportsRouter.get(
  "/loss-prevention-report",
  protectRoute,
  getLossPreventionValueReport
);

export default reportsRouter;
