import { Router } from "express";
import { protectRoute } from "@/middlewares/auth.middleware";
import { blockCustomer } from "@/controllers/customer/blockcustomer.controller";
import { TotalFlaggedCustomers } from "@/controllers/customer/totalflagged.controller";
import { getCustomerRefundsAcrossStores } from "@/controllers/customer/getcustomerforstore.controller";
import { getCustomersForAdminDashboard } from "@/controllers/customer/getcustomersforadmin.controller";
import { getRepeatedOffenders } from "@/controllers/customer/getrepeatedoffenders.controller";
import { getTopRiskyIPs } from "@/controllers/customer/getriskyips.controller";
import { getTopFlaggedReasons } from "@/controllers/customer/topflaggedreason.controller";
import { getMonthlyRiskIncidents } from "@/controllers/customer/riskincidents.controller";
import { getRiskChartData } from "@/controllers/customer/getaffectedincidents.controller";

const customerRouter = Router();

customerRouter.get("/customers", protectRoute, getCustomerRefundsAcrossStores);
customerRouter.get("/admin-customers", getCustomersForAdminDashboard);
customerRouter.post("/block-customer", protectRoute, blockCustomer);
customerRouter.get(
  "/total-flagged-customer",
  protectRoute,
  TotalFlaggedCustomers
);

customerRouter.get("/repeated-offenders", protectRoute, getRepeatedOffenders);
customerRouter.get("/top-risky-ips", protectRoute, getTopRiskyIPs);
customerRouter.get("/top-flagged-reason", protectRoute, getTopFlaggedReasons);
customerRouter.get(
  "/monthly-risk-incidents",
  protectRoute,
  getMonthlyRiskIncidents
);
customerRouter.get("/risk-chart-data", protectRoute, getRiskChartData);

export default customerRouter;
