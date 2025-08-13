# eComProtect Implementation Guide

## Overview

This guide provides step-by-step instructions for implementing the eComProtect system based on the PDF requirements. The system includes user management, risk detection, store management, and comprehensive reporting.

## Phase 1: Database Setup

### 1.1 Install Dependencies

```bash
cd shopify-be
npm install
```

### 1.2 Configure Environment

1. Copy `config.env.example` to `.env`
2. Update database connection string
3. Configure email and payment service keys

### 1.3 Generate and Apply Database Schema

```bash
npm run dbgenerate
npm run dbpush
```

## Phase 2: Core Authentication System

### 2.1 Update Sign-In Form

**File**: `shopify-fe/src/components/authform/signin.form.tsx`

**Requirements**:

- Remove Google/Facebook sign-in buttons
- Add Security Agreement checkbox:
  ```
  ☐ I agree to the Security Agreement
  "Unauthorised access is prohibited. Attempting to log in without proper authorisation may constitute a criminal offence under UK law"
  ```

**Implementation**:

```tsx
// Add to form state
const [securityAgreement, setSecurityAgreement] = useState(false);

// Add checkbox before submit button
<div className="flex items-center space-x-2 mb-4">
  <input
    type="checkbox"
    id="security-agreement"
    checked={securityAgreement}
    onChange={(e) => setSecurityAgreement(e.target.checked)}
    required
  />
  <label htmlFor="security-agreement" className="text-sm text-gray-600">
    I agree to the Security Agreement. Unauthorised access is prohibited.
    Attempting to log in without proper authorisation may constitute a criminal
    offence under UK law.
  </label>
</div>;
```

### 2.2 Update Sign-Up Form

**File**: `shopify-fe/src/components/authform/signup.form.tsx`

**Requirements**:

- Remove Google/Facebook sign-up buttons
- Add required fields:
  - Company Name
  - Company Registration Number
  - Average Number of Orders Per Month
  - Store URL
  - First Name
  - Surname
  - Email Address
  - Mobile Phone Number (for MFA)
  - Password
  - Confirm Password
- Update right-side text to "Start your eComProtect journey today."

**Implementation**:

```tsx
// Form fields structure
const formFields = [
  { name: "companyName", label: "Company Name", type: "text", required: true },
  {
    name: "companyRegNumber",
    label: "Company Registration Number",
    type: "text",
    required: true,
  },
  {
    name: "avgOrdersPerMonth",
    label: "Average Number of Orders Per Month",
    type: "number",
    required: true,
  },
  { name: "storeUrl", label: "Store URL", type: "url", required: true },
  { name: "firstName", label: "First Name", type: "text", required: true },
  { name: "surname", label: "Surname", type: "text", required: true },
  { name: "email", label: "Email Address", type: "email", required: true },
  {
    name: "mobilePhone",
    label: "Mobile Phone Number (for MFA)",
    type: "tel",
    required: true,
  },
  { name: "password", label: "Password", type: "password", required: true },
  {
    name: "confirmPassword",
    label: "Confirm Password",
    type: "password",
    required: true,
  },
];

// Update right-side text
<div className="text-right">
  <h2 className="text-2xl font-bold mb-2">
    Start your eComProtect journey today.
  </h2>
  <p className="text-gray-600">Enter your credentials to access your Account</p>
</div>;
```

## Phase 3: Post-Signup Flow

### 3.1 Plan Determination Logic

**File**: `shopify-be/src/utils/plan.util.ts`

**Implementation**:

```typescript
export const determinePlan = (
  avgOrdersPerMonth: number
): "starter" | "growth" | "pro" | "enterprise" => {
  if (avgOrdersPerMonth <= 300) return "starter";
  if (avgOrdersPerMonth <= 2000) return "growth";
  if (avgOrdersPerMonth <= 5000) return "pro";
  return "enterprise";
};

export const getPlanDetails = (plan: string) => {
  const plans = {
    starter: { name: "Starter", price: 29.99, maxOrders: 300 },
    growth: { name: "Growth", price: 79.99, maxOrders: 2000 },
    pro: { name: "Pro", price: 199.99, maxOrders: 5000 },
    enterprise: { name: "Enterprise", price: 0, maxOrders: null },
  };
  return plans[plan] || plans.starter;
};
```

### 3.2 Package Selection Page

**File**: `shopify-fe/src/pages/package-selection.page.tsx`

