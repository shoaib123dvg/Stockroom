# Inventory Management

Stockroom is an inventory workspace for tracking products, stock levels, movements, and low-stock signals.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (configured workflow port 8080)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/inventory-management` — React dashboard, product catalog, and movement log
- `artifacts/api-server/src/routes/inventory.ts` and `sales.ts` — inventory and checkout API handlers
- `lib/api-spec/openapi.yaml` — source of truth for the API contract
- `lib/db/src/schema/products.ts`, `movements.ts`, and `sales.ts` — database tables
- `artifacts/inventory-management/src/index.css` — visual theme and design tokens

## Architecture decisions

- Inventory changes are recorded as immutable movement rows while product stock is kept as the current operational total.
- Product status is derived from stock on hand and reorder point, so dashboard alerts cannot drift from catalog data.
- The API contract is generated from OpenAPI and shared by the Express server and React client.
- The dashboard trend is intentionally limited to a seven-day window to keep the first view fast and operationally focused.

## Product

- Overview dashboard with product count, units on hand, inventory value, low-stock/out-of-stock counts, movement trend, and recent activity.
- Product catalog with search, category/status filters, create/edit/delete actions, and stock adjustment entry points.
- Movement log with inbound, outbound, and adjustment history plus stock adjustment workflow.
- Point of sale screen with searchable products, cart controls, cash/card/UPI checkout, receipts, and recent sales history.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Run API codegen after changing `lib/api-spec/openapi.yaml`.
- Run `pnpm --filter @workspace/db run push` after schema changes in development.
- POS checkout updates the sale, stock, and outbound movement together in one database transaction.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
