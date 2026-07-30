# KAZIFY Fintech Escrow & Double-Entry Ledger Manual
## Production-Grade Marketplace Escrow & Settlement Engine

This manual details the architecture, ledger design, service layers, API design, event flows, and state diagrams governing the KAZIFY Marketplace Escrow Engine.

---

## 1. Structural State Diagram

Below is the state transitions diagram for an Escrow Account and associated Job Milestones.

```
       [ Job Initiated ] 
               |
               v
        [ status: unpaid ]
               |
               |  (Fund Escrow or fundMilestone)
               v
         [ status: held ] <---------------------------+
               |                                      |
               +-------------+-----------------+      |
               |             |                 |      |
               | (Release)   | (Partial Rel)   | (Dispute)
               v             v                 v      |
       [ status: released ]  |          [ status: disputed ]
                             |                 |      |
                             +-----------------+------+ (Arbitrated Split)
                                               |
                                               v
                                      [ status: refunded ]
```

---

## 2. Double-Entry Accounting Model

KAZIFY implements a mathematical **Double-Entry Ledger System** where assets and liabilities must perfectly balance. Total Debits must equal Total Credits for every financial operation.

### Chart of Ledger Accounts (`ledger_account` Types)
1. `user_wallet`: Represents the user's available in-app funds (Asset for user, Liability for platform).
2. `escrow_held`: Assets secured from the customer, currently locked in legal escrow (Asset held).
3. `escrow_liability`: Matching platform liability representing locked funds.
4. `platform_earnings`: Platform revenues collected via the standard 10% marketplace commission.
5. `payout_clearing`: Temporary transit/disbursement account holding tradesperson funds during dispatch clearing.

### Standard Double-Entry T-Accounts ledger leg examples

#### Transaction A: Funding Escrow (Client Funds Job/Milestone)
*The client locks KES 10,000 for a plumbing project.*
*   **Debit:** `user_wallet` (Customer ID) — KES 10,000 *(Deduction)*
*   **Credit:** `escrow_held` (Escrow Account ID) — KES 10,000 *(Held in Trust)*
*   **Audit status:** Balance sheets balance completely ($10,000 - 10,000 = 0$).

#### Transaction B: Releasing Escrow (Funds released to Fundi)
*Job completed. KES 10,000 is released. 10% platform commission is collected ($10,000 \times 0.10 = 1,000$). Fundi gets KES 9,000.*
*   **Debit:** `escrow_held` (Escrow Account ID) — KES 10,000 *(Sourced from held escrow)*
*   **Credit:** `platform_earnings` — KES 1,000 *(Revenues)*
*   **Credit:** `payout_clearing` (Fundi ID) — KES 9,000 *(Transit clearing)*

#### Transaction C: Discharging Payout (Payout Settled via Safaricom M-Pesa B2C)
*Simulated M-Pesa API response acknowledges B2C settlement success.*
*   **Debit:** `payout_clearing` (Fundi ID) — KES 9,000 *(Discharged)*
*   **Credit:** `user_wallet` (Fundi ID) — KES 9,000 *(Credited to available tradesperson wallet)*

---

## 3. Database Schema Definitions

The KAZIFY active schema contains five interconnected tables backing this architecture.

### 3.1 `escrow_accounts`
Maintains job-level trust balances.
*   `id` UUID (Primary Key)
*   `job_id` UUID (References `jobs.id`)
*   `customer_id` UUID (References `users.id`)
*   `fundi_id` UUID (References `users.id`, optional)
*   `amount` NUMERIC(10, 2)
*   `commission_fee` NUMERIC(10, 2)
*   `payout_amount` NUMERIC(10, 2)
*   `status` VARCHAR(20) (`unpaid`, `held`, `released`, `refunded`, `disputed`)
*   `milestones_enabled` BOOLEAN (Default FALSE)

### 3.2 `escrow_milestones`
Allows micro-releases and phased deliverables.
*   `id` UUID (Primary Key)
*   `escrow_account_id` UUID (References `escrow_accounts.id`)
*   `title` VARCHAR(150)
*   `amount` NUMERIC(10, 2)
*   `commission_fee` NUMERIC(10, 2)
*   `payout_amount` NUMERIC(10, 2)
*   `status` VARCHAR(30) (`pending`, `funded`, `released`, `disputed`, `refunded`)

