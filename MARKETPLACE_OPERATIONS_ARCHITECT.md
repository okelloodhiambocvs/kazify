# Kazify: Production-Grade Admin Control Center Architecture
**Author:** Lead Marketplace Operations Architect  
**Project:** Kazify On-Demand Service Marketplace  
**Scope:** Admin Operations, Compliance, Trust & Safety, and Financial Integrity  

---

## 1. Dashboard & Core Architecture

The Kazify Admin Control Center is engineered as a secure, high-throughput administrative console operating on top of a highly available NestJS backend. It provides operational visibility, compliance tooling, and financial auditing while strictly segregating administrative functions from customer and expert domains.

```
+-----------------------------------------------------------------------------------+
|                              Global Tower Control Center                          |
+-----------------------------------------------------------------------------------+
| [ Overview Metrics ]  [ Users ]  [ KYC Doc Review ]  [ Disputes ]  [ Escrow Ledger ] |
+-----------------------------------------------------------------------------------+
|                                                                                   |
|  +-------------------------+  +------------------------------------------------+  |
|  |     Operations List     |  |              Granular Inspector                |  |
|  |                         |  |                                                |  |
|  |  [Active Disputes List] |  |  Dispute ID: dsp_992211                         |  |
|  |  - Job #882: Tiling     |  |  Customer: John Doe (Refund requested)         |  |
|  |  - Job #104: Plumbing   |  |  Fundi: Alex Ke (Claims job complete)          |  |
|  |                         |  |  --------------------------------------------  |  |
|  |  [KYC Pending Queue]    |  |  [Chat Log History]                            |  |
|  |  - Mary W. (ID Card)    |  |  - Customer: "The tile is totally cracked."     |  |
|  |  - David O. (Passport)  |  |  - Fundi: "I was locked out of the compound."  |  |
|  |                         |  |  --------------------------------------------  |  |
|  |  [Fraud Alerts Queue]   |  |  [Arbitration Controls]                        |  |
|  |  - High Velocity Tx     |  |  ( ) Release to Fundi   ( ) Refund Customer    |  |
|  |  - Geo-Mismatch IP      |  |  [ Submit Binding Arbitration Resolution     ] |  |
|  +-------------------------+  +------------------------------------------------+  |
+-----------------------------------------------------------------------------------+
```

### 1.1 UI Architectural Patterns (Micro-Frontend Widgets)
The control panel is designed around standard **isolated widgets** styled with standard high-contrast Tailwind components:
- **Asynchronous Data Feeds**: Each module operates with an independent React Context or SWR/React Query boundary, preventing long-running ledger audits from blocking quick user list searches.
- **WebSocket Synchronization**: Employs Socket.io channels (`/admin/ws`) allowing live telemetry feeds (real-time transaction counters, escrow account additions, and high-severity fraud alerts) to stream directly to active operators.
- **Dual-Pane Workspaces**: Organizes both Disputes and KYC modules into a master-detail layout where selecting an active item loads all telemetry, chats, and documents instantly on the right.

---

## 2. Granular Permissions & Role-Based Access Control (RBAC)

To protect financial records and private PII data, we enforce a strict administrative hierarchy. General support staff must never have access to fund settlement functions, and compliance reviewers are limited strictly to document verification.

### 2.1 Admin Role Matrix

| Administrative Role | Key Responsibilities | Database Permissions | Restricted Areas |
| :--- | :--- | :--- | :--- |
| **Super Admin** | Full root platform controller, system configuration, policy changes | `ALL PRIVILEGES` | None |
| **Financial Auditor** | Escrow settlement reviews, manual wallet balance corrections, reconciliation | `SELECT`, `UPDATE` (Wallets, Escrow, Transactions) | Cannot edit users or resolve disputes |
| **Dispute Arbitrator** | Neutral resolution of disputed jobs, fund release, contract investigations | `SELECT`, `UPDATE` (Disputes, Contracts, Escrow) | Cannot view user KYC documents or edit profiles |
| **Compliance Officer** | KYC validation, account status overrides, user reporting | `SELECT`, `UPDATE` (KYC, Users) | Cannot access financial transactions or arbitrate |
| **Support Agent** | general inquiries, password reset dispatch, ticket assignment | `SELECT` (Users, Jobs, Disputes) | Read-only across all core financial states |

### 2.2 Token-Level Claims Layout
Administrators authenticate via standard stateless JSON Web Tokens (JWT) containing cryptographically signed roles and explicit operation claims:
```json
{
  "sub": "usr_998811",
  "name": "Sarah Jenkins",
  "email": "sarah.compliance@kazify.com",
  "role": "compliance_officer",
  "permissions": [
    "kyc:read",
    "kyc:write",
    "users:read",
    "users:suspend"
  ],
  "iat": 1782348000,
  "exp": 1782351600
}
```

---

## 3. Database Schema Changes & Indexes

To transition from a developer database to a high-concurrency production system, we introduce strict audit tables, dispute records, and ledger tracking tables with transactional constraints.

```
                          +-------------------------+
                          |      admin_users        |
                          +-------------------------+
                          | id (PK)                 |
                          | email                   |
                          | role                    |
                          +------------+------------+
                                       |
                                       | (Performs Actions)
                                       |
                          +------------v------------+
                          |    admin_audit_logs     |
                          +-------------------------+
                          | id (PK)                 |
                          | admin_id (FK)           |
                          | action                  |
                          | target_id               |
                          | payload (JSONB)         |
                          | created_at              |
                          +-------------------------+
```

### 3.1 Audit & Compliance Tables

