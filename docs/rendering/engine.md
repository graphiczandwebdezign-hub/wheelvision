# Rendering Engine

WheelVision's preview is a **metadata-driven rendering engine**: it can render
any supported vehicle package without a single vehicle-specific branch. Every
geometric and layering decision is derived from the vehicle's published render
metadata plus the dealer's current selection — never from constants tied to a
particular make or model.

Source: [`features/preview/engine/`](../../features/preview/engine/).

---

## Render pipeline

```
GET /api/vehicles/:id                       (catalog read model, Sprint 3)
        │  VehicleDetail.renderMetadata     (Zod-validated Chapter-6 package)
        ▼
┌──────────────────────────────────────────────────────────────────────┐
│ RendererProvider  (engine/renderer-provider.tsx)                     │
│  • builds the immutable RenderContext via createRenderContext        │
│  • drives AssetLoader for the assets the metadata references         │
│  • exposes { context, scene, progress, loading, assetErrors }        │
│    through useRenderer(); performs no drawing                        │
└───────────────┬───────────────────────────────────┬──────────────────┘
                │                                   │
                ▼                                   ▼
┌──────────────────────────────┐   ┌──────────────────────────────────┐
│ AssetLoader                  │   │ createRenderContext              │
│ (engine/asset-loader.ts)     │   │ (engine/render-context.ts)       │
│  load / preload / loadLazily │   │  single immutable input object   │
│  cache, fallback, progress   │   │  defaults applied, deep-frozen   │
└───────────────┬──────────────┘   └────────────────┬─────────────────┘
                │  LoadedAsset[]                    │  RenderContext
                ▼                                   ▼
        ┌────────────────────────────────────────────────────┐
        │ composeScene  (engine/scene-composer.ts)           │
        │  pure: (RenderContext, SceneAssets) → Scene        │
        │  layers emitted in SCENE_LAYER_ORDER               │
        │  all geometry via RendererMath                     │
        └───────────────────────┬────────────────────────────┘
                                │  Scene (declarative, adapter-agnostic)
                                ▼
        ┌────────────────────────────────────────────────────┐
        │ VehicleCanvas  (engine/vehicle-canvas.tsx)         │
        │  render only: maps Scene nodes onto a Konva stage  │
        │  no API calls, no calculations beyond viewport fit │
        └────────────────────────────────────────────────────┘
```

Data flows strictly in one direction. The pipeline stages are separated so
each one has exactly one responsibility:

| Module                  | Responsibility it **owns**                                         | Responsibility it must **never** take     |
| ----------------------- | ------------------------------------------------------------------ | ----------------------------------------- |
| `renderer-math.ts`      | Every geometric calculation (pure functions)                       | State, DOM, side effects                  |
| `asset-loader.ts`       | Loading, preloading, caching, fallbacks, progress, lazy scheduling | Rendering                                 |
| `render-context.ts`     | The immutable input contract + defaults                            | Geometry, loading                         |
| `scene-composer.ts`     | Turning context + assets into a declarative scene                  | Fetching, drawing                         |
| `layer-types.ts`        | The scene vocabulary (nodes, layers, order)                        | Logic                                     |
| `renderer-provider.tsx` | Orchestration/state boundary                                       | Drawing                                   |
| `vehicle-canvas.tsx`    | Drawing the scene via a host adapter                               | API calls, calculations, metadata parsing |

---

## RenderContext

`RenderContext` is the **single immutable object the renderer receives**.
Nothing else is consulted at draw time: no globals, no metadata parsing in the
canvas, no vehicle-specific branch anywhere downstream. It is built once per
selection change by `createRenderContext()` and deep-frozen — mutation is a
type error and a runtime `TypeError` in strict mode.

