# RexPOS Codebase Understanding

This file is a future-maintainer guide for the current RexPOS desktop codebase. It focuses on how the app is wired, where business rules live, and what to check before changing important flows.

## High-Level Purpose

RexPOS is an Electron desktop point-of-sale application for store operations. It includes authentication, multi-store access, inventory, POS sales, refunds, customer credit, supplier purchasing, accounting, reporting, image upload, receipt printing, and database configuration.

The application is built with:

- Electron + electron-vite for the desktop shell.
- React 19 + React Router for the renderer.
- Tailwind CSS v4, Radix UI primitives, lucide-react icons, and local UI components.
- MongoDB through Mongoose in the Electron main process.
- IPC as the only intended data boundary between renderer and database logic.

## Runtime Shape

```text
Renderer React UI
  -> window.api from preload
    -> ipcRenderer.invoke(...)
      -> ipcMain handlers in main process
        -> Mongoose models
          -> MongoDB
```

Important files:

- `src/main/index.ts`: Electron app bootstrap, main window creation, `media://` protocol, IPC registration, database connection attempt.
- `src/preload/index.ts`: exposes the typed-ish `window.api` bridge used by the renderer.
- `src/preload/index.d.ts`: renderer-facing API type declarations.
- `src/main/ipc/handlers.ts`: central registration point for all IPC handler groups.
- `src/main/ipc/handlers/*.handler.ts`: domain-specific database and business logic.
- `src/main/models/*.ts`: Mongoose schemas and indexes.
- `src/renderer/src/App.tsx`: route tree, auth guards, store guard, database configuration modal.
- `src/renderer/src/layouts/AdminLayout.tsx`: admin shell and navigation.
- `src/renderer/src/layouts/StoreLayout.tsx`: store shell and navigation.
- `src/renderer/src/assets/index.css`: Tailwind v4 theme tokens and global colors.

## Development Commands

The project scripts are in `package.json`:

- `npm run dev`: start Electron/Vite development mode.
- `npm run typecheck`: run node and web TypeScript checks.
- `npm run lint`: run ESLint.
- `npm run build`: typecheck and build with electron-vite.
- `npm run build:win`, `npm run build:mac`, `npm run build:linux`: package for each platform.

The repository has `yarn.lock` and no current `package-lock.json` in the working tree, but scripts are written with `npm run ...`.

## Database Configuration

Database connection logic is split across two concepts:

- `src/main/lib/mongodb.ts` connects Mongoose.
- `src/main/lib/config-manager.ts` persists app config to Electron `userData/app-config.json`.

In development, `mongodb.ts` reads `.env` from the project root and uses `MONGODB_URI`.

In packaged production, `mongodb.ts` currently defaults to:

```text
mongodb://localhost:27017/lasani-pos-database
```

The renderer checks connection status on startup in `App.tsx`. If the database is not connected, it opens `DatabaseConfigModal`, which talks to the `config:*` IPC handlers from `dashboard.handler.ts`.

Maintainer note: if database configuration behavior changes, check both `mongodb.ts` and `config-manager.ts`; they are related but not fully unified.

## Routing and User Areas

Routes use `HashRouter`, which fits Electron packaging because it does not require a server-side fallback.

Top-level route groups:

- `/login`: login screen.
- `/select-store`: store selection for non-admin users.
- `/admin`: admin-only area.
- `/dashboard`: store workspace area.

`ProtectedRoute` in `App.tsx` checks:

- A user exists in `localStorage`.
- Optional global role access, currently admin-only for `/admin`.
- Optional selected store requirement for non-admin store routes.

User/session state is stored in `localStorage`:

- `user`
- `token` even though token usage is minimal in the current source.
- `selectedStore`

## Main Process and IPC

All database work should stay in the main process. Renderer pages should call `window.api.*`, not import models or MongoDB code.

IPC handler groups:

- `auth.handler.ts`: login.
- `stores.handler.ts`: store CRUD and activation.
- `users.handler.ts`: users, roles, profile, store assignments.
- `inventory.handler.ts`: categories, brands, attributes, products, stock entries.
- `suppliers.handler.ts`: suppliers and supplier payments.
- `customers.handler.ts`: customers, customer details, customer payments.
- `purchase-orders.handler.ts`: purchase order lifecycle and stock receiving.
- `sales.handler.ts`: sale creation, listing, reports, payments, refunds, delete/reversal.
- `accounting.handler.ts`: accounts, expenses, transactions.
- `dashboard.handler.ts`: dashboard stats, printing, image upload, database config handlers.

`src/main/ipc/helpers.ts` has shared helpers:

