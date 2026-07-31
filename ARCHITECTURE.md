# WheelVision Architecture

## Overview

WheelVision is a metadata-driven preview platform for wheel and tyre configuration aimed at dealers and tyre shops. The architecture prioritises scalability, tenant isolation, and a renderer that does not depend on hardcoded vehicle logic.

## Principles

- Metadata-first rendering with a generic scene composition engine.
- Shared database architecture with database-level tenant isolation via RLS.
- Strong TypeScript boundaries and runtime validation.
- Modular feature-first folder structure for long-term maintainability.

## Structure

- app/: Next.js App Router entry points and API route re-exports.
- server/: API backend — controllers, services, repositories, validators, middleware and tenant context.
- features/catalog/: frontend data layer (typed API client, React Query hooks, query keys) — the only component-facing data path.
- features/preview/: preview feature built on the catalog layer.
  - engine/: the metadata-driven rendering engine (renderer-math, asset-loader, render-context, scene-composer, layer-types, renderer-provider, vehicle-canvas) — see docs/rendering/engine.md.
  - state/: PreviewStore (Zustand, localStorage-persisted) and configuration storage.
  - selection/: pure facet/filter domain + dealer selector panels — see docs/preview/dealer-experience.md.
  - hooks/: preview-facing hooks (debounce, online status, selection seam).
  - components/: experience shell, configurator sidebar, canvas panel, quote button.
- components/: shared UI primitives and providers.
  - ui/: the design system used by the dealer experience.
- lib/: shared utilities (structured logger).
- config/: runtime configuration and environment validation (single source).
- types/: shared domain and API contracts (catalog DTOs, Chapter-6 render metadata).
- prisma/: schema, migrations and idempotent seed.
- vehicles/: authored vehicle asset packages (seed-time source of truth).
- docs/: product and engineering documentation (architecture, ADRs, API contracts, rendering engine).
- tests/: unit and end-to-end coverage.

## Rendering engine

The preview renderer is a modular, metadata-driven engine
(features/preview/engine/, documented in docs/rendering/engine.md):

- One immutable input: RenderContext (vehicle + Chapter-6 render metadata +
  wheel/tyre selection + scale/camera + typed extension points for lighting,
  reflections and animation), deep-frozen at construction.
- One declarative scene model: layers are emitted in the declared
  SCENE_LAYER_ORDER (shadow → rear wheels → rear body → front wheels → body →
  mask → highlights → overlay) — order is data, never z-indices.
- Pure seams: RendererMath holds every geometric rule (wheel physics from the
  tyre profile), SceneComposer maps context + assets to a scene, and
  VehicleCanvas is a render-only adapter over react-konva. AssetLoader owns
  loading, caching, fallbacks, progress and lazy scheduling — and never draws.
- No vehicle-specific logic anywhere: any package conforming to the Chapter-6
  metadata contract renders through the same code path.

## Dealer experience

The dealer configurator (docs/preview/dealer-experience.md) layers on top of
the catalog + engine without touching either:

- components/ui/: a single design system (17 primitives + shared style
  fragments) — every control is keyboard-accessible, labelled, focus-ringed
  and ≥44px touch-friendly; no feature duplicates styling.
- features/preview/state/: the PreviewStore (Zustand) owns only the current
  selection (vehicle, colour, wheel, finish, size, tyre, profile) plus
  renderer settings; it persists to localStorage with versioned migrations
  (refresh restores everything). Saved configurations sit behind a
  ConfigurationStorage interface (localStorage now, backend sync later).
- features/preview/selection/: pure facet/filter domain modules (every
  dimension filterable: manufacturer, model, year, colour, brand, finish,
  width, diameter, offset, bolt pattern) plus one-responsibility selector
  panels.
- Data flow: React Query → selection panels → PreviewStore →
  usePreviewSelection (single memoized seam) → RendererProvider → canvas.
  Dependent resets (vehicle→colour, wheel→finish/size, tyre→profile) are
  store invariants.
