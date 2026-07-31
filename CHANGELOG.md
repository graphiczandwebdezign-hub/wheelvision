# Changelog

## [1.8.0] - 2026-07-31

### Added — the Commercial Quote Engine

WheelVision graduates from configurator to dealership sales platform: a
completed configuration now issues a **priced, immutable, printable and
shareable quotation** — all money computed server-side, all content frozen
at issue.

- **Quote domain core** (`server/quote/`, pure and fully unit tested):
  - `money.ts` — the money kernel: integer cents, basis-point percentages,
    half-up rounding, zero-floored line totals and capped discounts.
  - `tax/tax-strategy.ts` — `TaxStrategy` seam with South African VAT (15%,
    1500 bp) first in an ISO country registry; adding a country never
    rewrites the engine. Strategy code/name/rate persist into snapshots.
  - `totals/quote-lines.ts` — the bill of quantities (4 wheels, 4 tyres,
    fitment + balancing per wheel, alignment per vehicle) with stable
    presentation order by category then description; every missing price is
    collected into `missingPrices` (never a placeholder).
  - `totals/compute-totals.ts` — the deterministic totals pipeline: line
    totals → price rules (category/brand-scoped, priority-ordered) →
    subtotal → discount rules (compounding, category-aware, capped, each
    application recorded) → VAT on the discounted amount → grand total.
  - `quote-number.ts` — `WV-<issueYear>-<sixDigits>` formatting/parsing.
  - `quote-terms.ts` — domain constants (30-day validity, retry budget,
    P2002) plus the six standard T&Cs and the "not an invoice" disclaimer.
  - `quote-builder.ts` — assembles the immutable `QuoteDetail` DTO and the
    versioned snapshot payload (parties, configuration, vehicle/wheel/tyre
    detail + render metadata, asset references, pricing incl. tax, totals).
- **PricingService** (`server/services/pricing-service.ts` +
  `server/repositories/pricing-repository.ts`): resolves the tenant's
  default price list, size/profile-specific wheel/tyre prices (qualified
  rows win over model-wide), the labour rate card, active price/discount
  rules, then runs the pure pipeline. Unpriced selections fail loudly
  (`400` + `missingPrices`); the price list's currency gates the
  computation through `lib/money/currency.ts`, the ISO-4217 registry and
  CLDR (`Intl.NumberFormat`) formatting — no hardcoded symbol anywhere.
- **QuoteService** (`server/services/quote-service.ts`): seven-field
  completeness check (`400` naming `missingFields`), catalog membership
  checks (colour/finish/size/profile belong to their parents), tenant-safe
  entity resolution (404 for foreign ids), line id pre-generation so
  snapshot lines and persisted rows are twins, `duplicate` (re-price from
  the snapshot under a fresh number) and `archive` (the only lifecycle
  write). Snapshot payloads are deep-frozen on the way out.
- **QuoteRepository** (`server/repositories/quote-repository.ts`):
  sequential quote numbers (`WV-2026-000001`…) allocated **atomically
  inside the creation transaction** via the tenant's `quoteSequence`
  counter and backstopped by `@@unique([tenantId, quoteNumber])` — a P2002
  collision rolls the counter back with the transaction and retries (≤3).
  Customer upsert by `(tenantId, email)`, system-managed SavedConfiguration
  anchor named `Quote <number>`, legacy `totalAmount` mirrored.
- **Database (additive migration `20260731150000_quote_domain`)**: new
  `PriceList`, `PriceRule`, `WheelPrice`, `TyrePrice`, `LabourPrice`,
  `DiscountRule`, `QuoteLine`, `QuoteSnapshot` tables; `Quote` gains
  `quoteNumber` (unique per tenant), `consultantName`, `currency`,
  `subtotalCents`, `discountCents`, `vatBasisPoints`, `vatCents`,
  `validUntil`, `archivedAt`; `Tenant.quoteSequence` counter. Zero
  destructive changes.