- `toJSON(...)`: serializes Mongoose documents into IPC-safe plain objects.
- `createAccountTransaction(...)`: creates a simple transaction entry for an account.
- `ensureDefaultAccounts(...)`: creates/fetches "Cash in Hand" and "Bank" accounts for a store.

## Data Model Map

Core models:

- `User`: login identity with global role.
- `Role`: named permissions/role records.
- `UserStore`: per-store user assignment and role.
- `Store`: store profile, status, and contact/location information.
- `Product`: product catalog and stock fields.
- `Category`, `Brand`, `Attribute`: inventory metadata.
- `StockEntry`: initial stock, restock, adjustment, and return history.
- `Supplier`: vendor profile and payable balance.
- `PurchaseOrder`: supplier purchase workflow.
- `Customer`: customer profile and receivable balance.
- `Sale`: invoices, line items, payments, refunds, profit.
- `Account`: chart of accounts per store.
- `Expense`: expenses tied to accounts and stores.
- `Transaction`: ledger-style entries.
- `ActivityLog`, `ProductStock`, `StockTransaction`: present models, but the current primary flows mostly use `StockEntry`, `Product`, `Sale`, `PurchaseOrder`, `Expense`, and `Transaction`.

## Product and Stock Rules

The central product model is `src/main/models/Product.ts`.

Supported `productKind` values:

- `SIMPLE`: normal piece/unit stock using `stockLevel`.
- `RAW_MATERIAL`: stock is measured as meters; pre-save sets `stockLevel = totalMeters`.
- `COMBO_SET`: stock is derived from component stock levels; pre-save sets full-set stock to the minimum component stock.

Key product fields:

- `sku` is unique per store.
- `barcode` is indexed per store when present.
- `buyingPrice`, `sellingPrice`, `stockLevel`, `minStockLevel` drive normal product workflows.
- `totalMeters`, `metersPerUnit`, `calculatedUnits` support raw material workflows.
- `comboComponents`, `canSellSeparate`, `canSellPartialSet`, and `twoComponentPrices` support set workflows.

Stock movement is not isolated in one service. Before modifying stock behavior, inspect:

- `src/main/models/Product.ts`
- `src/main/ipc/handlers/inventory.handler.ts`
- `src/main/ipc/handlers/sales.handler.ts`
- `src/main/ipc/handlers/purchase-orders.handler.ts`
- `src/main/models/StockEntry.ts`

## Sales, Payments, and Refunds

Sales are modeled in `src/main/models/Sale.ts` and implemented mainly in `src/main/ipc/handlers/sales.handler.ts`.

The sale model stores:

- `invoiceNumber`
- customer reference
- sale date
- line items
- subtotal, discount, tax, total, paid amount
- payment status: `PAID`, `PENDING`, `PARTIAL`
- payment method/channel
- profit
- payment history
- refund history
- store and sold-by references

Important behavior:

- Creating a sale reduces inventory.
- Credit or partially paid sales update customer balances.
- Recording payments updates `paidAmount`, payment history, status, and related customer/account state.
- Refunds validate refundable amounts, restore stock, add refund history, and adjust balances.
- Deleting a sale attempts to reverse inventory and customer balance effects.

When changing sales logic, verify reports, customer details, refunds, product stock, and accounting side effects together.

## Purchasing and Suppliers

Purchase orders live in `PurchaseOrder.ts` and `purchase-orders.handler.ts`.

They track:

- `poNumber`
- supplier
- purchase date
- status: `DRAFT`, `CONFIRMED`, `RECEIVED`, `CANCELLED`
- items, quantities, costs, received quantities
- totals and payment status
- store, creator, receiver

Supplier workflows also exist in `suppliers.handler.ts`.

Important behavior:

- Receiving or updating purchase orders can increase product stock.
- Supplier payments create accounting records.
- Last supply/cost lookup is used by product restock and PO forms.

## Accounting

Accounting is intentionally simple, not a full double-entry engine in every flow.

Models:

- `Account`: account code/name/type and balances.
- `Expense`: expense record with category, amount, account, vendor, payment method.
- `Transaction`: transaction date, reference type/id, entries, total amount, store, creator.

Handlers:

- `accounts:*`
- `expenses:*`
- `transactions:*`

Maintainer rule: when adding a new money movement, check whether it should create a `Transaction` and whether account/current balances need adjustment. Existing flows are not centralized, so side effects can be easy to miss.

## Renderer Organization

Renderer source lives in `src/renderer/src`.

Major folders:

