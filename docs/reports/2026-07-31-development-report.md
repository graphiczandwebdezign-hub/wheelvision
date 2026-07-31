# WheelVision — Development Report & Roadmap

- **Date:** 2026-07-31
- **Audited commit:** `3e8d75e` ("feat: add prisma backend foundation", branch point of `arena/019fb5b6-wheelvision`)
- **Author:** Lead Software Architect / Senior Full-Stack Engineer (incoming audit)
- **Method:** 100% file-by-file repository read (97 tracked source files, 30 architecture documents, all configs, Prisma schema + migration + seed, tests, CI) followed by live verification (`npm install`, `lint`, `typecheck`, `vitest`, `next build`).

---

## 1. Executive Summary

WheelVision today is a **well-tooled foundation scaffold, not yet a product**. The repository has an unusually strong documentation-first culture (a complete 26-chapter architecture specification) and a modern, strict toolchain (Next.js 15, React 19, TypeScript strict, ESLint/Prettier/Husky/Commitlint, Vitest/Playwright, CI). A genuine layered backend exists (controller → service → repository) over a comprehensive 18-model Prisma schema designed for multi-tenancy.

However, the gap between **specified architecture** and **implemented behaviour** is the single dominant theme of this audit:

- The "metadata-driven renderer" is a placeholder: a single inline-SVG client component with a hardcoded wheel radius, wrong layer compositing order, and 0-byte image assets. Konva is a declared dependency but is never imported.
- The "multi-tenant" backend hardcodes a nil UUID as the tenant id in both API controllers, so **the APIs can never return the seeded demo data**. Row-Level Security — claimed in the docs — does not exist in the migration.
- The build is not self-contained: a fresh checkout fails `next build` unless `prisma generate` has been run (verified in a clean sandbox), yet the README states the project "currently builds successfully".
- `.next/` build output (119 files) is tracked in Git.

**Verified baseline (this machine):** `lint` ✅ clean · `typecheck` ✅ clean · unit tests ✅ 4/4 · `build` ❌ fails at page-data collection (Prisma client not generated; generation additionally blocked by network egress to `binaries.prisma.sh` in sandboxes).

**Overall production readiness: 3 / 10** — an excellent foundation skeleton; the product itself is at Sprint 1–2 of the documented 10-sprint plan.

### Feature status vs. vision (Phase 3 comparison)

| Vision capability                                    | Status                      | Evidence                                                             |
| ---------------------------------------------------- | --------------------------- | -------------------------------------------------------------------- |
| Multi-tenant SaaS                                    | ⚠️ Data model only          | `tenantId` on all 18 models; no resolution, no RLS, no auth          |
| Vehicle selection                                    | ⚠️ Hardcoded single vehicle | `services/vehicles/vehicle-data.ts` in-memory array                  |
| Vehicle colours                                      | ⚠️ Schema + seed only       | No API shape for multiple colours, no UI                             |
| Wheel brands / models / finishes                     | ⚠️ Schema + list API        | First-finish-only flattening, no detail routes, no UI                |
| Wheel sizes                                          | ❌ Orphaned table           | `WheelSize` has **no relation** to `WheelModel`                      |
| Tyre profiles                                        | ⚠️ Schema + seed only       | **No `/api/tyres` exists** despite schema models                     |
| Instant rendering                                    | ❌ Placeholder              | Inline SVG, hardcoded radius, broken 0-byte assets, no Konva         |
| Customer management                                  | ⚠️ Schema only              | Model + seed row, zero API/UI                                        |
| Saved configurations                                 | ⚠️ Schema only              | Model + seed row, zero API/UI                                        |
| Quote generation / PDF / printing / email / WhatsApp | ❌ Missing                  | `Quote` model exists but lacks lines/snapshot/currency; no endpoints |
| Asset management                                     | ❌ Missing                  | `Asset` model only; no storage, no upload, no pipeline               |
| Dealer portal                                        | ❌ Missing                  | No dealer concept in code (docs-only)                                |
| Admin portal                                         | ❌ Placeholder              | Static marketing copy at `/admin`, no auth, no workflows             |
| AI vehicle recognition                               | ❌ Docs only                | Chapter 18 only                                                      |
| Subscription billing                                 | ❌ Missing entirely         | Not in schema, docs, or deps                                         |
| Tablet kiosk mode                                    | ❌ Missing                  | —                                                                    |
| Cloud deployment                                     | ❌ Docs only                | No Vercel/Supabase config, Dockerfile, or IaC                        |

_(✅ completed · ⚠️ partial · ❌ missing — nothing in the vision list is fully ✅ today.)_

---

## 2. Architecture Overview

**Intended (per docs):** layered SaaS — Presentation (Next.js App Router) → API → Domain Services → PostgreSQL (Supabase) + R2 storage; a generic Konva renderer driven by a `RenderContext` (`vehicle`, `wheel`, `tyre`, `tenant`); tenant isolation via RLS + service checks.

**Actually implemented:**

```
Browser
 ├─ /                → static marketing page (app/page.tsx)
 ├─ /preview         → VehiclePreview (client component)
 │                      └─ reads IN-MEMORY array  services/vehicles/vehicle-data.ts   ← bypasses API entirely
 ├─ /admin           → static placeholder page
 └─ /api/*
     ├─ health       → server/controllers/health-controller.ts   (liveness only, no DB probe)
     ├─ vehicles     → controller → VehicleService → VehicleRepository → prisma.vehicleVariant
     └─ wheels       → controller → WheelService  → WheelRepository  → prisma.wheelModel
```

