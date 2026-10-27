# Bill Pro — Backend API Server

High-concurrency, transactional REST API for Indian retail billing, real-time inventory management, GST compliance, and financial accounting. Built with **Node.js**, **Express**, **TypeScript**, and **PostgreSQL (Sequelize ORM)**.

---

## Core Capabilities

- **Deterministic Indian GST Engine:**
  - Automatic classification of Intra-state (`CGST` + `SGST`) vs. Inter-state (`IGST`) transactions based on supplier vs. customer GSTIN state codes.
  - Tax-inclusive MRP deductions, taxable value calculation, and compensation cess calculation.
  - Immutable tax and item snapshots preserved on invoice line items.
- **Transactional Point-of-Sale (POS):**
  - Concurrency-safe sequential invoice numbering (`INV-YYYY-XXXXX`).
  - Atomic database transactions: inventory stock deductions occur in lockstep with bill posting.
  - Multi-mode tender: Cash, UPI, Card, Net Banking, Cheque, and Credit (Udhaar) with split-payment tracking.
- **Auditable Stock Ledger:**
  - Double-entry stock movement tracking linked directly to sales invoices, vendor purchases, sales returns, and manual inventory adjustments.
  - Low-stock warnings and batch tracking.
- **Offline Ingestion & Sync Engine:**
  - Ingestion endpoint (`POST /api/v1/sync/events`) for bills and transactions recorded while offline on the counter terminal.
  - Idempotency key protection and sequential replay prevent duplicate bill creation.
- **Security & Multi-Tenancy:**
  - Role-Based Access Control (`OWNER`, `MANAGER`, `CASHIER`).
  - Cashier numeric PIN authentication for fast counter shift handovers.
  - Multi-tenant shop partitioning via `X-Shop-Id` headers.
  - Helmet security headers, rate limiting, and configurable CORS for local network devices.
- **Interactive Swagger Documentation:** Complete OpenAPI 3.0 interactive docs at `/api/docs`.

---

## Technology Stack

- **Runtime & Language:** Node.js 20+ & TypeScript 5
- **Framework:** Express 4
- **ORM & Database:** Sequelize 6 with PostgreSQL 16 (supports SQLite for testing)
- **Security:** `jsonwebtoken` (JWT), `bcryptjs`, `helmet`, `cors`
- **Validation:** `zod` schema validation
- **API Docs:** `swagger-ui-express`
- **Execution & Hot Reload:** `tsx` watch mode

---

## Directory Structure

```text
backend/
├── src/
│   ├── config/             # Environment, database, CORS, and logger configuration
│   │   ├── cors.ts
│   │   ├── database.ts
│   │   ├── env.ts
│   │   └── logger.ts
│   ├── database/           # Models, Sequelize associations, migrations, and seeders
│   │   ├── associations.ts
│   │   ├── migrate.ts
│   │   └── seed.ts
│   ├── middleware/         # JWT auth, error handlers, and rate limiting
│   │   ├── auth.ts
│   │   ├── error-handler.ts
│   │   └── request-logger.ts
│   ├── modules/            # Domain-driven feature modules
│   │   ├── auth/           # Login, signup, PIN verification, token refresh
│   │   ├── inventory/      # Stock tracking, valuations, adjustments
│   │   ├── invoices/       # Sales invoices, thermal receipt data, returns
│   │   ├── items/          # Products catalog, barcodes, HSN, tax rates
│   │   ├── parties/        # Customers (Udhaar ledger) and Suppliers
│   │   ├── payments/       # Manual payment records & receipts
│   │   ├── purchases/      # Vendor purchase inward orders
│   │   ├── reports/        # Sales analytics, cashbook, GSTR-1, GSTR-3B
│   │   └── sync/           # Offline queue synchronization
│   ├── routes/             # API v1 routes mounting
│   ├── shared/             # Custom errors, HTTP status codes, and utilities
│   ├── app.ts              # Express application factory & middleware stack
│   └── server.ts           # Server bootstrap and graceful shutdown
├── tests/                  # Integration & unit test suites (Jest + Supertest)
├── .env.example            # Environment template
├── .env                    # Active local environment variables
├── package.json            # Node scripts & dependencies
└── tsconfig.json           # TypeScript configuration
```

---

## Getting Started

### 1. Prerequisites
- Node.js 18+ or 20+
- PostgreSQL database running (or Docker)

### 2. Installation
```bash
cd backend
npm install
```

### 3. Environment Configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Review and adjust variables in `.env`:
```env
PORT=5000
HOST=0.0.0.0
NODE_ENV=development

# Database configuration (PostgreSQL or SQLite)
DB_DIALECT=postgres
DB_HOST=127.0.0.1
DB_PORT=5432
DB_NAME=billpro_db
DB_USER=postgres
DB_PASSWORD=postgres
DB_LOGGING=false

# Authentication
JWT_SECRET=billpro_super_secret_jwt_key_2026_dev_environment
JWT_EXPIRES_IN=1d
JWT_REFRESH_SECRET=billpro_super_secret_refresh_key_2026_dev_environment
JWT_REFRESH_EXPIRES_IN=7d

# CORS (Frontend origins)
CORS_ORIGIN=http://localhost:5173,http://localhost:3000
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=1000
```

> **Note on Network Access:** `HOST=0.0.0.0` allows devices on your local Wi-Fi to reach the API server at `http://<YOUR_LOCAL_IP>:5000/api/v1`.

### 4. Database Setup & Seeding
Run schema synchronization and load default businesses, catalog items, and staff:
```bash
# Run database schema migrations
npm run migrate

# Seed catalog, test users, and default store data
npm run seed
```

### 5. Start Development Server
```bash
npm run dev
```

Server endpoints:
- **API Base:** `http://localhost:5000/api/v1`
- **Network API:** `http://<YOUR_LOCAL_IP>:5000/api/v1`
- **Interactive Swagger Docs:** `http://localhost:5000/api/docs`
- **Health Check:** `http://localhost:5000/api/v1/health`

### 6. Run Test Suite
```bash
npm test
```

---

## Seed Test Accounts

| Role | Email | Password | Counter PIN |
| :--- | :--- | :--- | :--- |
| **Owner** | `admin@billpro.local` | `Admin@1234` | `1234` |
| **Manager** | `manager@billpro.local` | `Manager@1234` | `2345` |
| **Cashier** | `cashier@billpro.local` | `Cashier@1234` | `3456` |
