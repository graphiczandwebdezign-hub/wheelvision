# WheelVision

A metadata-driven wheel and tyre preview platform scaffolded as a Next.js 15 + React 19 + TypeScript application.

## What is included

- App Router structure under `app/`
- Metadata-driven preview route at `/preview`
- Admin entry point at `/admin`
- Layered API backend (controllers → services → repositories) under `server/`
- PostgreSQL schema, migrations and seed data via Prisma
- Architecture package under `docs/architecture/`
- Initial vehicle metadata and asset placeholders for the Toyota Hilux MVP

## Prerequisites

- **Node.js 20** (matches CI)
- **PostgreSQL 15+** running locally (only needed for database-backed work)

## Installation

```bash
git clone https://github.com/graphiczandwebdezign-hub/wheelvision.git
cd wheelvision
npm install --legacy-peer-deps
```

`npm install` automatically generates the Prisma client via the `postinstall`
hook — no manual `npx prisma generate` step is required. If your network blocks
the Prisma engine CDN (`binaries.prisma.sh`), set `PRISMA_ENGINES_MIRROR` to an
internal mirror or allow-list the host.

## Environment variables

Copy the template and adjust for your machine:

```bash
cp .env.example .env.local
```

All variables are validated at startup by the single authoritative Zod schema in
[`config/env.ts`](config/env.ts). `.env`, `.env.*` and `.env.local` are
git-ignored; only `.env.example` is tracked.

| Variable                                  | Required          | Default                                                     | Purpose                                                                                        |
| ----------------------------------------- | ----------------- | ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                            | Yes (for DB work) | `postgresql://postgres:postgres@localhost:5432/wheelvision` | PostgreSQL connection string for Prisma                                                        |
| `NODE_ENV`                                | No                | `development`                                               | Runtime environment (`development` / `test` / `production`)                                    |
| `NEXT_PUBLIC_APP_URL`                     | No                | `http://localhost:3000`                                     | Public base URL of the app                                                                     |
| `NEXT_PUBLIC_ENABLE_REACT_QUERY_DEVTOOLS` | No                | `false`                                                     | Set to `true` to show the React Query Devtools panel                                           |
| `DEFAULT_TENANT_SLUG`                     | No                | `demo-tenant`                                               | Tenant used when a request does not pass the `x-tenant-slug` header; matches the seeded tenant |

## Development workflow

```bash
npm run dev          # start the dev server on http://localhost:3000
npm run lint         # ESLint
npm run typecheck    # strict TypeScript, no emit
npm run test         # Vitest unit tests
```

Quality gates run automatically: lint-staged + Husky on commit, and the full
pipeline (install → Prisma generate → lint → typecheck → tests → build) in
GitHub Actions on every pull request and push to `main`.

## Database setup

```bash
npm run db:generate   # generate the Prisma client (also automatic on install)
npm run db:migrate    # apply migrations to your local database
npm run db:seed       # load demo data (tenant, Hilux, wheels, tyres)
```

For deployed environments use `npm run db:deploy` instead of `db:migrate`.

## Testing

- **Unit/integration:** `npm run test` (Vitest + jsdom, specs in `tests/unit/`)
- **End-to-end:** `npm run test:e2e` (Playwright, specs in `tests/e2e/`).
  Playwright starts the Next.js dev server automatically via its `webServer`
  configuration — no manual server is needed. Set `PLAYWRIGHT_BASE_URL` to
  target a remote deployment instead.

## Building

```bash
npm run build   # production build
npm run start   # serve the production build
```

A fresh clone builds end-to-end without manual steps: dependencies install,
the Prisma client generates on `postinstall`, and lint/typecheck/tests all run
in CI before the build executes.

## Catalog API

The read catalog is the data layer every surface consumes (preview, and later
admin, kiosk, quotes and AI). The frontend reaches it only through the React
Query hooks in `features/catalog/` — never by reading data directly.

