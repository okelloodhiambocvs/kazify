# Safaricom Daraja M-Pesa Integration & Migration Strategy
## KAZIFY Skilled Trades Marketplace

This document outlines the architecture, data models, security frameworks, and migration strategy implemented to transition KAZIFY from a simulated payment environment to a production-grade Safaricom Daraja Lipa Na M-Pesa STK Push (Express) integration.

---

## 1. Architectural Overview

The production-grade M-Pesa Daraja integration establishes a secure full-stack ledger flow. It separates payments into three distinct lifecycle phases represented by three newly generated tables:

1. **Intention Phase (`payment_intents`)**: Captures the customer's intent to pay before prompting the phone. Guards against double execution.
2. **Settlement Phase (`transactions`)**: Logs the confirmed success/failure event received directly from Safaricom's webhook.
3. **Audit Phase (`reconciliation`)**: A double-entry auditing ledger comparing expected intent values against actual received amounts, immediately flagging any exceptions or discrepancies.

### STK Push / Escrow Payment Lifecycle Flow
```
[Client App] --> (POST /api/mpesa/stkpush) --> [KAZIFY Express Server]
                                                    |
                                                    |-- Checks Idempotency Key
                                                    |-- Creates `payment_intents` (status: pending)
                                                    |-- Requests Safaricom OAuth2 token
                                                    v
[Client App] <-- [Return CheckoutRequestID] <-- [Safaricom API Gateway]
     |                                              |
     | (Customer enters PIN on handset)            | (Asynchronous Callback)
     v                                              v
[KAZIFY Websocket] <--- [WS Notification] <--- (POST /api/mpesa/callback)
     |                       |                      |
[Unlocks Work]        [Sets Job: "held"]       [Verify callback secret]
                                                    |-- Update intent status (success)
                                                    |-- Insert `transactions` record
                                                    |-- Run ledger reconciliation
```

---

## 2. Database Schema (PostgreSQL DDL)

The following tables have been successfully added to the active schema definition file (`/db/schema.sql`):

```sql
-- 19. Payment Intents Table (Daraja STK Push intents and tracking)
CREATE TABLE IF NOT EXISTS payment_intents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount NUMERIC(10, 2) NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed', 'cancelled', 'expired')),
    checkout_request_id VARCHAR(100) UNIQUE NOT NULL,
    merchant_request_id VARCHAR(100) NOT NULL,
    idempotency_key VARCHAR(100) UNIQUE,
    retry_count INT DEFAULT 0,
    last_error TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_payment_intents_checkout ON payment_intents(checkout_request_id);
CREATE INDEX idx_payment_intents_job ON payment_intents(job_id);

-- 20. Transactions Table (Settled and verified payment events)
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_intent_id UUID REFERENCES payment_intents(id) ON DELETE SET NULL,
    job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
    amount NUMERIC(10, 2) NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    mpesa_receipt_number VARCHAR(50) UNIQUE NOT NULL,
    transaction_date TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('completed', 'failed')),
    raw_callback_payload JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_transactions_receipt ON transactions(mpesa_receipt_number);
CREATE INDEX idx_transactions_intent ON transactions(payment_intent_id);

-- 21. Reconciliation Table (Audit trail matching ledger values)
CREATE TABLE IF NOT EXISTS reconciliation (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
    payment_intent_id UUID REFERENCES payment_intents(id) ON DELETE SET NULL,
    mpesa_receipt_number VARCHAR(50),
    amount_expected NUMERIC(10, 2) NOT NULL,
    amount_received NUMERIC(10, 2) NOT NULL,
    reconciliation_status VARCHAR(30) NOT NULL CHECK (reconciliation_status IN ('matched', 'mismatch_amount', 'mismatch_phone', 'not_found_in_daraja', 'unreconciled')),
    verified_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_reconciliation_status ON reconciliation(reconciliation_status);
```

---

## 3. Production Features Implemented

### 3.1 Webhook Security
Safaricom webhooks are natively unprotected by visual signatures. We enforce multi-layer security validation:
1. **Cryptographic URL Token Parameter Verification**: The configured callback endpoint relies on a secure secret token parsed dynamically: `/api/mpesa/callback?secret=SECURE_WEBHOOK_SECRET`. Calls without this query token are rejected immediately.
2. **Intent Lookup Integrity**: Incoming `CheckoutRequestID` strings must correspond to an active, `pending` intent in our database. Webhook payloads pointing to non-existent intents are rejected and logged immediately inside the audit trailing engine.

### 3.2 Idempotency
Double-tap prevention is strictly managed at `/api/mpesa/stkpush`.
- Client applications send an optional `idempotencyKey` parameter.
- The server checks if there is any pending intent matching either the `idempotencyKey` or the active `job_id` + `phone_number` within the lock window.
- If a match is found, the server bypasses Safaricom API triggers and immediately returns the existing transaction information, preventing duplicate charge prompts.

### 3.3 Dynamic Status Sync & Retry Daemon
To counter rare occurrences where Safaricom webhooks are lost or delayed:
- A secure synchronization background process is provided at `POST /api/admin/mpesa/sync`.
- This process identifies payment intents that have remained `pending` for over 15 minutes.
- It leverages the Daraja Lipa Na M-Pesa Online Query API (`/mpesa/stkpushquery/v1/query`) to reconcile statuses directly with Safaricom.
- Retries and increments error counters gracefully.

### 3.4 Automated & Manual Reconciliation Engine
- When a payment clears, the reconciliation engine compares the expected value in `payment_intents` against the received amount in the callback metadata.
- If they match perfectly, it labels the audit log as `matched`.
- If a mismatch in amount occurs, it registers a `mismatch_amount` record and flags an administrative alert.
- If a customer used a different phone line than registered, it tags it as `mismatch_phone` while clearing the ledger, ensuring proper auditable trail.

---

## 4. Migration Strategy Checklist

To transition this codebase to production environments safely, execute the following steps:

### Phase 1: Environment Variables Setup
Declare the production environment credentials inside your container hosting (e.g., Cloud Run environment variables) or inside `.env`:
```env
MPESA_ENV="production"
MPESA_CONSUMER_KEY="<Your_Safaricom_Production_Key>"
MPESA_CONSUMER_SECRET="<Your_Safaricom_Production_Secret>"
MPESA_SHORTCODE="<Your_Paybill_Or_Till_Number>"
MPESA_PASSKEY="<Your_Production_LNM_Passkey>"
MPESA_CALLBACK_URL="https://yourdomain.com/api/mpesa/callback?secret=kazify_webhook_secure_token_abc123"
MPESA_WEBHOOK_SECRET="kazify_webhook_secure_token_abc123"
```

### Phase 2: Database Migration
Deploy the new SQL tables to your PostgreSQL instances using the migration scripts:
```bash
psql -h <db_host> -U <user> -d kazify -f db/schema.sql
```

### Phase 3: Live Verification
1. Initiate a test transaction through the payment screen.
2. Monitor server logs to verify:
   - Dynamic Safaricom OAuth2 token generation.
   - Proper extraction of `CheckoutRequestID`.
   - Webhook callback ingestion and signature verification.
   - Auto-updating escrow status and customer notification alerts.
