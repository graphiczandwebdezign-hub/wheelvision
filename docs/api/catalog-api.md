# Catalog API Contract

**Status:** Implemented (Sprint 3) · **Base path:** `/api` · **Format:** JSON

The read catalog is the production data layer consumed by every surface:
the preview renderer, and later the admin portal, kiosk mode, quotes and the
AI pipeline. Frontend consumers use the React Query hooks in
`features/catalog/`; this document is the server-side contract they rely on.

## Tenancy

Every request resolves a tenant before any data access:

1. `x-tenant-slug` request header (explicit), else
2. `DEFAULT_TENANT_SLUG` environment default.

Unknown slugs fail with `404 TENANT_NOT_FOUND`. No id may be addressed
across tenant boundaries: repositories always filter by the resolved tenant.

## Envelopes

List success:

```json
{
  "success": true,
  "data": [ ... ],
  "meta": { "page": 1, "pageSize": 20, "total": 42, "totalPages": 3 }
}
```

Detail success:

```json
{ "success": true, "data": { ... }, "meta": {} }
```

Error (see Sprint 2 contract; `details` is `null` when absent):

```json
{ "success": false, "error": { "code": "_ ", "message": "...", "details": null } }
```

| HTTP | Code               | When                                                                     |
| ---- | ------------------ | ------------------------------------------------------------------------ |
| 400  | `VALIDATION_ERROR` | Query/route params fail Zod validation (`details.fieldErrors` populated) |
| 400  | `TENANT_REQUIRED`  | No tenant identifiable on the request                                    |
| 404  | `TENANT_NOT_FOUND` | Slug does not resolve to a tenant                                        |
| 404  | `NOT_FOUND`        | Entity does not exist within the tenant                                  |
| 500  | `INTERNAL_ERROR`   | Unexpected failure (internals logged, never leaked)                      |

## Endpoints

### `GET /api/vehicles`

Query: `page` (default 1), `pageSize` (default 20, max 100).

`data[]` → `VehicleSummary`:

```json
{
  "id": "uuid",
  "manufacturer": "Toyota",
  "model": "Hilux",
  "variant": "SR5 Double Cab",
  "year": 2025,
  "wheelDiameterMm": 455,
  "colours": ["Silver", "Black"],
  "createdAt": "2026-07-31T00:00:00.000Z",
  "updatedAt": "2026-07-31T00:00:00.000Z"
}
```

### `GET /api/vehicles/:id`

`data` → `VehicleDetail`: everything in `VehicleSummary` (including `year`, the
model-year the dealer flow selects by), plus:

```json
{
  "renderMetadata": {
    "wheelDiameter": 455,
    "frontWheel": { "x": 840, "y": 1375 },
    "rearWheel": { "x": 3090, "y": 1375 },
    "bodyImage": "/vehicles/toyota/hilux/2025/vehicle.webp",
    "maskImage": "/vehicles/toyota/hilux/2025/mask.webp",
    "shadowImage": "/vehicles/toyota/hilux/2025/shadow.webp"
  }
}
```

`renderMetadata` is validated against the Chapter-6 Zod contract server-side;
absent or invalid packages return `null` (invalid packages are logged).

### `GET /api/wheels`

Paginated. `data[]` → `WheelSummary`: `id`, `brand`, `model`,
`finishes: string[]`, timestamps.

### `GET /api/wheels/:id`

`data` → `WheelDetail`: everything in `WheelSummary`, plus:

```json
{
  "sizes": [
    {
      "id": "uuid",
      "size": "17x8",
      "diameterInches": 17,
      "widthInches": 8,
      "boltPattern": "6x139.7",
      "offsetMm": 30,
      "centreBoreMm": 106.1
    }
  ],
  "boltPatterns": ["6x139.7"],
  "offsetsMm": [30, 35],
  "centreBoresMm": [106.1],
  "metadata": { "construction": "cast aluminium" },
  "pricing": null
}
```

`boltPatterns` / `offsetsMm` / `centreBoresMm` are deduplicated from the
sizes. `pricing` is a reserved contract populated by the quote engine
sprint (`{ amountCents, currency }` once live; always `null` until then).

### `GET /api/tyres`

Paginated. `data[]` → `TyreSummary`: `id`, `brand`, `pattern`,
`profiles: string[]`, timestamps.

### `GET /api/tyres/:id`

`data` → `TyreDetail`: everything in `TyreSummary`, but `profiles` becomes
`TyreProfileSpec[]`:

```json
{
  "profiles": [
    {
      "id": "uuid",
      "profile": "205/55 R16",
      "widthMm": 205,
      "aspectRatio": 55,
      "rimDiameterInches": 16,
      "construction": "R",
      "loadIndex": 91,
      "speedRating": "V"
    }
  ],
  "metadata": { "terrain": "highway", "season": "summer" }
}
```

## Versioning

Unversioned while the surface is read-only and additive-only. Contract
changes follow the Chapter-14 rule: documented before implementation, and
additive fields only — never renames or removals without a new version.
