interface RiskSettings {
  createdAt: Date | null;
  updatedAt: Date | null;
  id: string;
  storeId: string;
  lostParcelThreshold: number;
  lostParcelPeriod: number;
  lossRateThreshold: number | null;
  matchSensitivity: string | null;
}

interface CustomerOrder {
  node: {
    createdAt: string;
    refunds: { createdAt: string; id: string }[];
  };
}

interface CustomerNode {
  orders: {
    edges: CustomerOrder[];
  };
}

export const calculateCustomerRisk = (
  customer: CustomerNode,
  settings: RiskSettings
) => {
  const { lostParcelThreshold, lostParcelPeriod, lossRateThreshold } = settings;
  const now = new Date();
  const periodStartDate = new Date(
    new Date().setMonth(now.getMonth() - lostParcelPeriod)
  );

  // --- Step 1: Time-Based Threshold (Always runs) ---
  // This is the mandatory check for all users.
  const refundsInPeriod = customer.orders.edges.flatMap((order) =>
    order.node.refunds.filter(
      (refund) => new Date(refund.createdAt) >= periodStartDate
    )
  );

  if (refundsInPeriod.length >= lostParcelThreshold) {
    return {
      isFlagged: true,
      riskLevel: "High",
      riskReason: `Exceeded threshold: ${refundsInPeriod.length} refunds in the last ${lostParcelPeriod} months.`,
    };
  }

  const totalOrders = customer.orders.edges.length;
  if (totalOrders === 0) {
    return { isFlagged: false, riskLevel: "Low", riskReason: "No orders." };
  }

  if (typeof lossRateThreshold === "number") {
    const ordersWithRefunds = customer.orders.edges.filter(
      (order) => order.node.refunds.length > 0
    );
    const refundRate = (ordersWithRefunds.length / totalOrders) * 100;

    // A) Check if the rate flags the customer
    if (refundRate >= lossRateThreshold) {
      return {
        isFlagged: true,
        riskLevel: "High",
        riskReason: `Exceeded rate: ${refundRate.toFixed(
          0
        )}% refund rate is above the ${lossRateThreshold}% threshold.`,
      };
    }

    // B) If not flagged, determine if they are medium or low risk
    let riskLevel = "Low";
    if (lossRateThreshold > 0 && refundRate > lossRateThreshold / 2) {
      riskLevel = "Medium";
    }

    return {
      isFlagged: false,
      riskLevel,
      riskReason: `Refund rate of ${refundRate.toFixed(0)}% is within limits.`,
    };
  }

  return {
    isFlagged: false,
    riskLevel: "Low",
    riskReason: "Within time-based refund limits. Rate threshold not set.",
  };
};
