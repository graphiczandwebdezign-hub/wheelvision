# Dealer Experience

The sprint-5 layer turns the preview into a dealer-ready configurator: a
tablet-first interface where a consultant walks a customer from vehicle to
wheels to tyres while the rendering engine reflects every choice instantly.

Composed entirely of the design-system primitives in
[`components/ui/`](../../components/ui/), the Zustand preview store in
[`features/preview/state/`](../../features/preview/state/), and the catalog
React Query layer. **The rendering engine is fed, never modified.**

---

## User flow

```
Customer approaches kiosk
  │
  ▼
Vehicle step ─────────────────────────────────────────────────────────┐
  SearchBox (debounced 150ms, Escape clears)                           │
  Manufacturer → Model → Year (Combobox cascade)                       │
  Variant picker appears while the cascade is ambiguous                │
  Colour chips (toggle; clears when the vehicle changes)               │
  ▼                                                                   │
Wheels step                                                            │
  SearchBox + Rim brand → Rim model                                   │
  Rim finish (catalog finishes of the selected wheel)                  │
  Fitment filters: Diameter / Width / Offset / Bolt pattern            │
  Rim size (filtered size specs, formatted labels)                     │
  ▼                                                                   │
Tyres step                                                             │
  SearchBox + Tyre brand → Tyre pattern                               │
  Width → Profile (aspect ratio) → Diameter (each level consistent)    │
  Exact profile spec resolves → renderer updates proportions           │
  ▼                                                                   │
Save Configuration (localStorage) ── Saved list ── Reset ── Generate
Quote (live since Sprint 8 — enabled once the seven-field selection is
complete, opens the quote workspace; see docs/quotes/quote-domain.md)
```

Every intermediate step writes to the **PreviewStore**; the rendered
vehicle follows instantly because React Query detail DTOs and the store
meet in exactly one place.

---

## Selection flow & data flow

```
React Query (catalog lists + details — the only data source)
        │
        ▼
Selection panels (features/preview/selection/*)
  derive facets from loaded summaries; user picks;
  write ONLY to PreviewStore
        │
        ▼
PreviewStore (Zustand — the only selection state)
        │  id slices: vehicleId, wheelId, wheelFinish, wheelSizeId,
        │  tyreId, tyreProfileId, colour + rendererSettings
        ▼
usePreviewSelection ─ resolves ids → detail DTOs via React Query
        │  memoized seam (one re-render per actual change)
        ▼
RendererProvider → RenderContext → SceneComposer → VehicleCanvas
        (engine untouched)
```

Rules that keep this correct:

- **Dependent resets are enforced by the store**, not scattered through
  components: changing vehicle clears colour; changing wheel clears finish
  and size; changing tyre clears profile. Panels mirror that contract.
- **Fitment consistency is enforced by pure facet modules**
  (`vehicle-facets.ts`, `wheel-facets.ts`, `tyre-facets.ts`) — every filter
  dimension (manufacturer, model, year, colour, brand, finish, width,
  diameter, offset, bolt pattern) narrows the options still offered, and a
  size/profile that stops matching is auto-cleared.
- **Restore mirrors the store into the cascades**: after a browser refresh
  the persisted selection rehydrates from localStorage (versioned, with
  migrations) and each panel reflects it.

---

## Store architecture

### `PreviewStore` (`features/preview/state/preview-store.ts`)

Zustand store — the single client-side owner of:

| Field                                   | Purpose                               |
| --------------------------------------- | ------------------------------------- |
| `vehicleId`, `colour`                   | Selected vehicle + colour             |
| `wheelId`, `wheelFinish`, `wheelSizeId` | Selected wheel, finish, size spec     |
| `tyreId`, `tyreProfileId`               | Selected tyre + resolved profile spec |
| `rendererSettings`                      | Diagnostics toggles for the engine    |

Actions: `selectVehicle`, `selectColour`, `selectWheel`, `selectWheelFinish`,
`selectWheelSize`, `selectTyre`, `selectTyreProfile`, `setDiagnostics`,
`resetConfiguration`.

**Persistence:** `persist` middleware → localStorage key
`wheelvision:preview-store`, **version 1**, with
`migratePersistedState` upgrading older payloads (v0 prototype shapes are
mapped; partial/unknown shapes are normalised over defaults so hydration
can never crash). Only the selection + renderer settings persist — never
actions. A browser refresh restores the full configuration automatically.

### `ConfigurationStorage` (`features/preview/state/configuration-storage.ts`)

The **Save Configuration** flow. LocalStorage-only this phase
(`wheelvision:saved-configurations`, versioned payload, 20-entry cap,
corruption-tolerant reads), behind an interface so the future backend sync
drops in without touching call sites. Storage is injectable for tests.
Supports `save`, `list`, `rename` (inline consult-friendly labelling) and
`remove`.