- **Routing:** App Router, `typedRoutes` enabled. API routes are 3-line re-exports of controllers — clean.
- **Data flow (API):** `Object.fromEntries(searchParams)` → Zod parse → service (`tenantId`) → repository (`findMany` with `include`) → map to flat DTO → `NextResponse.json({data, meta})`. Request-scoped DI happens at module scope (`const service = new VehicleService(...)` at import time — a shared singleton per lambda; acceptable for stateless services but couples instantiation to import order).
- **Data flow (preview):** **does not use the API at all.** The only "real" data path (React Query is mounted but never used by any component) is an in-memory module. Two parallel "service" trees exist: `services/` (frontend, in-memory) and `server/services/` (backend, Prisma) — same word, different meanings; high confusion risk.
- **State management:** React Query client with defaults; no client UI state store yet (Chapter 13 unimplemented).
- **Mental model:** the repository is the **Phase-1 "Foundation" milestone of its own `implementation_roadmap.md`** plus the first slice of Phase-3 catalog APIs. Everything else in the 26 chapters is unimplemented specification.

---

## 3. Folder Structure Review

| Path                                                 | Verdict                                                                                                                                                                              |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `app/`                                               | ✅ Clean App Router usage; pages thin; error/not-found boundaries exist.                                                                                                             |
| `app/api/*/route.ts`                                 | ✅ Thin re-export pattern — good.                                                                                                                                                    |
| `components/`                                        | ⚠️ Only providers + an **unused** `ErrorBoundary`. No UI primitives despite `@radix-ui/react-slot` dependency.                                                                       |
| `features/preview/`                                  | ✅ Right feature-based instinct; ⚠️ renderer lives as one component, not the modular engine the docs specify.                                                                        |
| `services/` vs `server/services/`                    | ❌ Duplicate concept names; frontend "service" is a hardcoded data module.                                                                                                           |
| `server/`                                            | ✅ Controller/service/repository/middleware/validators/utils separation is textbook. ⚠️ `server/middleware/` collides conceptually with Next.js `middleware.ts`.                     |
| `vehicles/`                                          | ⚠️ Asset-package convention per Chapter 9, but `metadata.json` is **read by no code**, and the sibling `public/vehicles/.../*.webp` are **0 bytes**. Two competing metadata sources. |
| `prisma/`                                            | ✅ schema + one migration + lock + seed. ⚠️ seed not idempotent.                                                                                                                     |
| `docs/`                                              | ✅ 26-chapter spec, master index, implementation roadmap. ⚠️ Chapter 5 schema materially differs from `schema.prisma` (spec drift).                                                  |
| `tests/`                                             | ✅ unit + e2e split; ⚠️ thin, no error-path tests, e2e not wired to a server.                                                                                                        |
| `config/`, `lib/`, `types/`                          | ⚠️ `config/env.ts` and `lib/logger.ts` are **character-identical duplicates** of `server/validators/env.ts` and `server/utils/logger.ts`.                                            |
| `.next/` (tracked), `tsconfig.tsbuildinfo` (tracked) | ❌ 119 build-artifact files committed; `.gitignore` contains only `node_modules`.                                                                                                    |

**Score: 7/10** — strong skeleton, undermined by duplication, dead modules, and tracked build output.

---

## 4. Component Tree

```
app/layout.tsx  (server) ── <QueryProvider> (client)
 ├─ page.tsx            static landing, styled with repeated inline Tailwind
 ├─ preview/page.tsx ── <VehiclePreview> (client)
 │    └─ features/preview/components/vehicle-preview.tsx
 │         (useMemo wheelPositions → inline <svg> layers: rect → body image
 │          → mask image → shadow image → 2× wheel circle groups)
 ├─ admin/page.tsx      static placeholder
 ├─ error.tsx           route error boundary (client)
 ├─ not-found.tsx       404
 └─ globals.css         Tailwind 4 import + global dark styles

components/
 ├─ error-boundary.tsx      class ErrorBoundary — defined, NEVER MOUNTED (dead code)
 └─ providers/
     ├─ query-provider.tsx        QueryClientProvider + devtools panel
     └─ react-query-devtools.tsx  env-gated devtools
```

Findings:

- No design-system primitives (Button/Card/Input); styling is copy-pasted across pages (`rounded-3xl border border-slate-800 bg-slate-900/80` ×5). Radix Slot is installed but unused.
- `VehiclePreview` violates the project's own layering rule: a UI component imports a **data module** directly (`getVehicleById`) instead of the API via a query hook.
- Layer compositing is inverted for realism: body painted **first**, a "mask" then painted **over** it at 0.7 opacity (a mask should clip/reveal, not overlay), the **shadow painted over the car**, and **wheels painted last, on top of the body panels** (wheels must sit behind arches: shadow → wheels → body → mask-as-clip).
- `radius: 120` is hardcoded while the metadata's `wheelDiameter: 455` sits unused — the one value that must be metadata-driven is the one that isn't.
- Accessibility basics present (`lang`, semantic headings, `role="img"` + `aria-label`), but no skip link, no focus-visible styling on the `error.tsx` button, duplicate dark-theme sources (CSS + Tailwind classes).

**Score: 4/10**

---

## 5. API Review

