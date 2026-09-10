# Stockroom

Stockroom is an operations-focused inventory management system with a built-in point-of-sale workflow. It helps a team keep product quantities, stock movements, low-stock signals, and completed sales in one place.

The project is a pnpm workspace with:

- A React/Vite inventory management web app
- An Express API server
- PostgreSQL persistence through Drizzle ORM
- An OpenAPI contract shared by the API and frontend
- Generated TypeScript hooks and Zod validation schemas

## Contents

- [Product capabilities](#product-capabilities)
- [Application routes](#application-routes)
- [Architecture](#architecture)
- [Repository layout](#repository-layout)
- [Requirements](#requirements)
- [Running the project](#running-the-project)
- [Environment variables](#environment-variables)
- [Database setup](#database-setup)
- [API reference](#api-reference)
- [Point-of-sale workflow](#point-of-sale-workflow)
- [API client code generation](#api-client-code-generation)
- [Validation and builds](#validation-and-builds)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)
- [Development conventions](#development-conventions)

## Product capabilities

### Inventory dashboard

- Total product count
- Units currently on hand
- Inventory value
- Low-stock and out-of-stock counts
- Seven-day inbound/outbound movement trend
- Recent movement activity

### Product catalog

- Search by product name or SKU
- Filter by category and stock status
- Create, edit, and delete products
- View unit price, reorder point, stock on hand, and stock value
- Adjust stock with inbound, outbound, or adjustment movements

### Movement history

- Chronological inventory movement log
- Inbound, outbound, and adjustment movement types
- Product, quantity, note, and timestamp details
- Stock adjustment workflow from the catalog and movement views

### Point of sale

- Searchable list of products available for sale
- Stock-aware add-to-cart controls
- Cart quantity adjustments
- Cash, card, and UPI payment methods
- Checkout confirmation receipt
- Recent sales history
- Automatic inventory and movement updates after a successful checkout

## Application routes

The web application uses path-based routing:

| Route | Purpose |
| --- | --- |
| `/` | Inventory overview dashboard |
| `/pos` | Point-of-sale checkout |
| `/products` | Product catalog and stock management |
| `/movements` | Inventory movement history |

The API is mounted under `/api`:

| Route | Purpose |
| --- | --- |
| `/api/healthz` | API health check |
| `/api/products` | Product listing and creation |
| `/api/products/:id` | Product update and deletion |
| `/api/products/:id/stock` | Stock adjustment |
| `/api/movements` | Movement history |
| `/api/dashboard/summary` | Dashboard metrics and trend |
| `/api/sales` | Sales listing and POS checkout |

## Architecture

```text
React/Vite web app
        |
        | generated React Query hooks
        v
OpenAPI contract
        |
        | generated Zod request/response schemas
        v
Express API server
        |
        | Drizzle ORM
        v
PostgreSQL
```

### Source of truth

The API contract lives in `lib/api-spec/openapi.yaml`. The generated files should not be edited by hand:

- `lib/api-client-react/src/generated/api.ts`
- `lib/api-client-react/src/generated/api.schemas.ts`
- `lib/api-zod/src/generated/api.ts`
- `lib/api-zod/src/generated/types/*`

When an API request or response changes, update the OpenAPI document and run code generation.

### Inventory data model

- `products` stores the current operational product state, including stock on hand and reorder point.
- `movements` stores the immutable history of stock changes.
- `sales` stores checkout headers, totals, payment method, and sale number.
- `sale_items` stores product snapshots for each checkout line.

Products remain the source of truth for current POS availability. Movement and sale rows provide the audit trail.

## Repository layout

```text
.
├── artifacts/
│   ├── api-server/
│   │   └── src/
│   │       ├── app.ts
│   │       ├── index.ts
│   │       └── routes/
│   ├── inventory-management/
│   │   └── src/
│   │       ├── App.tsx
│   │       └── index.css
│   └── mockup-sandbox/
├── lib/
│   ├── api-client-react/
│   ├── api-spec/
│   │   └── openapi.yaml
│   ├── api-zod/
│   └── db/
│       └── src/schema/
├── scripts/
├── README.md
├── replit.md
├── package.json
├── pnpm-lock.yaml
└── pnpm-workspace.yaml
```

Important areas:

- `artifacts/inventory-management/src/App.tsx` — frontend shell, routing, dashboard, catalog, movements, and POS UI
- `artifacts/inventory-management/src/index.css` — visual theme and shared design tokens
- `artifacts/api-server/src/routes/inventory.ts` — product, stock, movement, and dashboard handlers
- `artifacts/api-server/src/routes/sales.ts` — sales listing and transactional checkout handlers
- `lib/db/src/schema/products.ts` — product table
- `lib/db/src/schema/movements.ts` — movement table
- `lib/db/src/schema/sales.ts` — sales and sale-items tables
- `replit.md` — collaborator-facing project notes and decisions

## Requirements

- Node.js 24
- pnpm
- PostgreSQL 16 or a compatible PostgreSQL database
- A `DATABASE_URL` connection string

The Replit configuration provides Node.js 24 and PostgreSQL 16 through `.replit`.

## Running the project

### Install dependencies

```bash
pnpm install
```

The workspace intentionally uses pnpm. The root `preinstall` script rejects npm and Yarn lockfile workflows.

### Configure the database

Set `DATABASE_URL` in the Replit Secrets/environment UI or in the local shell:

```bash
export DATABASE_URL="postgresql://user:password@host:5432/database"
```

Do not commit database credentials or put them in this README.

### Push the development schema

```bash
pnpm --filter @workspace/db run push
```

This applies the Drizzle schema to the development database. Use it after changing a database schema file.

### Start the API server

```bash
pnpm --filter @workspace/api-server run dev
```

The API listens on the `PORT` environment variable. The configured Replit API workflow uses port `8080` and exposes the API under `/api`.

### Start the web app

```bash
pnpm --filter @workspace/inventory-management run dev
```

The configured Replit web workflow uses port `25781` and serves the app at `/`.

### Start the configured Replit workflows

The project has these configured workflows:

| Workflow | Command | Port |
| --- | --- | --- |
| API Server | `pnpm --filter @workspace/api-server run dev` | `8080` |
| Inventory Management | `pnpm --filter @workspace/inventory-management run dev` | `25781` |
| Component Preview Server | `pnpm --filter @workspace/mockup-sandbox run dev` | Managed preview service |

In Replit, use the project run button to start the configured project workflow. The web app communicates with the API through the artifact routing configuration.

## Environment variables

| Variable | Required | Used by | Description |
| --- | --- | --- | --- |
| `DATABASE_URL` | Yes | API/database | PostgreSQL connection string |
| `PORT` | Yes | API/web services | Port selected by the workflow or deployment |
| `BASE_PATH` | Web workflow | Frontend artifact | Base path for path-based routing |
| `NODE_ENV` | No | API server | `development` or `production` |

`SESSION_SECRET` may exist in the Replit environment for platform/runtime needs, but the current inventory feature set does not expose authentication functionality.

## Database setup

Database schemas are defined in `lib/db/src/schema/` and exported from `lib/db/src/schema/index.ts`.

Current tables:

### `products`

Stores:

- SKU
- Product name
- Category
- Unit price
- Stock on hand
- Reorder point
- Creation and update timestamps

Product status is derived at response time:

- `out_of_stock` when stock is `0`
- `low_stock` when stock is greater than `0` and at or below the reorder point
- `healthy` otherwise

### `movements`

Stores each stock change:

- Product reference
- Movement type: `in`, `out`, or `adjustment`
- Quantity
- Optional note
- Creation timestamp

### `sales`

Stores the checkout header:

- Sale number
- Subtotal
- Total
- Payment method: `cash`, `card`, or `upi`
- Creation timestamp

### `sale_items`

Stores immutable line-item snapshots:

- Sale reference
- Product reference
- Product name
- SKU
- Quantity
- Unit price
- Line total

Keeping product name, SKU, and price on the sale item preserves what was sold even if the product is later edited.

## API reference

All API endpoints are mounted below `/api`. Requests and responses are validated using generated Zod schemas.

### Health

#### `GET /api/healthz`

Returns the API health status.

### Products

#### `GET /api/products`

Optional query parameters:

```text
search=term
category=Audio
status=all|healthy|low_stock|out_of_stock
```

Returns products ordered by name. Search matches product names and SKUs.

#### `POST /api/products`

Creates a product.

Example body:

```json
{
  "sku": "KB-1001",
  "name": "Mechanical Keyboard",
  "category": "Peripherals",
  "unitPrice": 89.99,
  "stockOnHand": 20,
  "reorderPoint": 5
}
```

#### `PATCH /api/products/:id`

Updates product fields. The `updatedAt` timestamp is refreshed.

#### `DELETE /api/products/:id`

Deletes a product and returns `204 No Content` when successful.

#### `POST /api/products/:id/stock`

Adjusts stock and writes a movement record.

Example body:

```json
{
  "type": "in",
  "quantity": 12,
  "note": "Supplier delivery"
}
```

`type` can be `in`, `out`, or `adjustment`. An outbound adjustment that would make stock negative is rejected.

### Movements and dashboard

#### `GET /api/movements`

Optional query parameter:

```text
limit=8
```

The API accepts limits from `1` to `100` and returns the newest movements first.

#### `GET /api/dashboard/summary`

Returns:

- Product count
- Unit count
- Inventory value
- Low-stock count
- Out-of-stock count
- Seven-day inbound/outbound movement trend

### Sales

#### `GET /api/sales`

Optional query parameter:

```text
limit=12
```

The API accepts limits from `1` to `50` and returns recent sale summaries.

#### `POST /api/sales`

Completes a POS checkout.

Example body:

```json
{
  "items": [
    {
      "productId": 1,
      "quantity": 2
    }
  ],
  "paymentMethod": "card"
}
```

The response includes:

- Generated sale number
- Item snapshots
- Subtotal and total
- Payment method
- Creation timestamp

The endpoint returns `400` when a product no longer exists or available stock is insufficient.

## Point-of-sale workflow

The POS page at `/pos` uses the generated React Query hooks for products and sales.

1. A staff member searches the product catalog.
2. Products with zero stock cannot be added.
3. Cart quantities cannot exceed the product quantity loaded from inventory.
4. The staff member selects cash, card, or UPI.
5. Checkout sends all cart lines to `POST /api/sales`.
6. The API validates the request and loads the current product records.
7. The API creates the sale and sale items.
8. The API decrements product stock.
9. The API records an outbound movement for every sold product.
10. The API returns the completed sale.
11. The frontend invalidates product, movement, dashboard, and sales queries.
12. The frontend shows a receipt confirmation and clears the cart.

Sale creation runs inside a database transaction. If validation or stock checks fail, the sale, stock update, and movement rows are not committed.

## API client code generation

The OpenAPI contract is the source of truth. After editing `lib/api-spec/openapi.yaml`, regenerate the clients:

```bash
pnpm --filter @workspace/api-spec run codegen
```

Generated output includes:

- React Query request hooks
- Query-key helpers
- TypeScript request and response types
- Server-side Zod schemas

After code generation, run the full typecheck:

```bash
pnpm run typecheck
```

## Validation and builds

### Full typecheck

```bash
pnpm run typecheck
```

This checks the shared libraries, API server, frontend, mockup sandbox, and scripts.

### Full build

```bash
pnpm run build
```

This runs the full typecheck and then builds packages that expose a build script.

### Frontend-only build

```bash
pnpm --filter @workspace/inventory-management run build
```

### API-only build

```bash
pnpm --filter @workspace/api-server run build
```

### Manual API smoke checks

With the API workflow running:

```bash
curl -sS http://localhost:8080/api/healthz
curl -sS http://localhost:8080/api/products
curl -sS http://localhost:8080/api/dashboard/summary
curl -sS 'http://localhost:8080/api/sales?limit=5'
```

The exact port may differ outside the configured Replit workflow; use the active `PORT` value.

## Deployment

The project is configured as an autoscaled Replit application in `.replit`.

The web artifact builds to static files:

```bash
pnpm --filter @workspace/inventory-management run build
```

The API artifact builds an esbuild bundle:

```bash
pnpm --filter @workspace/api-server run build
```

Before publishing:

1. Confirm the production database is available.
2. Set the production `DATABASE_URL` through the environment/secrets UI.
3. Apply the schema to the intended database using the project’s database workflow.
4. Run `pnpm run typecheck`.
5. Run `pnpm run build`.
6. Test `/api/healthz`.
7. Test the web dashboard and `/pos`.
8. Publish using Replit’s deployment controls.

Never commit secrets, database credentials, or generated connection strings.

## Troubleshooting

### The API does not start

Check:

- `DATABASE_URL` is set and points to a reachable PostgreSQL database.
- `PORT` is set to a valid positive number.
- The schema has been pushed with `pnpm --filter @workspace/db run push`.
- API workflow logs for database connection or validation errors.

### The web preview is blank

Check:

- The inventory web workflow is running.
- Vite is configured to listen on `0.0.0.0`.
- The API workflow is also running.
- Browser console logs do not show failed API requests.
- The web artifact is being opened at the configured preview path rather than a raw localhost URL.

### Products do not appear

Check:

- The API is reachable at `/api/products`.
- The database contains product rows.
- `DATABASE_URL` points to the same database used by the running API.
- The frontend search, category, or status filters are not excluding the rows.

### Checkout is rejected

The most common causes are:

- The product was deleted after the cart loaded.
- Another stock adjustment reduced available quantity.
- The requested quantity exceeds current stock.
- The request body does not use `cash`, `card`, or `upi`.

Refresh the product list and try again. The API intentionally rejects insufficient-stock checkout instead of allowing negative inventory.

### Generated types are stale

Run:

```bash
pnpm --filter @workspace/api-spec run codegen
pnpm run typecheck
```

Do not manually patch generated API files.

## Development conventions

- Use pnpm commands at the workspace root or with `--filter`.
- Keep API changes in the OpenAPI document first.
- Regenerate API clients after contract changes.
- Keep database changes in `lib/db/src/schema/`.
- Push development schema changes with the Drizzle workflow.
- Keep inventory movements append-only.
- Use transactions for workflows that change more than one related record.
- Do not hardcode `localhost` or a development domain into browser-facing API URLs.
- Keep user-facing loading, error, and empty states explicit.
- Keep secrets in Replit Secrets/environment management, never in source files.

## Further project notes

See [`replit.md`](./replit.md) for the shorter collaborator-facing project summary, architecture decisions, gotchas, and important file pointers.
