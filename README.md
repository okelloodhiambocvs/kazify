# Kazify - Kenya's Premier On-Demand Trades Hub

An escrow-backed, on-demand marketplace for trusted local trade professionals (Fundis) in Kenya. Built on Express, React, Vite, WebSockets, and double-entry escrow accounting.

---

> [!WARNING]
> **PRODUCTION SECURITY MANDATE:**
> 1. The default accounts listed below are for **DEMO AND SANDBOX TESTING ONLY**.
> 2. In any production environment, default seed accounts MUST have their passwords rotated immediately upon first login or disabled.
> 3. High-entropy cryptographic secrets (`JWT_SECRET`, `JWT_REFRESH_SECRET` >= 32 characters) MUST be provided via secure container environment variables.

## Sandbox Demo Seed Accounts (Testing Only)

The following pre-configured sandbox credentials are available for initial local testing:

### 1. Customer Sandbox Account
* **Phone Number:** `+254700000001`
* **Email:** `customer@kazify.com`
* **Password:** `Customer@123` *(Demo password - force change on production deployment)*
* **Role:** Customer (Post Jobs, Hire & Fund Escrows)

### 2. Trade Professional (Fundi) Sandbox Account
* **Phone Number:** `+254700000002`
* **Email:** `fundi@kazify.com`
* **Password:** `Fundi@123` *(Demo password - force change on production deployment)*
* **Role:** Fundi / Plumber (Submit Bids, Complete Milestones, Manage Wallet)

### 3. Administrator Console Sandbox Account
* **Email:** `admin@kazify.com`
* **Phone Number:** `+254700000000`
* **Password:** `Admin@12345` *(Demo password - force change on production deployment)*
* **Role:** Admin (Allocate Fundis, Review KYC Documents, Manage Escrows & Dispute Resolution)

---

## Dual Data Store Architecture

Kazify supports dynamic dual-mode storage:

1. **In-Memory Store (Development & Sandbox Fallback)**
   - Active when `DB_HOST` is unset or `USE_IN_MEMORY=true`.
   - Pre-populated with sandbox seed users, active jobs, wallets, and escrow accounts.
   - Ideal for single-process sandbox testing and rapid UI development.

2. **PostgreSQL Database Store (Production Engine)**
   - Active when `DB_HOST` is specified and a valid PostgreSQL server is reachable.
   - Stores users, jobs, wallets, escrow accounts, settlements, payouts, refresh tokens, and audit logs persistently.
   - Supports DB-backed admin operations, KYC reviews, user bans, and audit log persistence.

Query `GET /api/health` at any time to inspect runtime storage status:
```json
{
  "status": "ok",
  "timestamp": "2026-07-30T03:45:00.000Z",
  "authStore": "postgres",
  "dataStore": "postgres",
  "wsAuth": "jwt",
  "nodeEnv": "production"
}
```

---

## Security & Refresh Token Architecture

* **High Entropy JWT Secrets:** Server startup strictly validates `JWT_SECRET` and `JWT_REFRESH_SECRET` to ensure high entropy (>= 32 bytes).
* **Refresh Token Rotation & Revocation:** Refresh tokens are persisted in PostgreSQL (`refresh_tokens` table) or persistent registry with token rotation on every call to `/api/auth/refresh` and explicit revocation on logout or reuse detection.
* **Strict Content Security Policy (CSP):** Eliminates wildcard `"*"` directives and `unsafe-eval` scripts.
* **DB-Backed Admin Operations:** User bans, KYC reviews, dispute resolutions, and admin audit logging execute directly against the PostgreSQL database in DB mode.

---

## Key Authentication & Real-Time Endpoints

### Authentication Endpoints
* `POST /api/auth/login` — Login with phone/email and password. Returns `accessToken`, rotated `refreshToken`, and user profile.
* `POST /api/auth/register` — Register a customer, fundi, or admin user.
* `POST /api/auth/refresh` — Issue fresh access token and rotated refresh token using a valid refresh token.
* `POST /api/auth/logout` — Revoke refresh token and invalidate session.
* `GET /api/auth/me` — Retrieve authenticated user profile.

### Real-Time WebSocket (`/ws`)
* Path: `/ws`
* Authentication requirement: Connection or message level JWT authentication.
* Pass JWT via query param (`/ws?token=<ACCESS_TOKEN>`) or send an auth message immediately upon connection:
  ```json
  { "type": "auth", "token": "<ACCESS_TOKEN>" }
  ```

---

## Architecture Note & Scalability

* **Active Full-Stack Container:** The application runs as a unified full-stack Node.js / Express server with Vite React frontend on Cloud Run.
* **Scalability Documentation:** Markdown files like `SCALABILITY_HARDENING_ARCHITECT.md` and `MARKETPLACE_OPERATIONS_ARCHITECT.md` document target specifications for production cluster scaling.

---

## Technical Features

1. **Escrow Payments & Milestones:** Double-entry ledger deposit protection for customers and structured payout security for trade partners.
2. **Interactive Bidding Engine:** Transparent negotiation on work contracts and custom milestones.
3. **M-Pesa Integration:** Fully supported sandbox STK Push and callback simulation for mobile transactions.
4. **AI-Powered Pricing Estimates:** Auto-diagnostics and rate advisory powered by Gemini AI.
5. **Real-time Dispute Mediation:** Built-in dispute resolution workflow with admin arbitration and double-entry ledger refunds.

---

## Local Setup & Development

### Standard AI Studio / Node Run (Single Process)
```bash
npm install
npm run dev
```
The application will launch on `http://0.0.0.0:3000`.

### Docker Compose Run (With PostgreSQL Container)
```bash
docker-compose up --build
```