| Field                   | Type                       | Meaning                                                                           |
| ----------------------- | -------------------------- | --------------------------------------------------------------------------------- |
| `vehicle`               | `RenderVehicle`            | Identity only: `id`, `displayName`. No rendering logic hangs off it.              |
| `renderMetadata`        | `VehicleRenderMetadata`    | The validated Chapter-6 package (see _Metadata format_).                          |
| `wheel`                 | `RenderWheel \| null`      | Selected wheel (`id`, `brand`, `model`); `null` = stock look.                     |
| `wheelFinish`           | `string \| null`           | Selected finish identifier (reserved for finish-tinted wheel assets).             |
| `wheelSize`             | `WheelSizeSpec \| null`    | Selected rim size from the wheel detail DTO.                                      |
| `tyre`                  | `RenderTyre \| null`       | Selected tyre (`id`, `brand`, `pattern`).                                         |
| `tyreProfile`           | `TyreProfileSpec \| null`  | Decomposed profile (width mm, aspect ratio, rim inches, …). Drives wheel physics. |
| `scale.viewport`        | `number`                   | Canvas-units per CSS pixel for the current viewport (1 = native).                 |
| `scale.overallDiameter` | `number`                   | External diameter multiplier (1 = stock proportions).                             |
| `camera`                | `CameraState`              | `{ zoom, panX, panY }`; defaults to identity. Extension point for zoom/pan UI.    |
| `selection`             | `SelectionState`           | The ids of everything selected, for downstream (quotes, deep links).              |
| `lighting`              | `LightingConfig \| null`   | **Extension point** — directional light for shadow/highlight synthesis.           |
| `reflections`           | `ReflectionConfig \| null` | **Extension point** — ground-reflection strength.                                 |
| `animation`             | `AnimationConfig \| null`  | **Extension point** — e.g. wheel spin (`rotationForTime` already in math).        |
| `diagnostics`           | `DiagnosticsConfig`        | Dev visualisation toggles (`wheelCenters`, `layerOutlines`), default off.         |

Construction rules (all enforced by `createRenderContext`):

- `vehicle` and `renderMetadata` are required; everything else defaults
  explicitly (`null` selections, identity camera, unit scales, diagnostics off).
- `selection` is derived from the selected objects but can be overridden.
- The result — including nested objects — is deeply frozen.

---

## Layer order

Layer order is **data**, not scattered z-indices. `SCENE_LAYER_ORDER` in
`layer-types.ts` is the single declaration; the composer emits layers in
exactly that order and the canvas draws them in array order. Adding a layer
kind means extending the `SceneLayerKind` union **and** the order constant in
the same change — TypeScript then forces the composer to handle it.

| #   | Layer         | Contents                                | Why here                                                                       |
| --- | ------------- | --------------------------------------- | ------------------------------------------------------------------------------ |
| 1   | `shadow`      | Ground shadow asset                     | Beneath everything.                                                            |
| 2   | `rear-wheel`  | Tyre ring + wheel asset at `rearWheel`  | Sits behind the body and the (optional) rear bodywork.                         |
| 3   | `rear-body`   | Separate rear bodywork section          | Only populated when a package ships `rearBody`; empty for whole-body packages. |
| 4   | `front-wheel` | Tyre ring + wheel asset at `frontWheel` | In front of rear bodywork, still behind the main body.                         |
| 5   | `body`        | Main body asset                         | Transparent wheel arches let the wheels show through.                          |
| 6   | `mask`        | Arch shading mask                       | Depth shading _over_ the wheels inside the arches.                             |
| 7   | `highlights`  | Diagnostic rings/outlines               | Dev-only overlay above the artwork.                                            |
| 8   | `overlay`     | Reserved                                | Future branded overlay (watermarks, badges).                                   |

A layer with no content is emitted as an empty, visible layer — the order
contract never changes shape with the selection.

### Scene nodes

The scene vocabulary is deliberately small and adapter-agnostic:
`image`, `ellipse`, `ring`, `text` (`SceneNode` union). A `Scene` is
`{ width, height, layers }` — a complete, serialisable description of one
frame. Any host that can draw those four node types can render WheelVision
scenes.

---

## Coordinate system

- **Canvas space is 3600 × 2400 px**, origin **top-left**, +x right, +y down.
  Vehicle packages are authored at this resolution (`CANVAS_WIDTH` /
  `CANVAS_HEIGHT` in `renderer-math.ts`).
- Wheel positions (`frontWheel`, `rearWheel`) and `wheelDiameter` are
  expressed in canvas space.
- Body/mask/shadow assets are drawn **contain-fit and centred** on the canvas,
  so a package whose assets are exactly 3600×2400 maps 1:1.
- The host scales, never the composer: `VehicleCanvas` measures its container
  and scales the whole stage by `containerWidth / CANVAS_WIDTH`. Scene
  coordinates therefore stay in canvas space at every viewport size.
- `renderer-math.ts` provides the conversions: `applyCamera` / `invertCamera`
  (zoom + pan), `canvasToViewport` / `viewportToCanvas`, `containScale`,
  `offsetToCenter`, `viewportScaleFor`.

### Wheel physics

Wheel geometry is physics-first, computed from the selected tyre profile
rather than from any asset's pixel size:

```
sidewallMm      = widthMm × aspectRatio / 100
rollingDiameter = 2 × sidewallMm + rimInches × 25.4
outerRadius     = (wheelDiameter / 2) × scale.overallDiameter × rolling/stock
rimRadius       = outerRadius × rimInches × 25.4 / rollingDiameter
```

- Without a tyre selection the stock fitment from metadata is used
  (`rolling = stock`, ratio 1) and the rim falls back to a conventional 0.65
  share of the wheel radius.