### 3.3 `ledger_entries`
Immutable double-entry audit logs.
*   `id` UUID (Primary Key)
*   `ledger_group_id` UUID (Ties transaction legs)
*   `escrow_account_id` UUID
*   `milestone_id` UUID
*   `user_id` UUID
*   `amount` NUMERIC(10, 2)
*   `direction` VARCHAR(10) (`debit`, `credit`)
*   `ledger_account` VARCHAR(50) (`user_wallet`, `escrow_held`, `platform_earnings`, `payout_clearing`)
*   `description` TEXT
*   `reference_id` VARCHAR(100)

### 3.4 `settlements`
Acts as the financial ledger record mapping gross to platform fees and net payout.
*   `id` UUID (Primary Key)
*   `escrow_account_id` UUID
*   `milestone_id` UUID
*   `job_id` UUID
*   `fundi_id` UUID
*   `amount_gross` NUMERIC(10, 2)
*   `platform_fee` NUMERIC(10, 2)
*   `amount_net` NUMERIC(10, 2)
*   `status` VARCHAR(30) (`pending`, `settled`, `failed`)

### 3.5 `payouts`
Disbursement references representing downstream Safaricom Daraja B2C transfers.
*   `id` UUID (Primary Key)
*   `settlement_id` UUID (References `settlements.id`)
*   `user_id` UUID (References `users.id`)
*   `amount` NUMERIC(10, 2)
*   `payout_method` VARCHAR(30) (`mpesa`, `bank`)
*   `payout_destination` VARCHAR(100) (Phone number / Bank details)
*   `transaction_reference` VARCHAR(100) (M-Pesa Unique B2C ID)
*   `status` VARCHAR(30) (`pending`, `processing`, `succeeded`, `failed`)

---

## 4. API Documentation

### 4.1 Escrow & Milestones endpoints
#### Fund a Milestone
*   **URL:** `POST /api/escrow/:jobId/milestones`
*   **Body:**
    ```json
    {
      "title": "Kitchen Plumbing Phase 1",
      "amount": 4500,
      "fundiId": "fundi-user-id-001"
    }
    ```
*   **Response:**
    ```json
    {
      "success": true,
      "escrowAccount": { ... },
      "milestone": { "id": "milestone_123", "status": "funded", ... }
    }
    ```

#### Release a Milestone
*   **URL:** `POST /api/escrow/milestones/:milestoneId/release`
*   **Response:**
    ```json
    {
      "success": true,
      "settlement": { "id": "set_990", "amount_net": 4050, "platform_fee": 450 },
      "milestone": { "id": "milestone_123", "status": "released" }
    }
    ```

#### Partial Escrow Release
*   **URL:** `POST /api/escrow/accounts/:escrowAccountId/release-partial`
*   **Body:**
    ```json
    {
      "amount": 3000,
      "description": "Partial payment for materials"
    }
    ```
*   **Response:**
    ```json
    {
      "success": true,
      "settlement": { ... }
    }
    ```

---

## 5. Administrative Arbitration (Custom Split Arbitrations)

In cases of dispute, KAZIFY allows admins to execute custom splits, deciding exactly how much to refund the client vs pay the tradesperson.

#### Arbitrate Dispute Split
*   **URL:** `POST /api/disputes/:id/resolve-arbitrated`
*   **Permissions:** Admin-only (`requireAdmin` middleware enforced)
*   **Body:**
    ```json
    {
      "refundToCustomerAmount": 6000,
      "payoutToFundiAmount": 4000,
      "notes": "Work partially done. Materials retained by customer."
    }
    ```
*   **Execution:**
    *   Locks escrow status as resolved.
    *   Debits KES 10,000 from `escrow_held`.
    *   Credits KES 6,000 into Customer's `user_wallet`.
    *   Credits KES 4,000 into Fundi's payout settlement queue.
    *   Calculates 10% platform fee on Fundi's share (credits platform earnings KES 400, credits payout clearing KES 3,600).

---

## 6. Real-Time Event & Notification Flow

The following sequence highlights the flow of a milestone release:

```
[ Client App ] --(Release Milestone)--> [ Express Server ] --(Ledger Entries Saved)
                                                |
                                                +--> [ Settlement Registered ]
                                                +--> [ Payout Triggered ]
                                                |
                                                +--(WebSocket Broadcast)
                                                |       |
                                                |       +--> "type": "milestone_released"
                                                v
                                         [ notifications table ]
                                                |
                                                +--> Cust: "Milestone Released"
                                                +--> Fundi: "Payment Dispatched!"
```

---

## 7. Mathematical Audit Trails
Admins can perform instant ledger balance audits using:
*   `GET /api/admin/escrow/ledger/audit`
Returns the status, trial balance of all accounts, total debit vs credit sums, and verifies that the discrepancy is exactly **0.00**.