| Endpoint                                                                               | Impl                    | Verdict                              |
| -------------------------------------------------------------------------------------- | ----------------------- | ------------------------------------ |
| `GET /api/health`                                                                      | `{"status":"ok"}`       | ✅ liveness. No readiness/DB probe.  |
| `GET /api/vehicles?page&pageSize`                                                      | controller→service→repo | ⚠️ Multiple contract defects (below) |
| `GET /api/wheels?page&pageSize`                                                        | controller→service→repo | ⚠️ Same defects                      |
| `/api/tyres`, `/api/vehicles/:id`, `/api/wheels/:id`, admin POST/PATCH, `/api/quotes*` | —                       | ❌ All missing (Chapter 14)          |

Defects (verified by reading, consistent with unit-test coverage gaps):

1. **`tenantId` hardcoded** to the nil UUID in both controllers. The seed creates `demo-tenant` with a _random_ UUID ⇒ these endpoints can only ever return `[]` against the seeded DB. This is simultaneously a correctness bug, a hardcoding violation, and a tenancy violation.
2. **Pagination is validated but never applied** — no `skip/take`, no `total`; `meta` just echoes the request params. The API lies about its contract.
3. **Zod errors surface as HTTP 500**, not 400/422: `handleApiError` only maps `AppError`; `ZodError` falls into the generic catch-all. (A one-test gap: no error-handler tests exist.)
4. **Error envelope does not match the spec**: code returns `{"error": "message"}`; Chapter 14 mandates `{"error": {"code", "message"}}`.
5. **No authN/authZ, no rate limiting, no security headers** on any route.
6. `VehicleService` flattens `colours[]` to a single `colour` string (data loss) and contains a singular-`colour` branch that exists **only to satisfy a mocked unit test** (`repository as never`) — test-shaped production code, a design smell pointing to a missing explicit repository port/interface.
7. Services/repositories use structural `*RepositoryLike` interfaces defined per-service — fine as a seed, but the same contract is now implied in three places (service interface, Prisma return type, test mock) with no single source of truth.

Bright spots: Zod-coerced query schemas, layered DI, thin routes, `deletedAt: null` soft-delete filtering, sensible `include` (no N+1).

**Score: 4/10**

---

## 6. Rendering Engine Review

**Spec (Ch. 7/12):** `VehicleCanvas` + `AssetLoader` + `SceneComposer` + `RendererMath`; Konva stage; generic `RenderContext`; scale = metadata wheel diameter ÷ asset wheel diameter; zero hardcoding.