- **Quote API** (`/api/quotes*`): `POST /api/quotes` (201), `GET
  /api/quotes` (paginated, `status` filter), `GET /api/quotes/:id`,
  `POST /api/quotes/:id/duplicate` (201), `POST /api/quotes/:id/archive` —
  thin controllers over the services, zod at the boundary, standard
  envelopes; tenant scoping throughout (foreign ids are 404s).
- **Quote workspace UI** (`features/quotes/`): typed API client, query
  keys, React Query hooks; compose dialog (resolved package review,
  customer capture with local zod validation, consultant prefill from the
  active profile, `missingPrices` surfacing); immutable view (summary,
  line items, totals, share transports, lifecycle actions); quote history
  (status filter, pagination, open/duplicate/archive per row); share
  payloads (copy-link `?quote=` deep link consumed once by
  `useQuoteLinkSync`, mailto, WhatsApp, clipboard — degrading gracefully);
  print-only professional quotation document (dealer branding, parties,
  package, lines, VAT, totals, validity, six T&Cs, disclaimer, reference,
  QR-code placeholder) via the browser print pipeline.
- **Seeded price book**: default retail price list (ZAR), size-specific
  wheel prices (`17x8` → R 2 950,00, `18x8.5` → R 3 450,00),
  profile-specific tyre prices (`205/55 R16` → R 2 150,00, `225/60 R17` →
  R 2 650,00) and the labour rate card (fitment R 250,00/wheel, balancing
  R 150,00/wheel, alignment R 950,00/vehicle) — the demo Hilux package
  quotes end-to-end.

### Changed

- `/preview`: **Generate Quote** is live — enabled once all seven fields
  are chosen (and online, with an explanatory hint otherwise); opens the
  quote workspace. **View quote history** recalls the tenant's quotations.
  The configuration handout printing defers to the quotation document while
  the quote workspace is open.