**Version 2** adds `ownerId`, the consultant profile that saved the
configuration. `list(scope)` filters: `undefined` (omitted) returns
everything (legacy callers), `null` returns the shared showroom pool, a
profile id returns that consultant's list. Version-1 payloads migrate
transparently into the shared pool and re-persist at version 2 on the next
write; reads also deep-coerce stored selections and drop malformed entries,
so nothing restores junk into the preview store.

### `ConsultantProfileStorage` (`features/preview/state/consultant-profiles.ts`)

Named, device-local consultant identities (`wheelvision:consultant-profiles`,
version 1). Profiles exist because kiosks are shared: the active profile
owns new saves, scopes the Saved dialog and signs the printed handout; the
"Showroom" default is the shared, profile-less pool. Operations return
discriminated result unions (`ok` / `reason: empty | duplicate | full |
missing | storage`) — duplicate names are rejected case-insensitively, the
cap is 10 profiles, and storage write failures surface without throwing.
`useConsultantStore` is the zustand mirror every surface subscribes to
(toolbar menu, summary, Saved dialog, print sheet); the storage module stays
the source of truth and the interface is ready for dealer-account sync.

### Catalog reconciliation (`features/preview/selection/configuration-reconciliation.ts`)

Selections can outlive the catalog: a vehicle is superseded, a wheel
discontinued, a finish or profile delisted. `reconcileSelection` is the pure
arbiter — given the current selection, the resolved detail DTOs and
definitive-404 signals, it computes the corrected selection plus
consultant-readable notices:

| Evidence                                           | Correction                                                        |
| -------------------------------------------------- | ----------------------------------------------------------------- |
| Detail DTO loaded; colour/finish/size/profile gone | Clear just that field (a notice names the dropped value)          |
| Detail request 404 (vehicle/wheel/tyre)            | Remove the entity and its dependent fields (one covering notice)  |
| Query pending, network error or 5xx                | Nothing — the selection is preserved and re-evaluated on recovery |
| DTO loaded **and** 404 flag set                    | The DTO wins; membership rules apply                              |

`useConfigurationValidation` runs this continuously in the preview
experience, so all three restore paths (browser persistence, saved
recall, shared link) are covered by one seam. Corrections apply through a
single atomic `restoreConfiguration` write — the corrected selection
reconciles cleanly on the next pass, so there is no write loop. Notices
publish to `useValidationNoticeStore` with the signatures of both the
original and corrected selection; the summary displays them
("Adjusted to the current catalog") until dismissed or until the dealer
changes the configuration, whichever comes first, and one warning toast
announces the adjustment.

---

## Configuration recall & sharing

**Recall.** Saved configurations are managed from the Saved dialog:
**Load** restores the selection atomically (`restoreConfiguration` — one
store write, so the canvas and every panel update together), **Rename**
edits the label inline (Enter commits, Escape cancels without touching the
dialog), **Remove** deletes the entry.

**Share links.** The Share button copies an absolute URL carrying the whole
selection in one `?config=` parameter
(`features/preview/state/configuration-link.ts`): a URL-safe base64 envelope
`{ v, s }` that is **zod-validated, version-pinned and strict-keyed** —
malformed, foreign or future-version links are rejected and simply ignored.
On load, `useConfigurationLinkSync` consumes the link once: a valid payload
restores over the persisted (localStorage) selection, then the parameter is
stripped from the address bar so refreshes stay clean. Clipboard failures
degrade to an error toast — the URL remains copyable from the address bar.

### `useToastStore` (`components/ui/toast-store.ts`)

UI chrome only (notifications) — deliberately separate from the preview
store, which owns configuration state exclusively.

---

## Print handout

**Print** (summary actions, enabled once a vehicle is chosen) sends the
customer handout to the browser print pipeline — local, so it works
offline. The handout (`features/preview/components/print-sheet.tsx`) is a
print-only section rendered alongside the app: `hidden` + `aria-hidden` on
screen, revealed by `@media print` while every piece of app chrome carries
`print:hidden`. Paper output is light-themed via the print media rules in
`globals.css`.

Contents: dealership-facing title, the full resolved specification (the
same shared row builder as the on-screen summary — identical facts, same
order), the active consultant's name (or "Showroom kiosk"), and a timestamp
that refreshes on the browser's `beforeprint` event so paper shows the
actual print moment (`suppressHydrationWarning` covers the one intentional
server/client clock difference). The footer says plainly that the handout
is **not a quotation** — the priced, immutable quotation document now lives
in the Sprint 8 quote workspace (`features/quotes/components/quote-print`),
which supersedes this handout's pricing role while the handout remains the
quick configuration summary. Where a browser offers no print pipeline, the
action degrades to an explanatory toast instead of crashing.