- The tyre **ring always renders** (sidewall fraction clamped to 5–90% of the
  radius, default 0.35 without a profile); the wheel asset — when present — is
  scaled so its diameter matches the rim diameter. With no wheel selected, a
  subtle rim stand-in ellipse marks the position.

---

## Metadata format

Vehicle render packages follow the Chapter-6 contract,
`vehicleRenderMetadataSchema` (`types/render-metadata.ts`), validated with Zod
at seed time and again at the API boundary:

```jsonc
// vehicles/{make}/{model}/{year}/metadata.json
{
  "manufacturer": "Toyota",
  "model": "Hilux",
  "year": 2025,
  "frontWheel": { "x": 840, "y": 1375 }, // canvas space, int px
  "rearWheel": { "x": 3090, "y": 1375 },
  "wheelDiameter": 455, // stock wheel diameter, int px
  "bodyImage": "vehicle.webp", // resolved against the package dir
  "maskImage": "mask.webp",
  "shadowImage": "shadow.webp",
}
```

Lifecycle: authored next to the assets → validated and resolved to absolute
public paths by the seed → stored on `VehicleVariant.renderMetadata` → served
by `GET /api/vehicles/:id` → consumed by `RendererProvider` untouched.

Development assets for the demo package are generated (not hand-drawn) by
`scripts/generate_dev_assets.py` — `npm run assets:generate` reproduces
`public/vehicles/toyota/hilux/2025/{vehicle,shadow,mask}.webp`
(3600×2400 RGBA, wheel-arch cutouts exactly at the metadata coordinates).

---

## Asset loading

`AssetLoader` owns every asset concern so no other module thinks about the
network:

- **Caching** — `Map<string, Promise<LoadedAsset>>` keyed by URL; concurrent
  and repeated loads share one in-flight request; failed entries are evicted
  so a retry is possible. `invalidate(url)` drops an entry after re-publish.
- **Fallbacks** — `load()` **never rejects**: failures resolve with a
  generated 512×512 muted panel (border, diagonal cross, truncated filename)
  so a broken URL degrades gracefully instead of taking the scene down.
  Without a DOM canvas a 1×1 stub keeps geometry intact.
- **Progress** — `preload(urls, onProgress)` reports `{ settled, total }`
  after every settle and preserves input order in the results.
- **Lazy loading** — `loadLazily(urls)` warms the cache during idle time
  (`requestIdleCallback`, `setTimeout` fallback).
- **Determinism** — `createImage`, `createCanvas`, `scheduleIdle` (and the
  cache map) are injectable, so tests drive success/failure/timing without
  network or DOM image loading.
- **Never renders** — it returns adapter-agnostic
  `{ source, naturalWidth, naturalHeight }` which the composer consumes.

`RendererProvider` shares one process-wide loader so repeated previews reuse
the warm cache (injectable for tests).

---

## Extension points (future renderer milestones)

These are deliberately typed into the contract now so later sprints extend the
engine **without changing its seams**:

1. **Lighting** (`RenderContext.lighting`) — directional light for synthesised
   shadows/highlights; composer reads it when present, today it is `null`.
2. **Reflections** (`RenderContext.reflections`) — ground-reflection strength
   for showroom presentation.
3. **Animation** (`RenderContext.animation`) — e.g. wheel spin;
   `rotationForTime(rpm, timestampMs)` already exists in the math module.
4. **Camera** — `CameraState` plus `applyCamera` / `invertCamera` /
   `canvasToViewport` / `viewportToCanvas` support zoom & pan UI; the context
   defaults to the identity camera.
5. **Layer kinds** — extend `SceneLayerKind` + `SCENE_LAYER_ORDER` together;
   `rear-body` (split-bodywork packages) and `overlay` (branding) are the
   already-reserved examples.
6. **Node kinds** — extend the `SceneNode` union; the TypeScript exhaustiveness
   in `SceneNodeView` forces the adapter to render it.
7. **Alternate host adapter** — the `Scene` is adapter-agnostic, so an
   `OffscreenCanvas`/worker renderer or a PDF snapshotter can replace (or sit
   beside) the Konva adapter without touching composition.
8. **Testing** — swap drawing hosts freely: every module except the thin
   Konva adapter is unit-testable under jsdom with injected factories.

---

## Guarantees and non-goals

- No hardcoded coordinates, no per-vehicle code paths, no duplicated rendering
  logic — the demo Hilux is rendered by the exact same code path any future
  package will use.
- The canvas never calls APIs and never parses metadata; it consumes only
  `RenderContext`-derived scenes.
- The engine renders **read-only previews**. Dealer selection UX, write APIs,
  admin tooling and authentication are later sprints by design.