- `VehicleDetail` extends additively with `vehicleModelId` (needed for the
  quote's SavedConfiguration FK anchor; no consumer breakage).
- `features/catalog/api/client.ts` adds the `postDetail` mutation path and
  generic query-param forwarding (still the only fetch boundary).
- `TenantRepository.findById` supports the dealer block on quotations.
- e2e dealer flow now walks the seeded catalog into an issued quotation
  (compose → issue → view → history), alongside the save/restore and
  shared-link flows.

### Documentation

- New: `docs/api/quotes-api.md`, `docs/quotes/quote-domain.md`,
  `docs/quotes/pricing-engine.md` (incl. tax strategy + currency
  abstraction), `docs/quotes/sequence-diagrams.md`, `docs/database/erd.md`.
- README gains the quote engine section and refreshed structure;
  ARCHITECTURE maps `server/quote/`, `features/quotes/` and `lib/money/`.

### Tests

- +143 specs, +13 files — **506 passing across 53 files** (up from
  363/40): money kernel, currency registry, tax strategy, totals pipeline,
  pricing service, quote builder/snapshot, repository incl. 50-way
  concurrent numbering + P2002 retry/exhaustion, service orchestration
  (completeness/membership/immutability/duplicate), validators, share
  payloads, workspace store/link, API slice (envelopes/status/validation/
  tenant scoping) and the workspace UI (compose → issue → view/history/
  print/share), plus the live Generate Quote behaviour in the summary.

## [1.7.0] - 2026-07-31

### Added

- **Catalog reconciliation** (`features/preview/selection/configuration-reconciliation.ts` + `features/preview/hooks/use-configuration-validation.ts`): every selection — browser-persisted, recalled or link-restored — is continuously validated against the live catalog DTOs. A definitive 404 removes the delisted vehicle/wheel/tyre (clearing its dependent fields); a loaded DTO whose lists no longer contain the chosen colour, finish, size or profile clears just that field. Pending requests and transient failures (offline, 5xx) never trigger corrections — selections are preserved. Corrections are one atomic `restoreConfiguration` write (no loops), explained inline in the summary ("Adjusted to the current catalog", dismissible, retires automatically when the dealer changes the configuration) and announced once via toast.
- **Consultant profiles** (`features/preview/state/consultant-profiles.ts` + zustand mirror `consultant-store.ts` + toolbar `ConsultantMenu`): named, device-local identities behind a future-sync-ready storage interface (versioned payload, corruption-tolerant, case-insensitive duplicate rejection, 10-profile cap, storage-failure-safe result unions). The active profile owns new saves, scopes the Saved dialog, and signs the printed handout; removing the active profile returns the device to the shared showroom pool. Preview store intentionally untouched.
- **ConfigurationStorage v2**: saved configurations now carry an optional `ownerId`; `list()` accepts a scope (`undefined` = everything (legacy behaviour), `null` = shared pool, profile id = own list). Version-1 payloads migrate transparently into the shared pool; reads are hardened (malformed entries dropped, selections deep-coerced, read failures survive as empty lists). Writes always at version 2.
- **Print handout groundwork** (`features/preview/components/print-sheet.tsx`): a print-only customer handout (hidden on screen, `aria-hidden`, revealed by `@media print` while the app chrome hides itself) with the full resolved spec, consultant attribution, a `beforeprint`-fresh timestamp, and plain language that it is **not a quotation** — the bridge to the Sprint 8 quote document. New **Print** action in the summary (disabled until a vehicle is chosen; degrades to an error toast where printing is unavailable).
- Shared row builder `features/preview/selection/configuration-rows.ts` so the on-screen summary and the handout present identical facts; shared `lib/create-id.ts` and `features/preview/state/key-value-storage.ts` extracted from the storage modules.

### Changed

- Preview experience: toolbar carries the consultant menu; reconciliation and profile hydration run alongside link restore; toasts sit inside the print-hidden chrome.
- Saved-configurations dialog: scope-aware (`ownerScope` + personalised copy) with the shared design-system input treatment.
- Tests: +75 specs (reconciliation matrix, validation hook incl. 404/DTO/transient + no-loop + notice-lifecycle cases, profile storage + store mirror + menu flows incl. limits/duplicates/Escape, storage v2 scoping + migration + hardening, print sheet attribution/disclaimer/timestamp, summary save-stamping + dialog scoping + notice region + print actions) — **363 passing across 40 files** (up from 288/34).

## [1.6.0] - 2026-07-31

### Added

- Configuration recall: the Saved dialog now **loads** saved configurations back into the store — atomically, via a new `restoreConfiguration` store action (one write; canvas and panels update together) — alongside per-entry aria-labelled actions.
- Configuration management: inline **rename** for saved configurations (Enter commits, Escape cancels; labels trimmed, never empty) behind a new `ConfigurationStorage.rename`.
- Shareable deep links: the whole selection serialises into one `?config=` query parameter (`features/preview/state/configuration-link.ts`) — URL-safe base64 of a small versioned envelope, zod-validated, version-pinned and strict-keyed; malformed/foreign/future links are rejected and ignored. **Share** copies the link (clipboard failures degrade to an error toast); `useConfigurationLinkSync` consumes it once on load — link takes precedence over the persisted selection, then the parameter is stripped from the address bar.
- Dealer-flow Playwright suite (`tests/e2e/dealer-flow.spec.ts`): full vehicle→wheels→tyres walk-through, save/restore across reload, disabled quote button, shared-link restore. Runs in CI (needs app + database); not runnable in the unit sandbox.

### Changed

- Saved-configurations dialog extracted to `features/preview/selection/saved-configurations-dialog.tsx` (summary keeps a single responsibility).
- Tests: +25 specs (link codec round-trips/rejections, link sync precedence + URL cleanup, clipboard success/denial, store restore, storage rename, dialog load/rename/remove flows) — **288 passing across 34 files** (up from 263/31).

## [1.5.0] - 2026-07-31

### Added

- Dealer-ready configuration interface at `/preview` — the customer walk-through from vehicle to wheels to tyres, tablet-first, feeding the (untouched) rendering engine instantly.
- Design system at `components/ui/` (17 primitives + shared style fragments, single barrel): Button, Card, Panel, Select, Combobox (ARIA 1.2 combobox pattern: type-to-filter, arrow/Home/End navigation, Enter select, Escape close), SearchBox (debounced), Badge, Tabs (roving tabindex), Accordion, LoadingSkeleton, EmptyState, ErrorState (retry-first), Toolbar, Sidebar, Dialog (portal, focus trap + restore), Popover, and a toast system. All controls labelled, focus-ringed and ≥44px touch-friendly.
- `PreviewStore` (Zustand, `features/preview/state/`): owns only the current selection (vehicle, colour, wheel, finish, size, tyre, profile) + renderer settings. localStorage persistence with explicit version and migration (`migratePersistedState`) — a browser refresh restores the full configuration. Dependent resets are store invariants (vehicle→colour, wheel→finish/size, tyre→profile).
- `ConfigurationStorage` interface with a versioned localStorage implementation (Save Configuration → per-device history capped at 20, corruption-tolerant); injectable and future-backend-ready.
- Selection domain (`features/preview/selection/`): pure facet/filter modules making every catalog dimension filterable (manufacturer, model, year, colour, brand, finish, width, diameter, offset, bolt pattern), plus one-responsibility panels: VehicleSelector (search + cascade + variant picker + colours), WheelSelector (finish + fitment-filtered sizes with auto-clear), TyreSelector (Width → Profile → Diameter cascade resolving the exact profile spec), ColourSelector, ConfigurationSummary (resolved rows, save/saved/reset, disabled Generate Quote with the Sprint-8 hint).
- Preview hooks: `useDebouncedValue`, `useOnlineStatus` (offline badge + pinned toast, save pauses offline), `usePreviewSelection` — the single memoized seam where store ids become React Query detail DTOs for `RendererProvider`.
- Docs: `docs/preview/dealer-experience.md` (flow, state flow, store, UI component guide, a11y, performance); README + ARCHITECTURE updated.
- Testing upgrades: JSX now compiles in Vitest via `@vitejs/plugin-react`; `@testing-library/jest-dom` matchers registered through `tests/setup.ts`; `@testing-library/user-event` for keyboard tests.

### Changed

- `VehicleSummary` now carries `year` (additive) so the year step is real; `VehicleDetail` inherits it. API docs updated.
- `app/preview/page.tsx` hosts the full dealer experience (`PreviewExperience`): toolbar with connectivity badge, canvas panel, configurator sidebar (accordion steps with completion badges), toast viewport.
- Tests: 117 new specs (store/persistence/migrations, configuration storage, all facet domains, every UI primitive incl. keyboard and ARIA behaviour, selection panels end-to-end through the store, summary/save/quote) — **263 passing across 31 files** (up from 146/17).

## [1.4.0] - 2026-07-31

### Added

- Metadata-driven rendering engine at `features/preview/engine/`, replacing the temporary marker-based preview renderer:
  - `renderer-math.ts` — pure geometry: contain-fit/viewport scales, camera transforms, tyre physics (rolling diameter, rim/sidewall fractions) and animation timing. No DOM, no state (100% coverage).
  - `render-context.ts` — `RenderContext`, the single immutable renderer input (vehicle, Chapter-6 render metadata, wheel/finish/size, tyre/profile, scale, camera, selection, diagnostics) with typed, nullable extension points for lighting, reflections and animation; `createRenderContext` applies explicit defaults and deep-freezes.
  - `asset-loader.ts` — owns loading, preloading, URL-keyed promise caching (failed entries evicted for retry), generated 512×512 canvas fallbacks (1×1 stub without a DOM canvas), per-settle progress reporting and idle-time lazy loading. Never renders; factories injectable for deterministic tests.
  - `layer-types.ts` + `scene-composer.ts` — declarative scene model: layers emitted strictly in `SCENE_LAYER_ORDER` (shadow → rear wheels → rear body → front wheels → body → mask → highlights → overlay); physics-first wheel nodes from the selected tyre profile; no hardcoded z-index, no vehicle-specific branches.
  - `renderer-provider.tsx` — orchestration boundary: builds the context from catalog DTOs, drives the shared AssetLoader for metadata-referenced assets with progress/error tracking, memoizes the composed scene.
  - `vehicle-canvas.tsx` — render-only react-konva adapter: consumes the scene via `useRenderer()` — no API calls, no calculations, no metadata parsing.
- Real generated development assets (3600×2400 RGBA WebP with wheel-arch cutouts at the exact metadata coordinates) replacing the 0-byte placeholders: `public/vehicles/toyota/hilux/2025/{vehicle,shadow,mask}.webp`, reproducible via `npm run assets:generate` (`scripts/generate_dev_assets.py`, Pillow, supersampled).
- `docs/rendering/engine.md`: render pipeline, RenderContext contract, layer-order rationale, coordinate system, Chapter-6 metadata format, asset loading and future extension points.
- `@vitest/coverage-v8` for engine coverage reporting.

### Changed

- `VehiclePreview` rewired onto the engine: `RendererProvider` + client-only dynamic `VehicleCanvas`, still sourced exclusively from `useVehicles`/`useVehicle`.
- Tests: 70 new unit tests (renderer-math ×29, scene-composer ×12, asset-loader ×12, render-context ×11, renderer-provider ×6) — 146 total (up from 76). Engine coverage: 99.1% statements / 93.9% branches / 100% functions / 99.1% lines; renderer-math, layer-types and render-context at 100% on all metrics.
- `vitest.config.ts` declares coverage defaults and excludes the Konva host adapter (jsdom cannot parse JSX; it is covered by browser e2e instead).

## [1.3.0] - 2026-07-31

### Added

- Complete read catalog: `GET /api/vehicles/:id`, `GET /api/wheels/:id`, `GET /api/tyres`, `GET /api/tyres/:id` joining the existing list endpoints — all tenant-scoped, thin controllers over repository → service layers.
- Vehicle detail returns the full Chapter-6 rendering package: year plus validated `renderMetadata` (wheel positions, wheel diameter, asset references). Wheel detail returns sizes, deduplicated bolt patterns/offsets/centre bores, metadata and the reserved `pricing` contract. Tyre detail returns decomposed profile specifications (width, aspect ratio, diameter, construction, load index, speed rating).
- Repository completeness: `findById`, `exists` (id-only select) and `count` on every catalog repository, all composed from the same tenant filter — no duplicated query logic.
- Success envelopes: all endpoints return `{ success: true, data, meta }` via a shared `server/utils/api-response.ts`; error envelope unchanged and now typed from the shared contract.
- Frontend data layer at `features/catalog/`: typed API client (the only fetch boundary, mapping error envelopes to `ApiClientError`), six React Query hooks (`useVehicles`, `useVehicle`, `useWheels`, `useWheel`, `useTyres`, `useTyre`), hierarchical query keys with a documented invalidation strategy, and tuned QueryClient defaults (staleTime 60s, gcTime 10m, no 4xx retries, no window-focus refetch).
- Shared API contracts in `types/catalog.ts` and Chapter-6 `vehicleRenderMetadataSchema` in `types/render-metadata.ts` used by server and frontend alike.
- Seed now consumes the authored `vehicles/toyota/hilux/2025/metadata.json` package (validated via Zod, asset paths resolved) instead of restated literals; wheel sizes and tyre profiles seeded with full specifications.
- Catalog API documentation at `docs/api/catalog-api.md`; README gained endpoint tables and the frontend data-flow diagram.
- Tests: repository method suite (list/findById/exists/count × 3 entities), controller-level API tests (success envelopes, tenant isolation, header override, 400/404 paths), API client tests, React Query hook tests, tyre service tests, seed render-metadata assertions. 76 tests total (up from 36).

### Changed

- Preview page now sources its vehicle exclusively from the catalog API (`useVehicles` + `useVehicle`) with loading/error/empty states; wheel markers are sized from metadata (`wheelDiameter / 2`) instead of a hardcoded radius.
- Schema (additive): `VehicleVariant.year` + `renderMetadata`, `WheelModel.metadata`, `WheelSize` gains `wheelModelId` relation plus fitment structure, `TyreModel.metadata`, `TyreProfile` gains decomposed spec fields (migration `20260731140000_extend_catalog_read_model`).
- DTO timestamps are ISO-8601 strings on the wire.
- `PaginationMeta` moved to the shared contract module.

### Removed

- In-memory vehicle data source (`services/vehicles/`), its duplicate type module (`types/vehicle.ts`) and its test. The application now obtains catalog data exclusively from the API.

## [1.2.0] - 2026-07-31

### Added

- Request-scoped tenant resolution via `createTenantResolver` (`server/context/tenant-context.ts`): injectable, config-driven, header-aware (`x-tenant-slug`) with an env-configured default — no hardcoded tenant ids, and ready to source the tenant from authenticated principals when auth lands.
- Real pagination end-to-end: repositories apply `skip`/`take` and fetch `total` + page inside a single transaction; list APIs now return `{ data, meta: { page, pageSize, total, totalPages } }`.
- Documented API error contract: every error response is `{ success: false, error: { code, message, details } }`; `ZodError` now maps to HTTP 400 `VALIDATION_ERROR` with field details instead of HTTP 500.
- Tenant-scoped unique constraints on all catalog natural keys (migration `20260731130000_add_tenant_scoped_unique_constraints`), replacing redundant plain indexes where covered.
- Idempotent seed: every write is an upsert keyed on the new constraints.
- ADR-001 documenting the database platform decision (PostgreSQL via Prisma, hosting-agnostic).
- Tests: tenant resolver, pagination, validation rejection paths, error envelope mapping, repository query composition, seed idempotency, and wheel/vehicle service mapping.

### Changed

- `AppError` now carries `code`, `statusCode`, `message` and `details`.
- Vehicle responses expose the full `colours` array (and `wheelDiameterMm`); wheel responses expose the full `finishes` array — the single-colour/single-finish flattening and its test-only fallback path were removed.
- Services depend on explicit repository port interfaces instead of structural ad-hoc types; `BaseRepository.withTransaction` now runs a real Prisma interactive transaction.
- `DEFAULT_TENANT_SLUG` added to the environment schema and `.env.example`.

## [1.1.0] - 2026-07-31

### Added

- Prisma client now generates automatically on `npm install` via a `postinstall` hook, so fresh clones lint, typecheck, test and build without manual steps.
- Explicit Prisma generation step in CI; CI now installs reproducibly with `npm ci`.
- Playwright `webServer` configuration — end-to-end tests start the application automatically.
- Complete `.env.example` documenting every environment variable.
- `docs/reports/2026-07-31-development-report.md` — full codebase audit and development roadmap.

### Changed

- Consolidated environment validation into a single authoritative Zod schema at `config/env.ts`.
- Consolidated logging into one shared structured logger at `lib/logger.ts` with pluggable transports and development-only `debug` level.
- Expanded `.gitignore` to cover build output, coverage, test reports, TypeScript build info and environment files.
- Untracked previously committed generated files (`.next/`, `tsconfig.tsbuildinfo`); local copies preserved.
- Moved `prisma`, `@types/react` and `@types/react-dom` to `devDependencies`; package version aligned to `1.1.0`.

### Removed

- Duplicate environment validator (`server/validators/env.ts`) and duplicate logger (`server/utils/logger.ts`).
- Unused class-based `ErrorBoundary` component (the App Router `app/error.tsx` boundary remains the active error surface).
- Obsolete unreferenced `scripts/prepare.js`.

## [1.0.0] - 2026-07-31

### Added

- Enterprise-oriented repository structure.
- TypeScript path aliases and typed environment configuration.
- ESLint, Prettier, Husky, lint-staged, Commitlint, Vitest, Playwright, and React Query Devtools.
- Centralised logging, global error boundary, and architecture documentation.
