# Disaster-Proof Checkpoint

> **Purpose:** if this workspace or sandbox is ever lost, this file is the
> single source needed to (a) re-establish a working environment, (b) know
> exactly where every piece of work lives, and (c) re-onboard any human or
> agent session without re-learning anything the hard way.
> **Written:** 2026-07-31 (Africa/Johannesburg) · **Project:** WheelVision
> (`graphiczandwebdezign-hub/wheelvision`) · **Branch of record:** `main`.
> Update this file at every milestone — it is the project's durable memory.

---

## 1. TL;DR — nothing important exists only here

Everything of value is on **GitHub `main`**. This sandbox contains nothing
that main lacks (three local commits exist only as _byte-level duplicates_ of
web-editor commits already landed — see §3). If this sandbox vanishes:
`git clone` main and run the environment ritual in §4. Recovery time < 10 min.

## 2. Source of truth — last known state (2026-07-31, ~15:30 SAST)

| Ref                                  | Last known commit                                                     | Content                                        |
| ------------------------------------ | --------------------------------------------------------------------- | ---------------------------------------------- |
| `main` (GitHub)                      | merge `7f6eb8f` (PR #1) **plus** user web-editor commits listed below | Sprints 1–8 complete + hardened CI + green e2e |
| `arena/019fb5b6-wheelvision` (local) | `2f9843d`                                                             | dev branch; safe to delete/recreate            |

### Commits known to be on `main`

1. `3e8d75e` — base ("prisma backend foundation", Sprints 1–3).
2. `5326c22`, `f2bee40`, `02ae5f6`, `8613ce2` via **PR #1** (merged 2026-07-31,
   merge commit `7f6eb8f`):
   - Sprint 4–7 dealer experience (recovered after sandbox rollback #1),
   - base CI restore,
   - **Sprint 8 commercial quote engine** (server-side pricing, immutable
     snapshots, `WV-<year>-<seq>` numbering, quote workspace UI, `/api/quotes*`),
   - quote-repository fix for real Prisma 6 types (CI typecheck).
3. **User-landed via GitHub web editor** (SHAs unknown to this sandbox, but
   content known — the four pastes below):
   - `.github/workflows/ci.yml` → hardened: `npm ci --legacy-peer-deps`,
     explicit `npx prisma generate`, `DATABASE_URL` env, **`e2e` job**
     (Postgres 16 service → `db:deploy` → `db:seed` → Playwright).
   - `tests/e2e/dealer-flow.spec.ts` → exact-match locator helpers
     (equivalent of local `67fca21`).
   - `features/preview/components/configurator-sidebar.tsx` → ColourSelector
     single-mount (equivalent of local `148c27e`).
   - `tests/e2e/dealer-flow.spec.ts` → save-toast copy, 45 s cold-compile
     budgets, Escape-close (equivalent of local `2f9843d`).

### CI last known state

- Workflow `CI` on `main`: jobs `quality` + `e2e` — **both green**; e2e
  reported `4 passed` incl. quotation issuance end-to-end.

## 3. Stranded local commits (safe to discard — content is upstream)

| Local SHA | Upstream equivalent                                                         |
| --------- | --------------------------------------------------------------------------- |
| `67fca21` | web-editor commit to `tests/e2e/dealer-flow.spec.ts` (exact locators)       |
| `148c27e` | web-editor commit to `features/preview/components/configurator-sidebar.tsx` |
| `2f9843d` | web-editor commit to `tests/e2e/dealer-flow.spec.ts` (toast/timeout/Escape) |

## 4. Environment ritual (run after any sandbox reset / fresh checkout)

```bash
npm install --ignore-scripts          # network OK for npm, but postinstall
                                      # (prisma generate) FAILS offline here
npm rebuild @prisma/client            # creates the "not initialized" stub →
                                      # typecheck+lint+vitest all pass
```

To reproduce CI typecheck against **real generated Prisma types** (catches
what the stub hides), generate the client with dummy engine paths (engine
downloads are blocked; generation itself needs no engine):

```bash
PRISMA_SCHEMA_ENGINE_BINARY=/usr/bin/true \
PRISMA_QUERY_ENGINE_BINARY=/usr/bin/true \
PRISMA_QUERY_ENGINE_LIBRARY=/usr/bin/true \
./node_modules/.bin/prisma generate   # use ./node_modules/.bin — see hazards
npm run typecheck
```

## 5. Verification gates (what "green" means here)

| Gate  | Command             | Expected                                                                                                                                                                                                     |
| ----- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Lint  | `npm run lint`      | `✔ No ESLint warnings or errors`                                                                                                                                                                             |
| Types | `npm run typecheck` | silent exit 0 (strict TS)                                                                                                                                                                                    |
| Unit  | `npm test`          | **53 files / 506 tests passing** (Sprint 8 era)                                                                                                                                                              |
| Build | `npm run build`     | compiles clean, then stops at "Failed to collect page data … @prisma/client did not initialize yet" — **expected offline boundary** (no engines in sandbox); on CI, with `prisma generate`, the build passes |
| e2e   | CI-only job         | `4 passed` (needs Postgres + browsers, hence GitHub-hosted)                                                                                                                                                  |

## 6. Hazards catalog (learned the hard way — do not re-learn)

1. **Sandbox rollbacks**: twice, local git refs were reset to an old commit
   while the working tree survived. Recovery = re-anchor branch to the
   pushed ref (`git fetch` + `git update-ref` + `git reset`), verify
   `git status` clean. _Rule: push early, push often._
2. **`node_modules` does not persist between session turns** — rerun the
   ritual in §4 first.
3. **`npx prisma` leaks the wrong CLI**: with no local binary, npx pulls
   prisma@7 (engine hash mismatch, can wipe `.prisma/client`). ALWAYS use
   `./node_modules/.bin/prisma`.
4. **`binaries.prisma.sh` is egress-blocked** — use the dummy `PRISMA_*_BINARY`
   env trick for client generation; `--no-engine` still tries to download the
   schema engine, don't bother.
5. **GitHub Actions log blobs are egress-blocked** from this sandbox
   (`results-receiver…/blob.core.windows.net` EOF): `gh api …/jobs/:id --jq`
   for step conclusions works; full logs must be read on github.com by the user.
6. **The GitHub App token cannot push workflow files** (`workflows`
   permission missing). All `.github/workflows/*` changes land via the
   user's web-editor commits or a local clone with user credentials. Pending
   user action: approve the app permission request, then agent sessions can
   push workflow changes again.
7. **Portal copy/paste can mangle smart quotes** — prefer `\u201c/\u201d`
   escapes in regexes, or paste-complete-file replacements (never edits).
8. **Next dev cold-compiles routes on first hit** — e2e assertions that
   depend on a first API hit carry **45 s budgets** in the spec.
9. **Playwright `name` matching is substring+case-insensitive** — the dealer
   flow spec pins `exact: true` everywhere (`combobox`/`option`/`field`
   helpers). Never substring-match accessible names here.
10. **CI annotations**: Node 20 deprecation for actions (cosmetic).

## 7. Project state (what exists, where it's documented)

- **Version 1.8.0** · Sprints 1–8 shipped.
- Catalog stack: `/api/vehicles|wheels|tyres[/:id]`, tenant resolver,
  typed client (`features/catalog/api` = the only fetch boundary).
- Preview: rendering engine (`features/preview/engine/` — fed, never
  modified), selectors with auto-resolve, save/restore/share/print handout,
  consultant profiles.
- **Quote engine**: `server/quote/` (money kernel, TaxStrategy ZA VAT 15%,
  totals pipeline, builder/snapshot, numbering), `PricingService`,
  `QuoteService`, `QuoteRepository` (atomic numbering in-transaction),
  `/api/quotes*` (create/list/detail/duplicate/archive),
  `features/quotes/` workspace (compose/view/history/share/print doc).
- Docs map: `README.md` (overview), `ARCHITECTURE.md`,
  `docs/api/{catalog-api,quotes-api}.md`, `docs/quotes/{quote-domain,
pricing-engine,sequence-diagrams}.md`, `docs/database/erd.md`,
  `docs/preview/dealer-experience.md`, `CHANGELOG.md`, `docs/architecture/`
  (ADRs/book), `docs/reports/` (sprint reports).

## 8. Outstanding items (next session's queue)

1. **GitHub workflows permission** (user approves app permission request) →
   then re-apply remaining CI hardening from the sandbox: Playwright browser
   cache, Node/action deprecation cleanups.
2. **Sprint 9 candidates** (from the Sprint 8 report): QR verification +
   public customer quote view, `ACCEPTED/EXPIRED` statuses with validity
   handling, dealer-tier price lists (`PriceList.kind` resolver), promotions
   admin over the wired `DiscountRule`/`PriceRule` engine, PDF evaluation,
   quote observability via `AuditLog`.
3. Start next work in a **fresh Arena coding session** (this session's
   remote access closed when PR #1 merged).

## 9. Where the memory lives

- **This file** (`CHECKPOINT.md` at repo root) — land it on `main` and keep
  updating it; it survives any sandbox loss.
- `docs/reports/2026-07-31-development-report.md` — the day-to-day narrative.
- The conversation checkpoints in Arena sessions are ephemeral; the repo is
  the memory that lasts.
