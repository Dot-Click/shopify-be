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
): { isFlagged: boolean; riskLevel: number; riskReason: string } => {
  //** get settings
  const { lostParcelThreshold, lostParcelPeriod, lossRateThreshold } = settings;

  // TODO: no. of order refund in no. of month calculation
  const now = new Date();
  const periodStartDate = new Date(
    new Date().setMonth(now.getMonth() - lostParcelPeriod)
  );

  const refundsInPeriod = customer.orders.edges.flatMap((order) =>
    order.node.refunds.filter(
      (refund) => new Date(refund.createdAt) >= periodStartDate
    )
  );

  if (refundsInPeriod.length >= lostParcelThreshold) {
    return {
      isFlagged: true,
      riskLevel: 100,
      riskReason: `Exceeded threshold: ${refundsInPeriod.length} refunds in the last ${lostParcelPeriod} months.`,
    };
  }

  // TODO: If user passes the Threshold (optional)

  const totalOrders = customer.orders.edges.length;

  if (totalOrders === 0) {
    return {
      isFlagged: false,
      riskLevel: 0,
      riskReason: "No orders found for this customer.",
    };
  }

  const ordersWithRefunds = customer.orders.edges.filter(
    (order) => order.node.refunds.length > 0
  );
  const refundRate = (ordersWithRefunds.length / totalOrders) * 100;

  if (typeof lossRateThreshold === "number" && lossRateThreshold > 0) {
    if (refundRate >= lossRateThreshold) {
      return {
        isFlagged: true,
        riskLevel: Math.round(refundRate),
        riskReason: `Exceeded rate: ${refundRate.toFixed(
          0
        )}% refund rate above ${lossRateThreshold}% threshold.`,
      };
    }
    return {
      isFlagged: false,
      riskLevel: Math.round(refundRate),
      riskReason: `Refund rate of ${refundRate.toFixed(
        0
      )}% is within the safe limit.`,
    };
  }

  // TODO: Return if there is customer is All Good :)
  return {
    isFlagged: false,
    riskLevel: 0,
    riskReason: "Within time-based refund limits. No loss rate threshold set.",
  };
};
