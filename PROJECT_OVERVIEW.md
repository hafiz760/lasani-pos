# RexPOS Desktop - Code Overview

This document summarizes the current codebase structure, features, and UI design so future work can move faster without re-discovering how pieces fit together.

## Purpose

RexPOS is a desktop point-of-sale and inventory system built with Electron, React, and MongoDB. It handles multi-store operations, inventory management (including raw material and combo products), sales, payments, supplier/customer balances, and accounting snapshots.

## Architecture

### Main Process (Electron)

- Entry point: `src/main/index.ts`
- Creates the main window, configures dev tools, and registers a custom `media://` protocol for image access.
- Connects to MongoDB using `MONGODB_URI` from `.env` (`src/main/lib/mongodb.ts`).
- Registers IPC handlers in `src/main/ipc/handlers.ts` for all core domain operations.

### Preload Bridge

- `src/preload/index.ts` exposes a typed `window.api` surface using `contextBridge`.
- The renderer calls `window.api.*` and all data flows through IPC channels.
- `src/preload/index.d.ts` documents the public API contract.

### Renderer (React)

- Uses React + React Router, Tailwind CSS, Radix UI, and component primitives.
- Pages live under `src/renderer/src/pages/store/...`.
- UI patterns are mostly table + dialog CRUD pages, plus specialized dashboards and detail views.

## Data Model Summary (MongoDB/Mongoose)

Key entities (see `src/main/models/*`):

- Users & Roles: `User`, `Role`, `UserStore` (store assignments + role per store)
- Stores: `Store`
- Inventory: `Product`, `Category`, `Brand`, `Attribute`, `StockEntry`
- Suppliers & Purchase Orders: `Supplier`, `PurchaseOrder`
- Customers & Sales: `Customer`, `Sale`
- Accounting: `Account`, `Transaction`, `Expense`
- Activity: `ActivityLog`

### Product Types

Product logic is type-aware (`productKind`):

- SIMPLE: standard stock tracked in units/pieces.
- RAW_MATERIAL: stock tracked in meters, with optional meters-per-unit for reference.
- COMBO_SET: multi-component sets with per-component meters and optional partial selling rules.

The product schema and IPC handlers include validation for SKU/barcode uniqueness and guard against edits when sales already exist.

## Features (by module)

### Authentication & Profiles

- Email/password login via IPC (`auth:login`).
- Password hashing with `bcryptjs`.
- Profile update and password change handlers (`profile:update`, `profile:changePassword`).

### Store Management

- Create, update, list, and activate/deactivate stores (`stores:*`).
- Store selection persisted in local storage on the renderer side.

### Users & Roles

- CRUD for users and roles (`users:*`, `roles:*`).
- Assign users to stores with role-specific access (`users:assignStore`).

### Inventory Core

- Categories, brands, and attributes (colors, sizes, fabrics, etc.) with CRUD flows.
- Inventory history via `StockEntry` (`inventory:getHistory`).
- Product list with search, pagination, archive toggle, and per-type badges.
- Product create/edit supports:
  - SIMPLE items with unit-based quantity.
  - RAW_MATERIAL items with meter-based stock.
  - COMBO_SET items with component-level setup.
- Restock modal tied to suppliers and latest pricing.
- Editing rules lock price/stock/supplier updates when sales already exist.

### Suppliers & Purchasing

- Suppliers CRUD plus balance tracking.
- Supplier payment flow creates an Expense and a Transaction record.
- Purchase Orders:
  - Create/update/delete purchase orders.
  - Stock is increased based on PO items.
  - Fetch last supplier cost per product for faster restocking.

### Customers & Credit

- Customer CRUD plus balance tracking.
- Customer payments automatically distribute across oldest pending sales.

### Sales & Payments

- Sale creation reduces inventory and generates payment history for credit sales.
- Payment status auto-calculated (PAID/PENDING/PARTIAL).
- Record payments against existing sales.
- Refund flow:
  - Validates remaining refundable amount.
  - Restores stock for refunded items.
  - Records refund history and adjusts account balances.
- Deleting a sale reverts inventory and outstanding customer balances.

### Reporting & Dashboard

- Dashboard stats include revenue, profit, pending totals, low stock count, and recent sales.
- Sales reports page with filters and status-based views.
- Sales report API aggregates totals by day/week/month.

### Accounting

- Accounts CRUD with summary totals for assets/revenue/expenses.
- Expenses create both Expense records and Transaction entries.
- Transactions list with date filters and search.

### Media & Printing

- Product images are uploaded to the app userData directory and served via `media://` protocol.
- Receipt printing uses a temporary HTML file and Electron printing API.

## UI & Design Notes

The UI follows a consistent admin dashboard style with a green accent and data-dense tables.

- Layout patterns: card-based dashboards, table-driven DataPage lists, modal dialogs for CRUD.
- Color system: accent green `#4ade80`, warning/alert colors for stock, payments, and refunds.
- Status communication: badges for payment status, stock levels, and product types.
- Forms: `react-hook-form` + `zod` for validation, toast notifications for feedback.
- Charts: Recharts area chart for 7-day revenue trend.
- Interaction cues: dropdown action menus, lightweight animations (fade-in and spinners).

## Important Files to Know

- Main process bootstrap: `src/main/index.ts`
- IPC handlers: `src/main/ipc/handlers.ts`
- MongoDB connection: `src/main/lib/mongodb.ts`
- Preload bridge: `src/preload/index.ts`
- Product model and stock rules: `src/main/models/Product.ts`
- Sales model and payment history: `src/main/models/Sale.ts`
- Dashboard UI: `src/renderer/src/pages/store/dashboard/page.tsx`
- Product list and create flows: `src/renderer/src/pages/store/inventory/products/page.tsx`, `src/renderer/src/pages/store/inventory/products/create-product.tsx`
- Sales reports and detail: `src/renderer/src/pages/store/reports/sales/page.tsx`, `src/renderer/src/pages/store/reports/sales/detail.tsx`

## Notes for Future Work

- All renderer data access should continue to go through `window.api` to keep the process boundary clean.
- When changing stock logic, verify both Product schema hooks and IPC handlers to avoid inconsistencies.
- Any new accounting flow should also create a Transaction entry to keep ledger summaries correct.