**Implementation**:

```tsx
const packages = [
  {
    id: "ecp_insight",
    name: "ECP Insight",
    description: "Lost Data Access Only",
    price: "Included",
    features: ["Basic risk detection", "Order flagging", "Email alerts"],
  },
  {
    id: "ecp_vision",
    name: "ECP Vision",
    description: "Lost Data + % Loss Rate",
    price: "+£19.99/month",
    features: ["Advanced analytics", "Loss rate tracking", "Custom thresholds"],
  },
  {
    id: "ecp_shield",
    name: "ECP Shield",
    description: "Lost Data + % Loss Rate + Waiver Workflow",
    price: "+£39.99/month",
    features: [
      "All Vision features",
      "Waiver management",
      "Advanced workflows",
    ],
    comingSoon: true,
  },
];
```

### 3.3 Payment Integration

**File**: `shopify-be/src/routes/payment.routes.ts`

**Implementation**:

```typescript
// GoCardless integration
export const setupDirectDebit = async (req: Request, res: Response) => {
  const { storeId, packageId } = req.body;

  try {
    // Create GoCardless mandate
    const mandate = await goCardless.mandates.create({
      links: { creditor: process.env.GOCARDLESS_CREDITOR_ID },
      scheme: "bacs",
      metadata: { store_id: storeId, package_id: packageId },
    });

    // Store mandate ID
    await db
      .update(packageSubscriptions)
      .set({ goCardlessMandateId: mandate.id })
      .where(eq(packageSubscriptions.storeId, storeId));

    res.json({
      success: true,
      redirectUrl: mandate.authorisation_url,
    });
  } catch (error) {
    res.status(500).json({ error: "Payment setup failed" });
  }
};
```

### 3.4 Application Review System

**File**: `shopify-be/src/routes/application.routes.ts`

**Implementation**:

```typescript
export const createApplicationReview = async (req: Request, res: Response) => {
  const { storeId, plan, package: pkg, contactDetails } = req.body;

  try {
    // Create store with pending status
    const store = await db.insert(stores).values({
      id: storeId,
      status: "pending_approval",
      plan,
      package: pkg,
      // ... other fields
    });

    // Create application review record
    await db.insert(applicationReviews).values({
      storeId,
      status: "pending",
    });

    // Send notification email
    if (plan === "enterprise") {
      await sendHotLeadEmail(contactDetails);
    } else {
      await sendPendingApprovalEmail(contactDetails);
    }

    res.json({ success: true, status: "pending_approval" });
  } catch (error) {
    res.status(500).json({ error: "Application creation failed" });
  }
};
```

## Phase 4: Dashboard Implementation

### 4.1 Store Management

**File**: `shopify-fe/src/pages/storemanagement.page.tsx`

**Requirements**:

- Click into each company to manage API info and sub-users
- Create Store button for stores not created via sign-up
- Delete and Suspend buttons with workflow actions

**Implementation**:

```tsx
const StoreManagement = () => {
  const [stores, setStores] = useState([]);
  const [selectedStore, setSelectedStore] = useState(null);

  const handleStoreAction = async (
    storeId: string,
    action: "suspend" | "delete"
  ) => {
    if (action === "suspend") {
      // Suspend workflow
      await suspendStore(storeId);
      // Disable account, send notifications
    } else if (action === "delete") {
      // Delete workflow
      await deleteStore(storeId);
      // Archive data, remove access
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1>Store Management</h1>
        <button className="btn-primary">Create Store</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {stores.map((store) => (
          <StoreCard
            key={store.id}
            store={store}
            onSelect={() => setSelectedStore(store)}
            onSuspend={() => handleStoreAction(store.id, "suspend")}
            onDelete={() => handleStoreAction(store.id, "delete")}
          />
        ))}
      </div>

      {selectedStore && (
        <StoreDetailModal
          store={selectedStore}
          onClose={() => setSelectedStore(null)}
        />
      )}
    </div>
  );
};
```

### 4.2 Customer Management

**File**: `shopify-fe/src/pages/customermanagement.page.tsx`

**Requirements**:

- Rename from "User Management" to "Customer Management"
- Search function at top (Name, Address, Email, Phone Number, IP Search)
- Remove filter dropdown

**Implementation**:

```tsx
const CustomerManagement = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [customers, setCustomers] = useState([]);

  const searchFields = [
    { key: "name", label: "Name" },
    { key: "address", label: "Address" },
    { key: "email", label: "Email" },
    { key: "phone", label: "Phone Number" },
    { key: "ip", label: "IP Search" },
  ];

  const handleSearch = async (query: string, field: string) => {
    const results = await searchCustomers(query, field);
    setCustomers(results);
  };

  return (
    <div>
      <h1>Customer Management</h1>

      {/* Search Bar */}
      <div className="search-container mb-6">
        <input
          type="text"
          placeholder="Search customers..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
        />
        <div className="search-fields">
          {searchFields.map((field) => (
            <button
              key={field.key}
              onClick={() => handleSearch(searchQuery, field.key)}
              className="search-field-btn"
            >
              {field.label}
            </button>
          ))}
        </div>
      </div>

      {/* Customer Table */}
      <CustomerTable customers={customers} />
    </div>
  );
};
```

### 4.3 View Detail Page

**File**: `shopify-fe/src/pages/customer-detail.page.tsx`

**Requirements**:

- Show all orders synced into eComProtect
- Display successful orders without flags
- Display orders with flags
- Option to delete/add flags

**Implementation**:

```tsx
const CustomerDetail = ({ customerId }: { customerId: string }) => {
  const [orders, setOrders] = useState([]);
  const [riskHistory, setRiskHistory] = useState(null);

  useEffect(() => {
    loadCustomerData(customerId);
  }, [customerId]);

  const handleFlagOrder = async (orderId: string, flagReason: string) => {
    await flagOrder(orderId, flagReason);
    // Refresh data
    loadCustomerData(customerId);
  };

  const handleRemoveFlag = async (orderId: string) => {
    await removeFlag(orderId);
    // Refresh data
    loadCustomerData(customerId);
  };

  return (
    <div>
      <CustomerHeader customer={customer} />

      {/* Risk Summary */}
      <RiskSummary riskHistory={riskHistory} />

      {/* Orders Section */}
      <div className="orders-section">
        <h2>Order History</h2>

        {/* Flagged Orders */}
        <div className="flagged-orders">
          <h3>Flagged Orders ({orders.filter((o) => o.isFlagged).length})</h3>
          {orders
            .filter((o) => o.isFlagged)
            .map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                onRemoveFlag={() => handleRemoveFlag(order.id)}
                showRiskDetails={true}
              />
            ))}
        </div>

        {/* Successful Orders */}
        <div className="successful-orders">
          <h3>
            Successful Orders ({orders.filter((o) => !o.isFlagged).length})
          </h3>
          {orders
            .filter((o) => !o.isFlagged)
            .map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                onAddFlag={() => handleFlagOrder(order.id, "")}
                showRiskDetails={false}
              />
            ))}
        </div>
      </div>
    </div>
  );
};
```

## Phase 5: Risk Detection Settings

### 5.1 Settings Page Implementation

**File**: `shopify-fe/src/pages/settings.page.tsx`

**Requirements**:

- Risk Detection Settings
- Action on Risky Orders
- Notifications & Alerts
- Reporting & Visibility

**Implementation**:

```tsx
const Settings = () => {
  const [settings, setSettings] = useState(defaultSettings);
  const [activeTab, setActiveTab] = useState("detection");

  const tabs = [
    { id: "detection", label: "Detection Rules" },
    { id: "actions", label: "Order Actions" },
    { id: "notifications", label: "Notifications & Alerts" },
    { id: "advanced", label: "Advanced Settings" },
  ];

  const handleSave = async () => {
    await updateStoreSettings(settings);
    toast.success("Settings saved successfully");
  };

  return (
    <div className="settings-container">
      <h1>Risk Detection Settings</h1>

      {/* Tab Navigation */}
      <div className="tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`tab ${activeTab === tab.id ? "active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === "detection" && (
          <DetectionRules
            settings={settings}
            onChange={(updates) => setSettings({ ...settings, ...updates })}
          />
        )}

        {activeTab === "actions" && (
          <OrderActions
            settings={settings}
            onChange={(updates) => setSettings({ ...settings, ...updates })}
          />
        )}

        {activeTab === "notifications" && (
          <Notifications
            settings={settings}
            onChange={(updates) => setSettings({ ...settings, ...updates })}
          />
        )}

        {activeTab === "advanced" && (
          <AdvancedSettings
            settings={settings}
            onChange={(updates) => setSettings({ ...settings, ...updates })}
          />
        )}
      </div>

      <div className="actions">
        <button onClick={handleSave} className="btn-primary">
          Save Settings
        </button>
      </div>
    </div>
  );
};
```

## Phase 6: Reporting System

### 6.1 Store Reports (Merchant-Facing)

**File**: `shopify-fe/src/pages/reports.page.tsx`

**Implementation**:

```tsx
const StoreReports = () => {
  const [dateRange, setDateRange] = useState("30days");
  const [reportData, setReportData] = useState(null);

  const reportTypes = [
    {
      id: "suspicious-orders",
      name: "Suspicious Orders Summary",
      description: "Show orders flagged as potentially high risk",
    },
    {
      id: "high-risk-customers",
      name: "High-Risk Customer Activity",
      description: "Highlight repeat high-risk customers",
    },
    {
      id: "loss-prevention",
      name: "Loss Prevention Value",
      description: "Show financial impact of using eComProtect",
    },
  ];

  const generateReport = async (type: string) => {
    const data = await fetchReportData(type, dateRange);
    setReportData(data);
  };

  return (
    <div>
      <div className="report-header">
        <h1>Reports & Analytics</h1>
        <DateRangeSelector value={dateRange} onChange={setDateRange} />
      </div>

      <div className="report-types">
        {reportTypes.map((type) => (
          <ReportCard
            key={type.id}
            type={type}
            onGenerate={() => generateReport(type.id)}
          />
        ))}
      </div>

      {reportData && <ReportDisplay data={reportData} />}
    </div>
  );
};
```

### 6.2 Admin Reports (Internal)

**File**: `shopify-fe/src/pages/admin-reports.page.tsx`

**Implementation**:

```tsx
const AdminReports = () => {
  const [selectedReport, setSelectedReport] = useState(null);

  const adminReports = [
    {
      id: "customer-growth",
      name: "Customer Database Growth",
      description: "Monitor high-risk database growth",
    },
    {
      id: "store-activity",
      name: "Store Activity & Utilisation",
      description: "See which stores are actively using eComProtect",
    },
    {
      id: "network-trends",
      name: "Network-Wide Risk Trends",
      description: "Identify macro patterns of high-risk behaviour",
    },
    {
      id: "store-onboarding",
      name: "Store Onboarding & Status",
      description: "Track new store sign-ups and pending approvals",
    },
    {
      id: "system-effectiveness",
      name: "System Effectiveness & Risk Prevention",
      description: "Quantify value provided across the network",
    },
  ];

  return (
    <div>
      <h1>Admin Reports</h1>

      <div className="admin-reports-grid">
        {adminReports.map((report) => (
          <AdminReportCard
            key={report.id}
            report={report}
            onSelect={() => setSelectedReport(report)}
          />
        ))}
      </div>

      {selectedReport && (
        <AdminReportModal
          report={selectedReport}
          onClose={() => setSelectedReport(null)}
        />
      )}
    </div>
  );
};
```

## Phase 7: Backend API Implementation

### 7.1 Store Routes

**File**: `shopify-be/src/routes/store.routes.ts`

**Implementation**:

```typescript
import { Router } from "express";
import { db } from "../configs/connection.config";
import { stores, users, storeSettings } from "../schema/schema";
import { eq } from "drizzle-orm";

const router = Router();

// Get all stores
export const getAllStores = async (req: Request, res: Response) => {
  try {
    const allStores = await db.select().from(stores);
    res.json(allStores);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch stores" });
  }
};

// Get store by ID with details
export const getStoreById = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const store = await db.select().from(stores).where(eq(stores.id, id));
    const storeUsers = await db
      .select()
      .from(users)
      .where(eq(users.storeId, id));
    const settings = await db
      .select()
      .from(storeSettings)
      .where(eq(storeSettings.storeId, id));

    res.json({
      store: store[0],
      users: storeUsers,
      settings: settings[0],
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch store details" });
  }
};

// Create new store
export const createStore = async (req: Request, res: Response) => {
  const storeData = req.body;

  try {
    const newStore = await db.insert(stores).values(storeData).returning();
    res.status(201).json(newStore[0]);
  } catch (error) {
    res.status(500).json({ error: "Failed to create store" });
  }
};

