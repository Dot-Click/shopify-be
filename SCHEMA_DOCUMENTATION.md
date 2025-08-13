# eComProtect Database Schema Documentation

## Overview

This document describes the comprehensive database schema for the eComProtect system, designed to handle fraud prevention, risk management, and store management for e-commerce businesses.

## Schema Tables

### 1. Core Business Entities

#### `stores` Table

**Purpose**: Stores company/store information and subscription details
**Key Fields**:

- `companyName`: Company name (required)
- `companyRegistrationNumber`: Company registration number (required)
- `storeUrl`: Store URL for Shopify integration
- `averageOrdersPerMonth`: Used to determine plan (Starter: 0-300, Growth: 301-2000, Pro: 2001-5000, Enterprise: 5001+)
- `plan`: Subscription plan (starter, growth, pro, enterprise)
- `package`: Selected package (ecp_insight, ecp_vision, ecp_shield)
- `status`: Store status (pending_approval, active, suspended, disabled)
- `shopifyApiKey/Secret`: For Shopify integration
- `isActive`: Whether store is active in the system

**PDF Mapping**: Covers sign-up requirements, plan determination, and store management

#### `users` Table

**Purpose**: User accounts for both store staff and ECP employees
**Key Fields**:

- `firstName`, `surname`: User's full name
- `email`: Unique email address
- `mobilePhone`: For MFA authentication
- `role`: User role (customer_admin, sub_user, ecp_admin, ecp_operations, ecp_account_manager)
- `storeId`: Links user to specific store
- `mfaEnabled`: MFA status for security

**PDF Mapping**: Covers user management, customer admin accounts, and sub-users

### 2. Risk Detection & Management

#### `storeSettings` Table

**Purpose**: Configurable risk detection settings per store
**Key Fields**:

- `lostParcelThreshold`: Number of lost orders to trigger alert (1-10)
- `lossRateThreshold`: Percentage threshold for loss rate
- `timePeriodMonths`: Time window for risk assessment (1, 3, 6, 12 months)
- `matchSensitivity`: Fuzzy matching level (low, medium, high)
- `actionType`: What happens on risky order detection (fulfillment_hold, auto_cancel, notify_only)
- `requireCustomerSignature`, `forceSignedDelivery`, `requirePhotoOnDelivery`: Delivery requirements
- `emailNotificationsEnabled`: Notification settings

**PDF Mapping**: Covers all risk detection settings from the Settings page

#### `customerExclusions` Table

**Purpose**: Trusted customers/addresses that should never be flagged
**Key Fields**:

- `customerEmail`, `customerAddress`, `customerPhone`: Exclusion criteria
- `reason`: Why this customer is trusted
- `isActive`: Whether exclusion is currently active

**PDF Mapping**: Covers exclusion list functionality

#### `orders` Table

**Purpose**: Order tracking and risk assessment
**Key Fields**:

- `shopifyOrderId`: Shopify integration reference
- `customerEmail`, `customerAddress`, `customerPhone`: Customer details
- `customerIp`: IP address for risk assessment
- `orderValue`: Order monetary value
- `riskLevel`, `riskScore`: Risk assessment results
- `isFlagged`: Whether order was flagged as risky
- `status`: Order processing status
- `actionTaken`: What action was taken on flagged orders

**PDF Mapping**: Covers order management, risk assessment, and flagging

#### `customerRiskHistory` Table

**Purpose**: Historical risk data for customers across all stores
**Key Fields**:

- `totalOrders`, `flaggedOrders`, `lostOrders`: Order statistics
- `lossRate`: Calculated loss percentage
- `riskLevel`: Current risk assessment
- `lastFlaggedAt`: Last time customer was flagged

**PDF Mapping**: Covers customer database growth and risk trends

### 3. Subscription & Billing

#### `packageSubscriptions` Table

**Purpose**: Package subscription management and GoCardless integration
**Key Fields**:

- `package`: Selected package (insight, vision, shield)
- `plan`: Subscription plan
- `goCardlessMandateId`, `goCardlessSubscriptionId`: Payment integration
- `monthlyPrice`: Subscription cost
- `nextBillingDate`: Billing cycle
- `status`: Subscription status

**PDF Mapping**: Covers package selection and payment flow

### 4. Application Management

#### `applicationReviews` Table

**Purpose**: ECP operations team review process
**Key Fields**:

- `status`: Review status (pending, approved, rejected)
- `reviewedBy`: ECP staff member who reviewed
- `dueDiligenceCompleted`: Due diligence status
- `billingSetupCompleted`: Billing setup status

**PDF Mapping**: Covers post-signup approval workflow

### 5. System Operations

#### `emailNotifications` Table

**Purpose**: Email notification tracking
**Key Fields**:

- `recipientType`: Who receives notification (ops_team, account_manager, store_admin)
- `subject`, `content`: Email details
- `status`: Delivery status

**PDF Mapping**: Covers notification system for operations team

#### `auditLog` Table

**Purpose**: Complete audit trail of all system actions
**Key Fields**:

- `action`: What action was performed
- `entityType`, `entityId`: What was affected
- `oldValues`, `newValues`: Change tracking
- `ipAddress`, `userAgent`: Security tracking

**PDF Mapping**: Covers system monitoring and compliance

#### `reportCache` Table

**Purpose**: Performance optimization for reports
**Key Fields**:

- `reportType`: Type of report cached
- `parameters`: Report parameters
- `result`: Cached report data
- `expiresAt`: Cache expiration

**PDF Mapping**: Covers reporting performance optimization

## Key Features Implemented

### 1. Sign-Up Flow

- **Plan Determination**: Automatic plan assignment based on monthly order volume
- **Package Selection**: Insight, Vision, Shield packages
- **Payment Integration**: GoCardless direct debit setup
- **Approval Workflow**: Manual review for all new stores

### 2. Risk Detection

- **Configurable Thresholds**: Lost parcel count, loss rate percentage
- **Fuzzy Matching**: Low/Medium/High sensitivity levels
- **Action Automation**: Fulfillment hold, auto-cancellation, notifications
- **Customer Exclusions**: Trusted customer management

### 3. Store Management

- **Shopify Integration**: API key management, webhook setup
- **User Hierarchy**: Admin accounts with sub-user management
- **Status Management**: Active, suspended, disabled states
- **Billing Integration**: Subscription management

### 4. Reporting & Analytics

- **Store Reports**: Risk reduction, suspicious orders, loss prevention
- **Admin Reports**: Database growth, store activity, network trends
- **Performance Optimization**: Report caching for scalability

### 5. Security & Compliance

- **MFA Ready**: Mobile phone storage for future authentication
- **Audit Logging**: Complete action tracking
- **Role-Based Access**: Different permission levels
- **Data Protection**: Secure customer data handling

## Database Relationships

```
stores (1) ←→ (many) users
stores (1) ←→ (1) storeSettings
stores (1) ←→ (many) orders
stores (1) ←→ (many) customerRiskHistory
stores (1) ←→ (1) packageSubscriptions
stores (1) ←→ (1) applicationReviews
stores (1) ←→ (many) customerExclusions
stores (1) ←→ (many) apiUsage

users (1) ←→ (many) orders (flaggedBy, actionTakenBy)
users (1) ←→ (many) auditLog
users (1) ←→ (many) mfaTokens
```

## Migration Notes

1. **Existing Tables**: The schema extends existing `users`, `session`, `account`, `verification`, and `throttleinsight` tables
2. **New Tables**: All other tables are new and support the eComProtect functionality
3. **Foreign Keys**: Proper referential integrity with cascade deletes where appropriate
4. **Indexing**: Consider adding indexes on frequently queried fields like `customerEmail`, `storeId`, and `createdAt`

## Environment Variables Required

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/ecomprotect

# GoCardless
GOCARDLESS_ACCESS_TOKEN=your_token
GOCARDLESS_ENVIRONMENT=sandbox_or_live

# Email (Brevo)
BREVO_API_KEY=your_key
BREVO_SENDER_EMAIL=noreply@ecomprotect.com

# Operations Team Emails
ECP_OPS_EMAIL=ops@ecomprotect.com
ECP_ACCOUNT_MANAGER_EMAIL=am@ecomprotect.com
```

## Next Steps

1. **Generate Migration**: Run `npm run dbgenerate` to create Drizzle migrations
2. **Apply Migration**: Run `npm run dbpush` to apply to database
3. **Seed Data**: Create initial data for plans, packages, and admin users
4. **API Development**: Implement REST endpoints for all CRUD operations
5. **Frontend Integration**: Connect frontend forms to new schema
6. **Testing**: Comprehensive testing of all workflows and edge cases