```sql
-- Track every administrative touchpoint for legal compliance and accountability
CREATE TABLE admin_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL REFERENCES users(id),
    action_type VARCHAR(100) NOT NULL, -- 'KYC_APPROVE', 'WALLET_ADJUST', 'DISPUTE_RESOLVED'
    target_table VARCHAR(100) NOT NULL, -- 'users', 'wallets', 'disputes'
    target_id VARCHAR(100) NOT NULL,
    old_state JSONB,
    new_state JSONB NOT NULL,
    reason TEXT,
    ip_address VARCHAR(45) NOT NULL,
    user_agent TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Optimize audit log lookup speeds by target entity or admin operator
CREATE INDEX idx_audit_target ON admin_audit_logs(target_table, target_id);
CREATE INDEX idx_audit_admin_created ON admin_audit_logs(admin_id, created_at DESC);
```

### 3.2 Real-time Fraud Detection Ledger

```sql
-- Store algorithmic risk factors for transactions and user behaviors
CREATE TABLE fraud_detections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    trigger_type VARCHAR(100) NOT NULL, -- 'HIGH_VELOCITY_TX', 'IP_COUNTRY_MISMATCH'
    score NUMERIC(5, 2) NOT NULL, -- 0.00 to 100.00 (risk level)
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'dismissed', 'confirmed_fraud'
    evidence JSONB NOT NULL, -- payload details
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMP WITHOUT TIME ZONE,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_fraud_status_score ON fraud_detections(status, score DESC);
```

---

## 4. Administrative Backend APIs (REST / WebSockets)

All administrative endpoints are isolated behind a strict global `/api/admin/*` prefix. Every route is protected by a multi-layered middleware validation stack verifying active sessions, valid claims, and input validation.

### 4.1 REST API Controller Routes (NestJS Specification)

```typescript
import { Controller, Get, Post, Body, Param, UseGuards, Req } from '@nestjs/common';
import { AdminAuthGuard, RolesGuard } from './guards/admin-auth.guard';
import { Permissions } from './decorators/permissions.decorator';

@Controller('api/admin')
@UseGuards(AdminAuthGuard, RolesGuard)
export class AdminController {

  // ==========================================================================
  // 1. User Management & KYC Approvals
  // ==========================================================================
  @Get('users')
  @Permissions('users:read')
  async getAllUsers(@Req() req) {
    return await this.adminService.fetchUsersList();
  }

  @Post('users/:id/status')
  @Permissions('users:suspend')
  async updateUserStatus(
    @Param('id') id: string, 
    @Body() dto: { status: 'active' | 'suspended' | 'banned', reason: string },
    @Req() req
  ) {
    return await this.adminService.updateUserStatus(id, dto, req.user, req.ip);
  }

  @Post('kyc/:id/resolve')
  @Permissions('kyc:write')
  async resolveKyc(
    @Param('id') id: string,
    @Body() dto: { action: 'approve' | 'reject', reason?: string },
    @Req() req
  ) {
    return await this.adminService.resolveKycDocument(id, dto, req.user, req.ip);
  }

  // ==========================================================================
  // 2. Financial & Escrow Monitoring
  // ==========================================================================
  @Get('escrow/ledger')
  @Permissions('financial:read')
  async getEscrowLedger() {
    return await this.adminService.getEscrowLedgerEntries();
  }

  @Post('wallets/override')
  @Permissions('financial:write')
  async manualWalletOverride(
    @Body() dto: { target_user_id: string, action: 'credit' | 'debit', amount: number, reason: string },
    @Req() req
  ) {
    return await this.adminService.executeWalletOverride(dto, req.user, req.ip);
  }

  // ==========================================================================
  // 3. Dispute Resolution & Arbitration
  // ==========================================================================
  @Post('disputes/:id/resolve')
  @Permissions('disputes:write')
  async resolveDispute(
    @Param('id') id: string,
    @Body() dto: { action: 'resolved_released' | 'resolved_refunded', summary: string },
    @Req() req
  ) {
    return await this.adminService.resolveDispute(id, dto, req.user, req.ip);
  }
}
```

---

## 5. Proactive Compliance & Monitoring Architecture

To secure platform funds and prevent chargebacks, we establish active, self-healing monitoring systems.

### 5.1 Real-time Escrow Integrity Checker
Every 60 minutes, an automated serverless cron function inspects total escrow records against active contract milestone states to detect and freeze anomalous balances:

```typescript
async function verifyEscrowConsistencies() {
  const activeEscrowAccounts = await db.query('SELECT * FROM escrow_accounts WHERE status = "held"');
  for (const account of activeEscrowAccounts) {
    const totalMilestones = await db.query('SELECT SUM(amount) FROM milestones WHERE job_id = ?', [account.job_id]);
    const actualWalletBalance = await db.query('SELECT balance FROM wallets WHERE id = ?', [account.wallet_id]);

    if (totalMilestones !== actualWalletBalance) {
      // Trigger instant safety freeze and page administrative security teams
      await db.query('UPDATE wallets SET status = "frozen" WHERE id = ?', [account.wallet_id]);
      logger.critical('[ESCROW DISCREPANCY] Frozen account due to milestone variance!', {
        wallet_id: account.wallet_id,
        milestones: totalMilestones,
        actual: actualWalletBalance
      });
    }
  }
}
```

### 5.2 Algorithmic Fraud Engine
Runs asynchronously on every transaction dispatch via BullMQ:
- **Velocity Check**: Marks accounts moving funds > 5 times in 60 seconds.
- **Geo-Fence Validation**: Scores transactions if the IP initiating a wallet withdrawal lies in a country other than the KYC identity of the user.
- **Automated Suspension**: Instantly moves high-risk transactions (> 85 risk score) into an administrative hold queue, notifying dispute arbitrators instantly.
