-- Database Schema for KAZIFY: Skilled Trades Marketplace in Kisumu, Kenya

-- Enable uuid-ossp for UUID generation if preferred, though serial/bigint ID is standard too. We'll use SERIAL or UUID for primary keys.
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone VARCHAR(20) UNIQUE,
    email VARCHAR(100) UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('customer', 'fundi', 'admin')),
    avatar_url VARCHAR(255),
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_email ON users(email);

-- 2. Categories Table
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    icon_name VARCHAR(50)
);

-- 3. Skills Table
CREATE TABLE IF NOT EXISTS skills (
    id SERIAL PRIMARY KEY,
    category_id INTEGER REFERENCES categories(id) ON DELETE CASCADE,
    name VARCHAR(50) UNIQUE NOT NULL
);

-- 4. Customers Table (Profile expansion)
CREATE TABLE IF NOT EXISTS customers (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    default_address TEXT,
    preferred_payment_method VARCHAR(20) DEFAULT 'mpesa',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Fundis Table (Tradesperson Profile expansion)
CREATE TABLE IF NOT EXISTS fundis (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    bio TEXT,
    experience_years INT DEFAULT 0,
    hourly_rate_estimate NUMERIC(10, 2) DEFAULT 0.00,
    status VARCHAR(20) DEFAULT 'available' CHECK (status IN ('available', 'busy', 'offline')),
    current_lat NUMERIC(9, 6),
    current_lng NUMERIC(9, 6),
    average_rating NUMERIC(3, 2) DEFAULT 5.00,
    jobs_completed_count INT DEFAULT 0
);

CREATE INDEX idx_fundis_category ON fundis(category_id);
CREATE INDEX idx_fundis_status ON fundis(status);

-- 6. Jobs Table (Matches on-demand service request)
CREATE TABLE IF NOT EXISTS jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    fundi_id UUID REFERENCES users(id) ON DELETE SET NULL,
    category_id INTEGER REFERENCES categories(id) ON DELETE RESTRICT,
    title VARCHAR(150) NOT NULL,
    description TEXT NOT NULL,
    workflow VARCHAR(20) NOT NULL CHECK (workflow IN ('instant', 'quotation')),
    status VARCHAR(30) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'matching', 'accepted', 'en_route', 'started', 'completed', 'cancelled', 'disputed')),
    lat NUMERIC(9, 6) NOT NULL,
    lng NUMERIC(9, 6) NOT NULL,
    address TEXT NOT NULL,
    contracted_amount NUMERIC(10, 2),
    estimated_duration VARCHAR(50),
    escrow_status VARCHAR(20) DEFAULT 'unpaid' CHECK (escrow_status IN ('unpaid', 'held', 'released', 'refunded')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_customer ON jobs(customer_id);
CREATE INDEX idx_jobs_fundi ON jobs(fundi_id);

-- 7. Job Requests Table (Mainly for Uber-style dispatch matching logs)
CREATE TABLE IF NOT EXISTS job_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    fundi_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'sent' CHECK (status IN ('sent', 'accepted', 'rejected', 'expired')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Quotes Table (Bids Submitted Upwork-style)
CREATE TABLE IF NOT EXISTS quotes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    fundi_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    bid_amount NUMERIC(10, 2) NOT NULL,
    note TEXT,
    estimated_days INT DEFAULT 1,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_quotes_job ON quotes(job_id);

-- 9. Payments Table (M-Pesa transaction reference logs)
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES jobs(id),
    amount NUMERIC(10, 2) NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    checkout_request_id VARCHAR(100) UNIQUE,
    merchant_request_id VARCHAR(100),
    mpesa_receipt_number VARCHAR(50) UNIQUE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. Escrow Transactions Table
CREATE TABLE IF NOT EXISTS escrow_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    amount NUMERIC(10, 2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'held' CHECK (status IN ('held', 'released', 'refund_requested', 'refunded')),
    released_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 11. Ratings Table
CREATE TABLE IF NOT EXISTS ratings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL UNIQUE REFERENCES jobs(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES users(id),
    fundi_id UUID REFERENCES users(id),
    rating_value INT NOT NULL CHECK (rating_value BETWEEN 1 AND 5),
    review_text TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 12. Chat Messages
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_chat_job ON chat_messages(job_id);

-- 13. Verification Documents (Trade certifications/IDs for safety)
CREATE TABLE IF NOT EXISTS verification_docs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fundi_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    document_type VARCHAR(50) NOT NULL, -- e.g. National ID, NITA Trade Cert
    document_url VARCHAR(255) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 14. Disputes Table
CREATE TABLE IF NOT EXISTS disputes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    raised_by UUID NOT NULL REFERENCES users(id),
    reason TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'escalated')),
    resolution_details TEXT,
    resolved_by UUID REFERENCES users(id),
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 15. Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(150) NOT NULL,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notifications_user ON notifications(user_id);

-- 16. Escrow Accounts Table
CREATE TABLE IF NOT EXISTS escrow_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    fundi_id UUID REFERENCES users(id) ON DELETE SET NULL,
    amount NUMERIC(10, 2) NOT NULL,
    commission_fee NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    payout_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(20) NOT NULL DEFAULT 'unpaid' CHECK (status IN ('unpaid', 'held', 'released', 'refunded', 'disputed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_escrow_accounts_job ON escrow_accounts(job_id);

-- 17. Wallets Table
CREATE TABLE IF NOT EXISTS wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    balance NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    currency VARCHAR(10) DEFAULT 'KES',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 18. Wallet Transactions Table
CREATE TABLE IF NOT EXISTS wallet_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount NUMERIC(10, 2) NOT NULL,
    type VARCHAR(30) NOT NULL CHECK (type IN ('deposit', 'withdrawal', 'escrow_hold', 'escrow_release', 'commission', 'refund')),
    description TEXT NOT NULL,
    reference_id VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_wallet_transactions_user ON wallet_transactions(user_id);


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


-- 22. Escrow Milestones Table
CREATE TABLE IF NOT EXISTS escrow_milestones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    escrow_account_id UUID NOT NULL REFERENCES escrow_accounts(id) ON DELETE CASCADE,
    title VARCHAR(150) NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    commission_fee NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    payout_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(30) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'funded', 'released', 'disputed', 'refunded')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_escrow_milestones_account ON escrow_milestones(escrow_account_id);

-- 23. Double-Entry Ledger Entries Table
CREATE TABLE IF NOT EXISTS ledger_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ledger_group_id UUID NOT NULL, -- Ties the debit and credit rows together representing a single transaction
    escrow_account_id UUID REFERENCES escrow_accounts(id) ON DELETE SET NULL,
    milestone_id UUID REFERENCES escrow_milestones(id) ON DELETE SET NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    amount NUMERIC(10, 2) NOT NULL, -- Positive for debit, negative for credit (or vice versa, balanced to zero per group)
    direction VARCHAR(10) NOT NULL CHECK (direction IN ('debit', 'credit')),
    ledger_account VARCHAR(50) NOT NULL CHECK (ledger_account IN ('user_wallet', 'escrow_liability', 'escrow_held', 'platform_earnings', 'payout_clearing')),
    description TEXT NOT NULL,
    reference_id VARCHAR(100), -- Associated job_id, dispute_id, checkout_id, etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ledger_entries_group ON ledger_entries(ledger_group_id);
CREATE INDEX idx_ledger_entries_account ON ledger_entries(ledger_account);
CREATE INDEX idx_ledger_entries_user ON ledger_entries(user_id);

-- 24. Settlements Table
CREATE TABLE IF NOT EXISTS settlements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    escrow_account_id UUID NOT NULL REFERENCES escrow_accounts(id) ON DELETE CASCADE,
    milestone_id UUID REFERENCES escrow_milestones(id) ON DELETE SET NULL,
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    fundi_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount_gross NUMERIC(10, 2) NOT NULL,
    platform_fee NUMERIC(10, 2) NOT NULL,
    amount_net NUMERIC(10, 2) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'settled', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_settlements_account ON settlements(escrow_account_id);

-- 25. Payouts Table
CREATE TABLE IF NOT EXISTS payouts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    settlement_id UUID NOT NULL REFERENCES settlements(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount NUMERIC(10, 2) NOT NULL,
    payout_method VARCHAR(30) NOT NULL DEFAULT 'mpesa' CHECK (payout_method IN ('mpesa', 'bank')),
    payout_destination VARCHAR(100) NOT NULL, -- Phone number or bank account number
    transaction_reference VARCHAR(100) UNIQUE, -- M-Pesa B2C Transaction ID
    status VARCHAR(30) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'succeeded', 'failed')),
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_payouts_settlement ON payouts(settlement_id);
CREATE INDEX idx_payouts_status ON payouts(status);


-- 26. Notification Preferences Table
CREATE TABLE IF NOT EXISTS notification_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    enable_websocket BOOLEAN DEFAULT TRUE,
    enable_push BOOLEAN DEFAULT TRUE,
    enable_email BOOLEAN DEFAULT TRUE,
    enable_sms BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notif_pref_user ON notification_preferences(user_id);

-- 27. Push Subscriptions Table (Web Push Subscriptions)
CREATE TABLE IF NOT EXISTS push_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL,
    p256dh VARCHAR(255) NOT NULL,
    auth VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_push_subs_user ON push_subscriptions(user_id);




