export interface ShopifyRefundActivity {
  id: string;
  createdAt?: string | null;
  totalRefundedSet?: {
    shopMoney?: {
      amount?: string | number | null;
      currencyCode?: string | null;
    } | null;
  } | null;
}

export interface ShopifyReturnActivity {
  id: string;
  status?: string | null;
  createdAt?: string | null;
}

type ShopifyReturnEdge = {
  node?: ShopifyReturnActivity | null;
};

export type ShopifyReturnsValue =
  | ShopifyReturnActivity[]
  | {
      nodes?: ShopifyReturnActivity[] | null;
      edges?: ShopifyReturnEdge[] | null;
    }
  | null
  | undefined;

export interface ShopifyLossOrder {
  refunds?: ShopifyRefundActivity[] | null;
  returns?: ShopifyReturnsValue;
}

const NON_RISK_RETURN_STATUSES = new Set(["DECLINED", "CANCELED", "CANCELLED"]);

export const buildReturnsSelection = ({
  includeReturns,
  limit = 5,
  includeCreatedAt = false,
}: {
  includeReturns: boolean;
  limit?: number;
  includeCreatedAt?: boolean;
}) => {
  if (!includeReturns) {
    return "";
  }

  return `
    returns(first: ${limit}) {
      nodes {
        id
        status
        ${includeCreatedAt ? "createdAt" : ""}
      }
    }
  `;
};

export const normalizeReturns = (
  returnsValue: ShopifyReturnsValue
): ShopifyReturnActivity[] => {
  if (!returnsValue) {
    return [];
  }

  if (Array.isArray(returnsValue)) {
    return returnsValue.filter(Boolean);
  }

  if (Array.isArray(returnsValue.nodes)) {
    return returnsValue.nodes.filter(Boolean);
  }

  if (Array.isArray(returnsValue.edges)) {
    return returnsValue.edges
      .map((edge) => edge?.node)
      .filter((node): node is ShopifyReturnActivity => Boolean(node));
  }

  return [];
};

export const getRiskRelevantReturns = (
  order: ShopifyLossOrder
): ShopifyReturnActivity[] => {
  return normalizeReturns(order.returns).filter((returnRecord) => {
    const status = (returnRecord.status || "").toUpperCase();
    return !NON_RISK_RETURN_STATUSES.has(status);
  });
};

export const countLossEvents = (order: ShopifyLossOrder): number => {
  const refundCount = Array.isArray(order.refunds) ? order.refunds.length : 0;
  return refundCount + getRiskRelevantReturns(order).length;
};

export const hasLossEvents = (order: ShopifyLossOrder): boolean => {
  return countLossEvents(order) > 0;
};

export const hasReturnAccessError = (
  errors: Array<{ message?: string; path?: Array<string | number> | string }> | undefined
): boolean => {
  if (!Array.isArray(errors) || errors.length === 0) {
    return false;
  }

  return errors.some((error) => {
    const message = (error.message || "").toLowerCase();
    const path = Array.isArray(error.path)
      ? error.path.join(".").toLowerCase()
      : String(error.path || "").toLowerCase();

    return (
      message.includes("read_returns") ||
      message.includes('cannot query field "returns"') ||
      path.includes("returns") ||
      (message.includes("access denied") && message.includes("return"))
    );
  });
};