| Endpoint                | Description                                                                                                                     |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/vehicles`     | Paginated vehicle summaries (manufacturer, model, variant, colours)                                                             |
| `GET /api/vehicles/:id` | Vehicle detail: colours, year, Chapter-6 `renderMetadata` (wheel positions, wheel diameter, asset package refs)                 |
| `GET /api/wheels`       | Paginated wheel summaries (brand, model, finishes)                                                                              |
| `GET /api/wheels/:id`   | Wheel detail: finishes, sizes, bolt patterns, offsets, centre bores, metadata, `pricing` contract (null until the quote engine) |
| `GET /api/tyres`        | Paginated tyre summaries (brand, pattern, profile strings)                                                                      |
| `GET /api/tyres/:id`    | Tyre detail: decomposed profile specs (width, aspect ratio, diameter, construction, load index, speed rating), metadata         |

Conventions:

- **Tenancy:** resolve via the `x-tenant-slug` request header, falling back to
  `DEFAULT_TENANT_SLUG` (auth will supply the tenant from the principal later).
- **Success envelope:** lists return
  `{ success: true, data, meta: { page, pageSize, total, totalPages } }`;
  details return `{ success: true, data, meta: {} }`.
- **Errors:** `{ success: false, error: { code, message, details } }` —
  400 `VALIDATION_ERROR`, 404 `TENANT_NOT_FOUND` / `NOT_FOUND`, 500 `INTERNAL_ERROR`.
- Full contract: [`docs/api/catalog-api.md`](docs/api/catalog-api.md).

## Frontend data flow

```
component ──▶ React Query hook (features/catalog/hooks)
                 │  hierarchical keys + caching (features/catalog/queries)
                 ▼
          API client      (features/catalog/api — the only fetch boundary)
                 ▼
          /api/* routes   (app/api, thin re-exports)
                 ▼
          controller ──▶ service ──▶ repository ──▶ Prisma ──▶ PostgreSQL
                          (DTOs)      (queries)      (tenant-scoped)
```

Components are never allowed to read catalog data from anywhere else.

## Rendering engine

The preview is a metadata-driven rendering engine
([`features/preview/engine/`](features/preview/engine)) capable of rendering
any vehicle package that conforms to the Chapter-6 metadata contract — no
vehicle-specific logic anywhere in the pipeline.

```
useVehicle() ──▶ RendererProvider ──▶ createRenderContext (immutable input)
                       │                        +
                       └─▶ AssetLoader ─────────┘
                                ▼
                     composeScene ──▶ Scene (declarative layers)
                                ▼
                     VehicleCanvas (render-only Konva adapter)
```

- **Pipeline:** catalog DTO → immutable `RenderContext` → declarative scene in
  the declared layer order (shadow → rear wheels → rear body → front wheels →
  body → mask → highlights → overlay) → render-only Konva adapter.
- **Coordinates:** a 3600×2400 top-left canvas space; wheel positions and the
  stock wheel diameter come from metadata; physics-first wheel geometry is
  computed from the selected tyre profile by `RendererMath` (pure, 100%
  unit-test coverage).
- **Assets:** `AssetLoader` owns loading, preloading, caching, generated
  fallback stand-ins, progress reporting and idle-time lazy loading — and
  never renders.
- Full documentation: [`docs/rendering/engine.md`](docs/rendering/engine.md).

Development assets for the demo vehicle are reproducible:

```bash
npm run assets:generate   # regenerates public/vehicles/toyota/hilux/2025/*.webp
```

## Dealer experience

`/preview` is a tablet-first configurator built from the design-system
primitives in [`components/ui/`](components/ui):

```
Vehicle (search + manufacturer → model → year → colour)
   → Wheels (search + brand → model → finish → fitment filters → size)
   → Tyres  (search + brand → pattern → width → profile → diameter)
   → Save Configuration (localStorage) / Reset / Generate Quote (disabled, Sprint 8)
```

- **Data flow:** React Query → selection panels write only to the Zustand
  PreviewStore → `usePreviewSelection` resolves ids to detail DTOs →
  `RendererProvider` → `VehicleCanvas`. The engine is fed, never modified.
- **Store:** selections persist to localStorage (versioned, migrated) and
  restore across refreshes; saved configurations live behind a
  `ConfigurationStorage` interface ready for the future backend sync.
  Saved configurations can be **recalled (Load), renamed and removed** from
  the Saved dialog; the **Share** button copies a deep link
  (`?config=`, zod-validated and version-pinned) that restores the
  configuration on any device.
- **Catalog reconciliation** keeps restored selections honest: delisted
  vehicles/wheels/tyres (404) and removed colours/finishes/sizes/profiles
  are cleared atomically and explained inline — transient failures never
  destroy a configuration.
- **Consultant profiles** (device-local): the active consultant owns new
  saves, scopes the Saved dialog, and signs the printed handout;
  **Print** produces a clean customer handout (summary — not a quotation).
- **Every catalog dimension is filterable** via pure facet modules:
  manufacturer, model, year, colour, brand, finish, width, diameter,
  offset, bolt pattern.
- Full guide (flow, store, UI components, accessibility, performance):
  [`docs/preview/dealer-experience.md`](docs/preview/dealer-experience.md).

## Project structure

- `app/` — Next.js App Router entry points and API route re-exports
- `server/` — API backend layers (controllers, services, repositories, validators, tenant context)
- `features/catalog/` — frontend catalog data layer (api client, React Query hooks, query keys, types barrel)
- `features/preview/` — preview feature consuming the catalog hooks
  - `engine/` — the metadata-driven rendering engine (math, asset loading, render context, scene composition, layers, provider, canvas)
  - `state/` — PreviewStore (Zustand, persisted), configuration storage (v2, owner-scoped), consultant profiles, share links, validation notices
  - `selection/` — pure facet/filter domain + the vehicle/wheel/tyre/colour/summary panels
  - `hooks/` — preview-facing hooks (debounce, online status, selection seam)
  - `components/` — experience shell, configurator sidebar, canvas panel, quote button
- `components/` — shared UI providers and primitives
  - `ui/` — the design system (button, card, panel, select, combobox, search box, badge, tabs, accordion, skeletons, states, toolbar, sidebar, dialog, popover, toasts)
- `config/` — runtime configuration and environment validation (single source)
- `lib/` — shared utilities (structured logger, `cn` class combiner)
- `types/` — shared domain/API contracts (catalog DTOs, render metadata)
- `prisma/` — schema, migrations and seed
- `vehicles/` — authored vehicle asset packages (`metadata.json` is the vehicle source of truth the seed validates and stores)
- `public/vehicles/` — generated development assets the packages resolve to (`npm run assets:generate`)
- `scripts/` — repository scripts (development asset generation)
- `docs/` — product and engineering documentation (architecture, ADRs, API contracts, rendering engine, dealer experience)
- `tests/` — unit and end-to-end coverage (`tests/helpers/` holds shared fixtures)

See `docs/architecture/` for the full architecture specification and
`docs/reports/` for audit reports. Contribution guidelines are in
[CONTRIBUTING.md](CONTRIBUTING.md).