- `pages/auth`: login and store selection.
- `pages/admin`: admin dashboard, users, stores, roles, profile/settings.
- `pages/store/dashboard`: store dashboard.
- `pages/store/sales`: POS and sale report print preview.
- `pages/store/reports`: sales, customers, expenses, transactions reporting.
- `pages/store/inventory`: products, categories, brands, attributes.
- `pages/store/purchases`: suppliers and purchase orders.
- `pages/store/customers`: customer list and detail.
- `pages/store/accounting`: accounts, expenses, transactions.
- `components/ui`: local Radix/Tailwind primitives.
- `components/shared`: reusable app components like DataPage, store switcher, database config modal, searchable controls.
- `components/inventory`: product form sections and restock modal.
- `lib/validations`: Zod schemas for forms.
- `lib/print-utils.ts`: print helper that calls `window.api.printer.printReceipt`.
- `lib/upload.ts`, `lib/export.ts`, `lib/utils.ts`: renderer utilities.

The UI is built around data-dense admin screens: sidebars, tables, dialogs, filters, status badges, and detail pages.

## Image Upload and Media

Image upload is handled by `app:uploadImage` in `dashboard.handler.ts`.

Uploaded images are stored under Electron `userData/Uploads`. The main process registers a custom `media://` protocol in `src/main/index.ts`, so renderer image paths can point at uploaded media without directly reading local filesystem paths.

There is also a project-level `Uploads/` folder in the repository, but runtime upload behavior uses Electron `userData`.

## Printing

Printing uses `printer:printReceipt` from the preload API. The renderer builds receipt HTML, then the main process creates/prints through Electron. See:

- `src/renderer/src/lib/print-utils.ts`
- `src/main/ipc/handlers/dashboard.handler.ts`

## Styling and Theme

Global styling is in `src/renderer/src/assets/index.css`.

Tailwind v4 is configured through CSS:

- `@import "tailwindcss";`
- `@plugin "tailwindcss-animate";`
- `@source "../../../src";`
- `@theme` maps CSS variables to Tailwind tokens.

The theme currently uses a warm light background and dark blue/slate dark mode with coral primary color `#E8705A`.

`ThemeProvider` wraps the app in `main.tsx`. Mode toggles appear in admin and store layouts.

## Validation and Forms

Most form validation schemas live in:

```text
src/renderer/src/lib/validations
```

Common stack:

- `react-hook-form`
- `zod`
- `@hookform/resolvers`
- Sonner toast notifications

When adding a form, follow the existing pattern: schema in `lib/validations` when reusable, UI in the relevant page/component, and persistence through `window.api`.

## Important Change Checklist

For inventory changes:

- Check `Product.ts`, `StockEntry.ts`, `inventory.handler.ts`, `sales.handler.ts`, and `purchase-orders.handler.ts`.
- Verify SIMPLE, RAW_MATERIAL, and COMBO_SET behavior if the change touches stock fields.
- Confirm SKU/barcode uniqueness still works per store.

For sales changes:

- Check stock deduction/restoration.
- Check customer balance updates.
- Check payment status calculations.
- Check refund and delete reversal paths.
- Check sales reports and dashboard stats.

For accounting changes:

- Check account balance updates.
- Check `Expense` and `Transaction` creation.
- Check supplier/customer payment flows.
- Check reports that read transactions or expenses.

For auth/access changes:

- Check `App.tsx` route guards.
- Check admin and store layouts.
- Check `localStorage` keys.
- Check `User`, `Role`, and `UserStore` models/handlers.

For database config changes:

- Check `mongodb.ts`, `config-manager.ts`, `DatabaseConfigModal`, and `config:*` handlers.
- Test both development and packaged assumptions.

## Known Risks and Maintenance Notes

- Business rules are spread across IPC handlers rather than service modules. This makes behavior easy to follow locally but increases duplication risk.
- The renderer API bridge in `preload/index.ts` uses many untyped `any` parameters. `index.d.ts` should be kept in sync when API methods change.
- `localStorage` is the main session store; there is no strong token/session enforcement in the current renderer route guards.
- Database configuration has two paths: environment-based connection and persisted app config. Review this before changing connection UX.
- Some model comments mention Next.js compatibility even though this is Electron; treat those comments as legacy wording.
- `ProductStock` and `StockTransaction` models exist but are not the primary path in current UI workflows.
- There are generated output folders (`out`, `build`) and installed dependencies (`node_modules`) in the working directory; avoid reviewing or editing them unless packaging behavior is the target.

## Fast Orientation Path for New Work

1. Start with the route or page in `src/renderer/src/App.tsx`.
2. Find the page/component under `src/renderer/src/pages` or `components`.
3. Search for its `window.api.*` call.
4. Match that method in `src/preload/index.ts`.
5. Open the corresponding handler in `src/main/ipc/handlers`.
6. Check the Mongoose model in `src/main/models`.
7. For stock, sales, payment, or accounting changes, search the related model name across all handlers before editing.