**Actual:** one 89-line component (`features/preview/components/vehicle-preview.tsx`) with inline SVG, no Konva, no asset loader (no load/error handling), no math module, no context object. Wheel radius hardcoded to `120` (canvas is 3600×2400; metadata says 455px diameter — the rendered wheels are less than half the correct size). Layer order physically wrong (see §4). The vehicle image paths point at 0-byte files, so the demo **renders as an empty frame with two small circles**. No tests for any rendering behaviour; `vehicles/toyota/hilux/2025/metadata.json` (the spec'd package format) is not loaded by anything.

**Score: 2/10** — placeholder only; the architecture is documented correctly and merely needs to be built.

---

## 7. Backend Review

✅ Genuinely good foundations:

- Correct tri-layer separation per the "clean separation" rule, with DI-friendly constructors.
- `AppError` + centralized `handleApiError` pattern (needs the Zod/400 mapping fix and error codes).
- Prisma singleton with `globalThis` caching — correct for Next dev hot-reload.
- Soft-delete fields everywhere; repository `include`s avoid N+1.

⚠️/❌ Debt and stubs:

- `BaseRepository.withTransaction()` **runs the operation with no transaction** — a misleading no-op that future developers will trust. Either implement (`prisma.$transaction`) or remove until needed.
- `BaseRepository<T, TCreate, TUpdate>` instantiated as `<PrismaClient, never, never>` — placeholder generics, YAGNI.
- `server/utils/logger.ts` and `lib/logger.ts` duplicated; both are console wrappers (no levels config, no request ids, no structured JSON in prod).
- `server/validators/env.ts` duplicated with `config/env.ts`; the client-bound module (`react-query-devtools.tsx`) imports server-shaped env (works via inlining, but conceptually leaks the server env graph into the client bundle).
- No readiness probe, no graceful shutdown, no connection-pool guidance for serverless (docs target Supabase — PgBouncer/pooled connection string will matter).
- `scripts/prepare.js` is unreferenced dead code (`package.json` uses `"prepare": "husky"`).

**Score: 5/10**

---

## 8. Security Review

| Control                              | State                                                                                                                                          |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Authentication / sessions            | ❌ None                                                                                                                                        |
| Authorization / RBAC                 | ❌ None (`Role`/`UserRole` models unused)                                                                                                      |
| Tenant isolation                     | ❌ App-level only, and hardcoded to a nil UUID; **no RLS policies in the migration** despite docs claiming DB-level isolation                  |
| Input validation                     | ✅ Zod on the two GET endpoints (⚠️ error mapping wrong → 500)                                                                                 |
| Error disclosure                     | ✅ Generic 500 message; error object server-logged only                                                                                        |
| Secrets management                   | ⚠️ `.env.example` incomplete (no `DATABASE_URL`); a default dev DB URL with `postgres:postgres` credentials is committed in code               |
| Security headers / CSP / CORS policy | ❌ None in `next.config.ts`                                                                                                                    |
| Rate limiting                        | ❌ None                                                                                                                                        |
| Dependency hygiene                   | ✅ lockfile committed; ⚠️ 6 unused prod deps (attack surface + bundle weight)                                                                  |
| Audit trail                          | ⚠️ `AuditLog` model only — never written; has `updatedAt`/`deletedAt` (mutable audit log is an anti-pattern); `details` is `String` not `Json` |
| Repo hygiene                         | ❌ `.next/` committed (can leakt build-time env values inlined into chunks); no `.env*` ignore rule                                            |

**Score: 2/10** — acceptable only because nothing is publicly deployed yet.

---

## 9. Performance Review

- ✅ Next 15 + React 19; React Query caching layer mounted; strict build passing.
- ⚠️ Unbounded `findMany` (no pagination application) — fine at seed scale, wrong at catalog scale.
- ⚠️ `next/image` unused; preview renders raw 3600×2400 layers via SVG `<image>` (today: broken 0-byte files; tomorrow: multi-MB assets with no lazy loading, no CDN, no responsive sizing).
- ⚠️ No storage/CDN integration; assets served from the repo `public/` — does not scale beyond demo.
- ⚠️ Default `QueryClient` (0ms staleTime) will refetch aggressively once actually used.
- ✅ Repository queries are index-aligned (`tenantId` indexes exist on every table).

**Score: 5/10**

---

## 10. Database Readiness

**Strengths:** 18 coherent models covering tenant, identity (user/role), stores, the three catalogs (vehicle/wheel/tyre), colours, saved configurations, customers, quotes, assets, audit logs; UUID PKs; FK indexes everywhere; one clean 502-line migration + lock file; a seed that exercises most of the graph.

**Gaps (must close before the features that depend on them):**

- **No RLS** — the documented tenant-isolation mechanism is absent from the migration.
- **No unique constraints** on tenant-scoped natural keys (e.g. `(tenantId, name)` on brands/models are indexes only) → seed is **not idempotent** and re-runs duplicate data.
- `WheelSize` is **not related to `WheelModel`** — sizes can never attach to a wheel as the vision requires.
- `Quote` has **no line items, no configuration snapshot, no currency**; `status` is a free `String` (no enum) — contradicts Chapter 19 (immutable snapshots, `QuoteLine`, `QuoteStatus`).
- **No price fields anywhere** (wheel/tyre price, tenant price overrides) → quotes and billing are unbuildable on the current schema.
- **No publish/version state** on catalog entities — contradicts Chapter 6 (published/immutable versioning) and the admin workflow.
- No subscription/billing models at all.
- `AuditLog.details` String (not Json); audit log is mutable (has updatedAt/deletedAt).
- Docs-vs-code drift: Chapter 5 specifies a different snake_case Supabase schema (`dealers`, `published flags`, `metadata jsonb`) than what Prisma implements.

**Score: 6/10**

---

## 11. SaaS Readiness

Present: multi-tenant schema shape, per-tenant FK indexes, typed env, health endpoint, CI.
Missing: tenant resolution (host/subdomain/header middleware), auth, onboarding, branding/theming, plan limits/entitlements, billing, super-admin, usage metering, per-tenant storage isolation, kiosk mode, deployment config, observability (Sentry/metrics), staging/prod environment strategy, backup/DR posture docs.

**Score: 2/10**

---

## 12. Technical Debt (register)

| #   | Item                                                                                                                                        | Severity | Effort |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------ |
| D1  | `.next/` (119 files) + `tsbuildinfo` tracked; `.gitignore` is a single line                                                                 | 🔴 High  | XS     |
| D2  | Hardcoded nil-UUID tenant in both controllers (APIs permanently empty vs seed)                                                              | 🔴 High  | S      |
| D3  | `next build` requires un-automated `prisma generate` (README claim misleading)                                                              | 🔴 High  | XS     |
| D4  | Duplicated env validator and logger modules (two copies each)                                                                               | 🟠 Med   | S      |
| D5  | Preview renderer: wrong layer order, hardcoded radius, no asset loader, 0-byte assets                                                       | 🔴 High  | M      |
| D6  | Pagination contract not implemented (validated but ignored)                                                                                 | 🟠 Med   | S      |
| D7  | Zod errors → HTTP 500; error envelope ≠ spec                                                                                                | 🟠 Med   | S      |
| D8  | `BaseRepository.withTransaction` no-op masquerading as transaction support                                                                  | 🟠 Med   | XS     |
| D9  | 6 unused runtime deps (`konva`, `react-konva`, `framer-motion`, `@radix-ui/react-slot`, `react-hook-form`; plus `jsdom` only needed in dev) | 🟡 Low   | XS     |
| D10 | Dead code: unused `ErrorBoundary`, unreferenced `scripts/prepare.js`, unused `metadata.json`                                                | 🟡 Low   | XS     |
| D11 | Seed not idempotent; missing unique constraints                                                                                             | 🟠 Med   | S      |
| D12 | Dual `services/` vs `server/services/` meaning; two competing Hilux metadata sources with different path conventions                        | 🟠 Med   | M      |
| D13 | Husky v9 hooks carry deprecated `husky.sh` header; `next lint` legacy eslintrc format (ESLint 9 era); Playwright lacks `webServer`          | 🟡 Low   | XS     |
| D14 | Version drift: package.json `0.1.0` vs CHANGELOG `1.0.0`; `.env.example` missing `DATABASE_URL`                                             | 🟡 Low   | XS     |
| D15 | No UI primitives; repeated inline Tailwind blocks                                                                                           | 🟡 Low   | M      |

**Debt health score: 4/10** — mostly cheap to fix now; expensive to fix later.

---

## 13. Missing Features (build queue, dependency-ordered)

Foundation fixes (debt D1–D15) → Tenant context + auth + RLS → Real metadata-driven renderer (asset loader, math, canvas) → Full catalog read APIs (vehicles/:id, wheels/:id, tyres) consuming DB → Dealer selection UX (vehicle/colour/wheel/finish/size/tyre) with real assets → Saved configurations + customers → Quote engine (schema evolution, PDF, print, share) → Admin publishing (upload → validate → preview → publish, versioning, audit) → Kiosk mode + dealer portal → Billing/subscriptions → AI asset pipeline → Observability/scale hardening.

**Coverage score: 2/10** (vision surface area implemented ≈ 15%, almost all of it schema-level).

---

## 14. Risks

| Risk                                                                                | Likelihood           | Impact | Mitigation                                                                               |
| ----------------------------------------------------------------------------------- | -------------------- | ------ | ---------------------------------------------------------------------------------------- |
| Spec/implementation drift becomes cultural (docs claim RLS/Konva; code has neither) | High                 | Med    | Fix-forward sprints below; docs updated with every PR (Ch. 25 already mandates)          |
| Fresh-clone build failure persists into CI/CD onboarding of new devs                | Certain (verified)   | High   | Sprint 1: `postinstall` + README correction                                              |
| Security bolted on late (auth/RLS retrofit across repositories)                     | High                 | High   | Sprint 6 makes tenant context a first-class dependency _before_ catalog write APIs exist |
| Asset strategy undefined (repo `public/` won't survive real dealers)                | Med                  | High   | Sprint 3 introduces storage abstraction; assets out of Git                               |
| Rendering realism fails stakeholder demo (wrong layering/size)                      | High (visible today) | Med    | Sprint 3                                                                                 |
| Quote schema retrofit breaks early adopters                                         | Med                  | Med    | Evolve schema before any quote write path ships (Sprint 8 precedes usage)                |
| Single-integration target (Supabase) assumed by docs vs plain Prisma in code        | Med                  | Low    | Decision gate ADR in Sprint 2                                                            |

**Risk posture score: 3/10** — no single blocker is hard; the compound effect is what kills momentum.

---

## 15. Recommended Improvements (prioritised)

1. **Sprint 1 hygiene (do first, hours not days):** fix `.gitignore` (add `.next`, `coverage`, `*.tsbuildinfo`, `.env*`, `out`, `dist`, `playwright-report`, `test-results`); `git rm -r --cached .next tsconfig.tsbuildinfo`; add `postinstall: prisma generate`; finish `.env.example`; de-duplicate env/logger; align versions; strip dead code and unused deps; modernise husky hooks; give Playwright a `webServer`.
2. **Make the API honest:** tenant context from config/middleware (never hardcode), real pagination (`skip/take` + `total`), `ZodError → 400` in the spec envelope, error codes on `AppError`, idempotent seed + unique constraints. Add tests that would have caught each bug (error-handler, pagination, tenant scoping).
3. **Build the renderer as documented:** `VehicleCanvas`/`AssetLoader`/`SceneComposer`/`RendererMath` modules under `features/preview`, `RenderContext` contract, wheel scale from `wheelDiameter`, corrected z-order (shadow → wheels behind arches → body → mask as clip), single metadata source (keep `vehicles/**` as the authoring format; serve through the API; delete the in-memory duplicate), generated non-empty dev placeholder assets (not committed post-storage, per asset strategy).
4. **Complete the read catalog before writing anything:** vehicles/:id (full metadata package), wheels/:id, tyres endpoints; response DTOs via Zod; React Query hooks as the only UI data path (honours "never access the database from UI").
5. **Land auth + RLS before write APIs:** decision gate (Supabase Auth per Ch. 15 vs Auth.js) recorded as an ADR; RLS policies migration; middleware tenant resolution; protect `/admin`; RBAC enforcement in services.
6. **Evolve the quote/customer schema before first quote is written** (lines, snapshot, currency, enum status, prices, publish/version flags, immutable `AuditLog` with Json details).
7. **Institutionalise:** PR-time architecture checks (Ch. 25), ADR folder, coverage thresholds for domain logic, e2e in CI once `webServer` exists.

---

## 16. Production Readiness Scorecard

| Area                      | Score /10    | One-line justification                                                    |
| ------------------------- | ------------ | ------------------------------------------------------------------------- |
| 1. Architecture           | 6            | Correct layering + docs; spec drift and bypassed API boundary             |
| 2. Folder structure       | 7            | Feature-first intent; duplication + dead modules + tracked `.next`        |
| 3. Component tree         | 4            | Thin; no primitives; one broken placeholder feature                       |
| 4. API                    | 4            | Both endpoints misleading (tenant/pagination/errors); most domains absent |
| 5. Rendering engine       | 2            | Placeholder contradicting every rendering principle in the docs           |
| 6. Backend                | 5            | Clean tri-layer skeleton with stubs and DRY violations                    |
| 7. Security               | 2            | No auth, no RLS, no headers; Zod validation is the bright spot            |
| 8. Performance            | 5            | Nothing slow yet; nothing proven at scale; broken assets                  |
| 9. Database readiness     | 6            | Broad, migrate-able schema; missing RLS/uniques/enums/prices/publish      |
| 10. SaaS readiness        | 2            | Tenant columns only; every SaaS subsystem absent                          |
| 11. Technical debt health | 4            | Cheap-now register above; several 🔴 items                                |
| 12. Feature coverage      | 2            | ~15% of vision, mostly schema-only                                        |
| 13. Risk posture          | 3            | Compounding but addressable                                               |
| 14. Type safety           | 7            | Strict TS + Zod; `as never` mocks and implicit ports weaken it            |
| 15. Testing               | 3            | 4 passing units; no error-path, repo, renderer, or CI e2e                 |
| 16. Tooling/DX            | 7            | Strong lint/test/CI/hooks; fresh-clone build broken                       |
| **Overall**               | **3.4 / 10** | **Foundation-grade, pre-product**                                         |

_(Scores 15–16 of the requested 16-section format are covered above; sections 15 "Recommended improvements" and 16's sub-areas are scored here. Lint ✅, typecheck ✅, tests ✅ 4/4, build ❌ — all verified on this checkout.)_

---

# Phase 6 — Sprint-Based Development Roadmap

Conventions: complexity **S** ≤ 1 dev-day, **M** ≈ 2–4 dev-days, **L** ≈ 1 sprint-week+. Every sprint is independently deployable to `main` behind the existing CI gate and **never breaks prior green tests**. Fixes are framed as corrections to defective/stub code, not rewrites of working systems.

---

### Sprint 1 — Repository Hygiene & Reproducible Build

- **Objective:** any machine can `clone → install → lint/typecheck/test/build` green, with a clean index.
- **Deliverables:** complete `.gitignore`; untrack `.next/` + `tsconfig.tsbuildinfo`; `postinstall: prisma generate`; `.env.example` completed; env/logger de-duplicated to `config/` + `lib/` single sources; remove `scripts/prepare.js`, unused `ErrorBoundary` (or wire it into layout — default: remove, `app/error.tsx` covers it), unused deps (`konva`, `react-konva`, `framer-motion`, `@radix-ui/react-slot`, `react-hook-form`) — _unless_ the Sprint 3 decision keeps Konva, in which case keep `konva`/`react-konva` only; version alignment to `0.2.0`; husky v9 header cleanup; Playwright `webServer` block; README build instructions corrected.
- **Files affected:** `.gitignore`, `package.json`, `.env.example`, `config/env.ts`, `lib/logger.ts`, `server/validators/env.ts` (deleted → re-export), `server/utils/logger.ts` (deleted → re-export), `scripts/prepare.js` (del), `components/error-boundary.tsx` (del/wire), `playwright.config.ts`, `README.md`, `CHANGELOG.md`, `.husky/*`, and `git rm --cached` on `.next/`, `tsconfig.tsbuildinfo`.
- **Acceptance criteria:** `git ls-files | grep .next` is empty; fresh clone CI green incl. build; `npm run test:e2e` runs against auto-started server; no duplicate module pairs remain (`diff` check); zero references to removed deps.
- **Complexity:** S · **Dependencies:** none. _Decision gate:_ keep-Konva question answered per renderer spike in Sprint 3 planning (default: keep, docs + deps already chose it).

### Sprint 2 — API Correctness, Tenant Context & Seed Integrity

- **Objective:** the two existing endpoints honour their contract; data-layer is safe to build on.
- **Deliverables:** `TenantContext` resolver module (env-driven default slug → DB lookup; request-scoped, injectable — replaces nil UUID without pretending auth exists yet); pagination applied in repositories (`skip/take`, `total` in meta, deterministic order); `handleApiError` maps `ZodError`→400 (and unknown→500) with spec envelope `{error:{code,message}}`; `AppError` gains `code`; unit tests for error-handler, pagination, tenant scoping; idempotent seed (`upsert` throughout) + migration adding tenant-scoped `@@unique` constraints; ADR-001 recorded (Supabase vs vanilla PG decision) per Chapter 25.
- **Files affected:** `server/controllers/*`, `server/middleware/error-handler.ts`, `server/utils/errors.ts`, `server/repositories/*`, `server/services/*`, new `server/context/tenant-context.ts`, `server/validators/query-schemas.ts` (response meta types), `prisma/schema.prisma`, new migration, `prisma/seed.ts`, `docs/adr/001-database-platform.md`, `tests/unit/*` (new).
- **Acceptance criteria:** `GET /api/vehicles` returns seeded rows end-to-end on a seeded dev DB; invalid `page=-1` → 400 with envelope; `page=2&pageSize=1` slices correctly with `total`; seed runs twice without duplicates; no string literal tenant id outside config; prior unit tests still pass.
- **Complexity:** M · **Dependencies:** Sprint 1.

### Sprint 3 — Metadata-Driven Rendering Engine (Core)

- **Objective:** the documented renderer exists: generic, layered, test-correct, driven by a single metadata source — with real visible output.
- **Deliverables:** `features/preview/engine/` modules — `renderer-math.ts` (scale = metadata ÷ asset diameter, pure + unit-tested), `asset-loader.ts` (load/fail states), `scene-composer.ts` (typed layer stack, correct z-order: shadow → wheels → body → mask-as-clip), `render-context.ts` (Chapter 7 contract); `VehicleCanvas` component consuming context; single source of vehicle metadata — `GET /api/vehicles/:id` serves the package (DB row points at authored `vehicles/**` package); `services/vehicles/vehicle-data.ts` in-memory duplicate retired; generated **non-empty** dev placeholder webp assets for Hilux (checked in at small size until storage lands); wheel/tyre selection renders from context inputs (no DB wiring in the canvas).
- **Files affected:** new `features/preview/engine/*`, `features/preview/components/vehicle-canvas.tsx` (+ `vehicle-preview.tsx` refactor into container), `app/api/vehicles/[id]/route.ts` + controller/service/repository methods, `vehicles/toyota/hilux/2025/*`, `public/vehicles/...` (generated assets), `types/vehicle.ts` (aligned with Ch. 6), `tests/unit/renderer-math.test.ts` (+ engine tests), deletion of `services/vehicles/*`.
- **Acceptance criteria:** wheels render at 455px-derived scale at metadata coordinates; missing-asset path shows designed fallback, not a broken frame; renderer contains zero vehicle literals (unit test feeds a synthetic second vehicle); math module coverage ≥ 90%; existing pages unaffected.
- **Complexity:** L · **Dependencies:** Sprint 2 (vehicle detail API), Sprint 1 Konva decision (engine is UI-library-agnostic; SVG retained unless Konva gate = yes).

### Sprint 4 — Complete Read Catalog

- **Objective:** all read paths in Chapter 14 exist and are the only UI data source.
- **Deliverables:** `GET /api/wheels/:id`, `GET /api/tyres` (+`/:id`) with repositories/services/DTO zod schemas; vehicles list includes colours array (not flattened); React Query hooks (`features/catalog/api/*`) with tuned defaults; React Query devtools verified; contract tests.
- **Files affected:** new `app/api/tyres/**`, `server/{controllers,services,repositories}/tyre-*`, `vehicle/wheel` detail routes + `validators`, new `features/catalog/`, `tests/unit/*`.
- **Acceptance criteria:** every list/detail endpoint returns tenant-scoped, paginated, spec-envelope responses; colour arrays intact; UI imports data only via hooks (lint-rule-able boundary documented).
- **Complexity:** M · **Dependencies:** Sprint 2.

### Sprint 5 — Dealer Preview UX (Selection Flow)

- **Objective:** a dealer can select vehicle → colour → wheel (brand/model/finish/size) → tyre and see the live render update, with reset — the MVP loop from Chapter 2.
- **Deliverables:** UI primitives (`Button`, `Select`, `Card` — Tailwind, replacing repeated blocks); selection panel components; `PreviewStore` per Chapter 13 (client state only); wire selection → `RenderContext`; loading/empty/error states; a11y pass (labels, focus-visible, keyboard); basic e2e of the happy path in CI.
- **Files affected:** new `components/ui/*`, `features/preview/components/*` (panels), `features/preview/state/preview-store.ts`, restyled `app/page.tsx`/`preview`/`admin`, `tests/e2e/preview.spec.ts`.
- **Acceptance criteria:** full selection round-trip in browser + e2e green in CI; no hardcoded catalog values in UI; axe-core critical violations = 0 on preview page.
- **Complexity:** M–L · **Dependencies:** Sprints 3, 4.

### Sprint 6 — Authentication & Tenant Isolation

- **Objective:** every request is authenticated and tenant-scoped; isolation enforced at DB level.
- **Deliverables:** ADR-002 auth implementation (per Sprint 2 gate; docs assume Supabase Auth); Next.js middleware tenant resolution (host/subdomain + fallback); sign-in UI + protected routes (`/admin`, write APIs); RBAC (dealer/admin/super-admin) enforced in services via `Role`/`UserRole`; **RLS policies migration** for all tenant tables + Prisma session tenant binding; security headers/CSP in `next.config.ts`; auth e2e.
- **Files affected:** new `middleware.ts`, `features/auth/*`, `app/(auth)/*`, `server/context/*`, every service entry point, `prisma/schema.prisma` + RLS migration, `next.config.ts`, `tests/e2e/auth.spec.ts`.
- **Acceptance criteria:** anonymous users cannot read catalog APIs; tenant A cannot read tenant B rows even via crafted requests (integration test against dev DB with RLS); admin routes 403 for dealer role; headers present (`Report-To`/CSP baseline).
- **Complexity:** L · **Dependencies:** Sprint 2 (tenant context), Sprint 4.

### Sprint 7 — Customers & Saved Configurations

- **Objective:** dealers can persist customers and named configurations.
- **Deliverables:** CRUD APIs + validation for `Customer`, `SavedConfiguration`; UI in preview flow ("save setup"); react-hook-form **introduced here** where forms begin (it returns as a real dependency, not dead weight); audit-log writes for create/update/delete.
- **Files affected:** new `app/api/customers/**`, `app/api/configurations/**`, `server/**` counterparts, `features/configurations/*`, `prisma/seed.ts` extension, tests.
- **Acceptance criteria:** save/reload/delete round-trip; tenant isolation tests; audit rows written with actor id.
- **Complexity:** M · **Dependencies:** Sprint 6.

### Sprint 8 — Quote Engine (PDF, Print, Share)

- **Objective:** end-to-end quote from a saved configuration.
- **Deliverables:** quote schema evolution migration (`QuoteLine`, immutable configuration snapshot JSONB, currency, `QuoteStatus` enum, unit prices on wheel/tyre + tenant overrides); `POST /api/quotes`, `GET /api/quotes/:id`; server-side PDF generation route + print stylesheet; share via copy-link/email/WhatsApp deep link; quote status transitions guarded; e2e happy path.
- **Files affected:** `prisma/schema.prisma` + migration, new `app/api/quotes/**`, `server/**`, `features/quotes/*`, `app/quotes/[id]/*` (print view), tests.
- **Acceptance criteria:** snapshot immutability (editing catalog later doesn't mutate issued quotes); PDF renders config + tenant branding placeholder; totals computed server-side only; schema matches Chapter 19 entities.
- **Complexity:** L · **Dependencies:** Sprint 7.

### Sprint 9 — Admin Publishing Workflow v1

- **Objective:** Chapters 8/9/17 loop: upload → validate → preview → publish, tenant-safe.
- **Deliverables:** storage abstraction (S3/R2-compatible) + local dev adapter; asset upload API with type/size validation; metadata validator enforcing Chapter 6 rules (coordinates ints, positive diameter, asset existence); draft/published state + versioning fields on catalog entities (migration); admin CRUD UI for vehicles/wheels/tyres with drag-drop upload and in-admin preview (reuses `VehicleCanvas`); audit logging of publish actions.
- **Files affected:** new `server/storage/*`, `app/api/admin/**`, `features/admin/*`, `prisma/schema.prisma` + migration, `app/admin/**`, tests.
- **Acceptance criteria:** an admin can publish a new wheel package end-to-end and see it selectable in /preview without code deploy; invalid metadata rejected with precise field errors; published versions immutable.
- **Complexity:** L · **Dependencies:** Sprints 5, 6.

### Sprint 10 — Kiosk Mode & Dealer Portal

- **Objective:** production dealer experience incl. in-store tablet.
- **Deliverables:** `/kiosk` fullscreen route (idle-timeout reset, store selection, lock-down nav); tenant branding (logo/colours from `Tenant` config — schema extension); dealer dashboard (recent quotes, configs); print-friendly quote from kiosk.
- **Files affected:** new `app/kiosk/*`, `features/kiosk/*`, `features/dealer/*`, `prisma` branding fields, e2e.
- **Acceptance criteria:** kiosk resets to a clean state after N seconds idle (configurable per tenant); branding applies without code change; tablet viewport e2e passes.
- **Complexity:** M · **Dependencies:** Sprints 8, 9.

### Sprint 11 — Subscription Billing & Entitlements

- **Objective:** SaaS monetisation gate.
- **Deliverables:** `Plan`/`Subscription` models; Stripe integration (checkout, customer portal, webhook → subscription state); entitlement middleware (seats, vehicle package count, quote volume); super-admin tenant management v1.
- **Files affected:** `prisma/schema.prisma` + migration, `app/api/billing/**`, `features/billing/*`, `app/admin/tenants/*`, webhook tests (mocked Stripe).
- **Acceptance criteria:** expired subscription → read-only mode (test); webhook idempotency; plans config-driven (no hardcoded plan logic in services).
- **Complexity:** L · **Dependencies:** Sprint 6 (identity), Sprint 9 (admin).

### Sprint 12 — AI Asset Pipeline (Internal)

- **Objective:** Chapter 18 first pass — assist, never auto-publish.
- **Deliverables:** quarantine asset area; background-removal + wheel-detection worker (queued job); auto-generated draft metadata → Chapter 6 validator → admin review screen; provenance fields on `Asset`.
- **Files affected:** new `server/ai/*`, `app/api/admin/ai/**`, `features/admin/ai-review/*`, `prisma` asset provenance/quarantine fields, worker + queue config.
- **Acceptance criteria:** uploaded vehicle image yields draft package with detected wheel coordinates awaiting approval; nothing AI-generated reaches published state without human approval (guarded by status enum).
- **Complexity:** L · **Dependencies:** Sprint 9 (storage + publish workflow).

### Sprint 13 — Observability, Performance & Deployment Hardening

- **Objective:** production operations baseline.
- **Deliverables:** structured logging + request ids end-to-end; Sentry (or equivalent) for app + renderer errors; CDN delivery for assets; `next/image`/lazy strategy for preview layers; load test of catalog APIs at target RPS; staging/prod environment separation; preview deployments attached to CI; backup/restore runbook; updated Chapter 21/22 to match reality.
- **Files affected:** `lib/logger.ts` (structured), `instrumentation.ts`, CI workflow, `next.config.ts` (images/headers), infra config, `docs/ops/*`, tests/perf scripts.
- **Acceptance criteria:** p95 catalog API < 200ms at agreed RPS on staging; zero PII in logs; rollback demonstrated; CI deploys previews for PRs.
- **Complexity:** M · **Dependencies:** Sprints 9–11 operational surfaces.

---

### Sequencing logic

Hygiene (1) precedes everything; correctness (2) precedes features; the renderer (3) and read catalog (4) unlock the MVP UX (5); identity/tenancy (6) gates **all writes** (7–9); quotes (8) precede kiosk (10) because kiosk prints quotes; billing (11) and AI (12) are parallelisable after 6/9 respectively; hardening (13) closes the loop before real tenants.

**Sprints map back to the repo's own Chapter 26 plan** (S2≈their Sprint 2, S3–5≈3–6, S9≈7, S6+11≈8, S8≈9, S12≈10) — with hygiene/correctness sprints inserted because the audit found defects their plan assumed away.

---

## Appendix A — Verified command results (2026-07-31)

| Command                          | Result                                                                                                      |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `npm install --legacy-peer-deps` | ✅ (lockfile bit-identical after revert)                                                                    |
| `npm run lint`                   | ✅ 0 warnings/errors                                                                                        |
| `npm run typecheck`              | ✅ pass                                                                                                     |
| `npm test`                       | ✅ 4/4 (3 files)                                                                                            |
| `npx prisma generate`            | ❌ sandbox egress to `binaries.prisma.sh` blocked (environment limitation)                                  |
| `npm run build`                  | ❌ `Failed to collect page data for /api/vehicles` — Prisma client never generated (fresh-clone defect, D3) |

Working tree left **byte-identical** to `3e8d75e` (build artifacts and lockfile reverted).

## Appendix B — Full file inventory read (97 source files)

Every tracked non-`.next` file was read in full: all `app/**`, `components/**`, `features/**`, `server/**`, `services/**`, `config/**`, `lib/**`, `types/**`, `prisma/**`, `vehicles/**`, `tests/**`, `docs/**` (30 files), `.github/workflows/ci.yml`, `.husky/*`, and all 11 root config/doc files.