---

## UI component guide

`components/ui/` — import from the barrel `@/components/ui`. Every
interactive primitive ships the same focus ring (`focus-visible:ring-2`),
palette (slate + cyan), and ≥44px primary-touch targets.

| Primitive                   | Responsibility                                                              | Notes                                                  |
| --------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------ |
| `Button`                    | One action look: primary/secondary/ghost/danger × sm/md/lg + loading        | `aria-busy` while loading                              |
| `Card`                      | Content card (title/subtitle/actions + body)                                | Canvas panel uses it                                   |
| `Panel`                     | Labelled section (aria-labelledby)                                          | Sidebar sections                                       |
| `Select`                    | Labelled native select, `null`-friendly                                     | Used for finishes + fitment filters                    |
| `Combobox`                  | ARIA 1.2 editable combobox: type-to-filter, arrows, Enter, Escape, Home/End | Caps rendering at 50 options with a “keep typing” hint |
| `SearchBox`                 | Debounced search (150ms default), Escape clears, clear button               | Feeds facet filtering                                  |
| `Badge`                     | Status pill (neutral/accent/success/warning/danger)                         | Step completion, connectivity                          |
| `Tabs`                      | WAI-ARIA tabs: roving tabindex, arrows/Home/End, panel wiring               | Controlled or uncontrolled                             |
| `Accordion`                 | Toggleable sections (aria-expanded ↔ region)                                | Configurator steps                                     |
| `LoadingSkeleton`           | Decorative placeholders (`aria-hidden`)                                     | Per-panel partial loading                              |
| `EmptyState`                | Friendly empty guidance + optional action                                   | Empty catalogs/searches                                |
| `ErrorState`                | `role=alert` failure block with first-class retry                           | Wired to React Query `refetch`                         |
| `Toolbar`                   | Top action bar with start/center/end slots                                  | `role=toolbar`                                         |
| `Sidebar`                   | Titled aside with scrollable body + pinned footer                           | Configurator rail                                      |
| `Dialog`                    | Modal: Escape/overlay close, focus trap, focus restore, portal              | Saved configurations                                   |
| `Popover`                   | Non-modal anchored panel (Escape/outside close)                             | Supplementary info                                     |
| `ToastViewport` + `toast()` | aria-live notifications, per-kind styling, auto-dismiss, pinned option      | Saves, errors, connectivity                            |

Shared style fragments (`focusRing`, `controlBase`, `surfaceBase`) live in
`components/ui/styles.ts`; class combining in `lib/cn.ts`. No duplicated
styling anywhere in the feature layer.

---

## Layout & responsiveness

- **Tablet landscape (primary):** canvas left (`2fr`), 22rem–1fr
  configuration rail right.
- **Portrait tablet / phone:** rail stacks beneath the canvas; accordion
  keeps steps compact; touch targets ≥44px.
- **Large monitor:** same grid, content max naturally through the sidebar
  column; canvas scales via the engine’s existing viewport fitting.
- Grid: `grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(22rem,1fr)]`.

## Performance

- Store slices are subscribed individually (`usePreviewStore(s => s.x)`) —
  panels re-render only on their own slice.
- `usePreviewSelection` memoizes the resolved seam so the expensive canvas
  subtree re-renders only when actual data changes.
- Facet derivations are memoized (`useMemo` over loaded summaries).
- `VehicleCanvas` stays a client-only dynamic import; combobox lists cap
  rendering at 50 rows (typing narrows further).
- `ColourSelector` is `React.memo`; React Query keeps server data stable
  (structural sharing) so prop identities survive re-renders.

## Error & connectivity handling

- Catalog failures → `ErrorState` per panel with retry (React Query refetch);
  the rest of the UI keeps working (**partial loading**: each panel skeletons
  independently).
- Offline → toolbar badge flips, a pinned toast warns, Save Configuration
  pauses with an explanation; selections persist through whatever happens
  (store → localStorage).
- Save failures (quota/privacy mode) → error toast, configuration stays in
  memory; nothing crashes.

## Accessibility summary

- ARIA 1.2 editable combobox behaviour on cascades; roving-tabindex tabs;
  accordion `aria-expanded`/regions; `role=alert` errors; `aria-live`
  toasts and equivalence of pointer/keyboard paths everywhere.
- Full keyboard map: Tab order natural; Space/Enter activate; arrows move
  combobox/tab selections; Home/End jump; Escape closes dialogs/popovers,
  collapses comboboxes and clears search text (in that containment order —
  SearchBox stops propagation when it clears so a surrounding dialog stays
  open mid-search).
- Every control is labelled (visible label or `aria-label`), focus rings
  are always visible, and while the selection is incomplete the
  now-live Generate Quote button stays disabled and explains itself via
  `aria-describedby` plus visible hint text.