// Update store status
export const updateStoreStatus = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status, reason } = req.body;

  try {
    const updatedStore = await db
      .update(stores)
      .set({ status, updatedAt: new Date() })
      .where(eq(stores.id, id))
      .returning();

    // Log the action
    await db.insert(auditLog).values({
      action: `Store status changed to ${status}`,
      entityType: "store",
      entityId: id,
      newValues: { status, reason },
    });

    res.json(updatedStore[0]);
  } catch (error) {
    res.status(500).json({ error: "Failed to update store status" });
  }
};

export default router;
```

### 7.2 Risk Assessment Engine

**File**: `shopify-be/src/utils/risk-assessment.util.ts`

**Implementation**:

```typescript
export const assessOrderRisk = async (orderData: any, storeId: string) => {
  try {
    // Get store settings
    const settings = await getStoreSettings(storeId);

    // Get customer risk history
    const riskHistory = await getCustomerRiskHistory(
      orderData.customerEmail,
      storeId
    );

    let riskScore = 0;
    let riskLevel = "low";
    let riskReasons = [];

    // Check lost parcel threshold
    if (riskHistory.lostOrders >= settings.lostParcelThreshold) {
      riskScore += 40;
      riskReasons.push(
        `Customer has ${riskHistory.lostOrders} lost orders in past ${settings.timePeriodMonths} months`
      );
    }

    // Check loss rate threshold
    if (
      settings.lossRateThreshold &&
      riskHistory.lossRate > settings.lossRateThreshold
    ) {
      riskScore += 30;
      riskReasons.push(
        `Customer loss rate ${riskHistory.lossRate}% exceeds threshold ${settings.lossRateThreshold}%`
      );
    }

    // Check IP risk
    const ipRisk = await assessIpRisk(orderData.customerIp);
    if (ipRisk > 0) {
      riskScore += ipRisk;
      riskReasons.push("Suspicious IP address detected");
    }

    // Determine risk level
    if (riskScore >= 80) riskLevel = "critical";
    else if (riskScore >= 60) riskLevel = "high";
    else if (riskScore >= 40) riskLevel = "medium";
    else riskLevel = "low";

    return {
      riskScore,
      riskLevel,
      riskReasons,
      isFlagged: riskScore >= 40,
    };
  } catch (error) {
    console.error("Risk assessment failed:", error);
    return {
      riskScore: 0,
      riskLevel: "low",
      riskReasons: [],
      isFlagged: false,
    };
  }
};
```

## Phase 8: Testing & Deployment

### 8.1 Test Cases

```typescript
// Test sign-up flow
describe("Sign-up Flow", () => {
  test("should determine correct plan based on order volume", () => {
    expect(determinePlan(150)).toBe("starter");
    expect(determinePlan(1000)).toBe("growth");
    expect(determinePlan(3000)).toBe("pro");
    expect(determinePlan(6000)).toBe("enterprise");
  });

  test("should create store with pending approval status", async () => {
    const storeData = createMockStoreData();
    const result = await createStore(storeData);
    expect(result.status).toBe("pending_approval");
  });
});

// Test risk assessment
describe("Risk Assessment", () => {
  test("should flag orders above risk threshold", async () => {
    const orderData = createMockOrderData();
    const riskResult = await assessOrderRisk(orderData, "store-123");
    expect(riskResult.isFlagged).toBe(true);
  });
});
```

### 8.2 Deployment Checklist

- [ ] Database migrations applied
- [ ] Environment variables configured
- [ ] Email templates created
- [ ] Payment integration tested
- [ ] Risk assessment engine validated
- [ ] Frontend forms updated
- [ ] API endpoints tested
- [ ] Security measures implemented
- [ ] Performance monitoring enabled
- [ ] Backup procedures configured

## Next Steps

1. **Frontend Updates**: Implement all form changes and new pages
2. **Backend APIs**: Create all required endpoints
3. **Integration Testing**: Test complete user flows
4. **Performance Optimization**: Implement caching and optimization
5. **Security Review**: Audit all security measures
6. **Documentation**: Create user and admin documentation
7. **Training**: Train operations team on new system
8. **Go-Live**: Deploy to production environment

## Support & Maintenance

- **Monitoring**: Set up alerts for system health
- **Backups**: Regular database backups
- **Updates**: Regular security and feature updates
- **Support**: 24/7 technical support for critical issues
- **Training**: Ongoing training for new features
