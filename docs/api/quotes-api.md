# Quotes API

The commercial surface of WheelVision: a completed preview configuration
becomes a **priced, immutable quotation** here. All money is computed
server-side by the PricingService — clients send the raw configuration, never
prices. Quote content never changes after issue; the only lifecycle write is
`ISSUED → ARCHIVED`.

Base path: `/api/quotes` · Tenant resolution: `x-tenant-slug` header,
falling back to `DEFAULT_TENANT_SLUG` (same convention as the catalog API).

## Conventions

- **Money** travels as integer cents plus an ISO-4217 `currency` code
  (`totalCents: 719325, currency: "ZAR"`). Formatting is a presentation
  concern (the client renders through its currency registry; the API never
  emits currency symbols).
- **Success envelopes:** details/mutations → `{ success: true, data, meta: {} }`;
  lists → `{ success: true, data, meta: { page, pageSize, total, totalPages } }`.
- **Error envelope:** `{ success: false, error: { code, message, details? } }`.
- **Quote numbers:** `WV-<issueYear>-<sixDigits>` (e.g. `WV-2026-000001`) —
  sequential, atomic and collision-safe per tenant (see
  [quote domain](../quotes/quote-domain.md)).

## Endpoints

| Method   | Path                       | Purpose                                             | Success |
| -------- | -------------------------- | --------------------------------------------------- | ------- |
| `POST`   | `/api/quotes`              | Issue a quotation from a completed configuration    | `201`   |
| `GET`    | `/api/quotes`              | Paginated quote history (newest first)              | `200`   |
| `GET`    | `/api/quotes/:id`          | Full quote detail (lines, totals, snapshot)         | `200`   |
| `POST`   | `/api/quotes/:id/duplicate`| Re-issue from the snapshot at current pricing       | `201`   |
| `POST`   | `/api/quotes/:id/archive`  | Transition `ISSUED → ARCHIVED` (content unchanged)  | `200`   |

---

## `POST /api/quotes`

Validates the seven-field configuration is **complete** (business rule, not
schema: nulls are schema-valid but rejected by the service with the missing
fields named), checks **catalog membership** (colour/finish/size/profile
exist on their parent DTOs), prices the package and persists the quote,
lines and immutable snapshot in one transaction.

### Request body

```json
{
  "configuration": {
    "vehicleId": "uuid", "colour": "Silver",
    "wheelId": "uuid", "wheelFinish": "Matte Black", "wheelSizeId": "sz-18x8",
    "tyreId": "uuid", "tyreProfileId": "pf-265-65-17"
  },
  "customer": { "name": "Mrs Nkosi", "email": "nkosi@example.co.za", "phone": "+27 82 555 0100" },
  "consultantName": "Thandi"
}
```

- `configuration` — all seven keys, each `string | null` (schema: `.strict()`).
- `customer.name` — required, 1–120 chars, trimmed.
- `customer.email` — optional/null, valid email when present (lowercased, trimmed).
- `customer.phone` — optional/null, 1–40 chars.
- `consultantName` — optional/null, 1–120 chars.

### Responses

- **`201 Created`** — the issued `QuoteDetail` (schema below) with the
  allocated `quoteNumber` stamped on both the record and the snapshot.
- **`400 VALIDATION_ERROR`** — zod failure, or incomplete configuration with
  `details.missingFields` (labels: `vehicle`, `vehicle colour`, `wheel`,
  `wheel finish`, `wheel size`, `tyre`, `tyre profile`), or membership
  mismatch with `details.problems`, or unpriced selection with
  `details.missingPrices` (`wheel`, `tyre`, `labour:fitment`,
  `labour:balancing`, `labour:alignment`).
- **`404 NOT_FOUND`** — selected vehicle/wheel/tyre not in the tenant catalog.
- **`404 TENANT_NOT_FOUND`** / **`500 INTERNAL_ERROR`** — standard.

## `GET /api/quotes`

Query: `page` (default 1), `pageSize` (default 20, max 100),
`status` (`ISSUED` | `ARCHIVED`, optional).

Returns `QuoteSummary[]` ordered newest-first:

```json
{
  "id": "uuid",
  "quoteNumber": "WV-2026-000001",
  "status": "ISSUED",
  "customerName": "Mrs Nkosi",
  "totalCents": 719325,
  "currency": "ZAR",
  "createdAt": "2026-07-31T10:00:00.000Z",
  "validUntil": "2026-08-30T10:00:00.000Z"
}
```

Unknown query keys are ignored; invalid values → `400 VALIDATION_ERROR`.

## `GET /api/quotes/:id`

`:id` must be a UUID (`400` otherwise). Always scoped to the tenant; a quote
from another tenant is a `404` (never a leak).

## `POST /api/quotes/:id/duplicate`

Rebuilds the request from the source quote's **snapshot** (parties +
configuration), re-prices at the current price book, and issues a **new**
quote with a fresh sequential number. `404` when the source is missing; `400`
when the snapshot is absent/corrupt (legacy rows) or repricing fails (e.g. a
since-removed price book entry → `details.missingPrices`).

## `POST /api/quotes/:id/archive`

Idempotent lifecycle write: sets `status: "ARCHIVED"` + `archivedAt`.
Totals, lines and snapshot are untouched (immutability invariant). `404`
when missing/foreign.

## QuoteDetail schema

```json
{
  "id": "uuid",
  "quoteNumber": "WV-2026-000001",
  "status": "ISSUED",
  "customerName": "Mrs Nkosi",
  "customer": { "name": "Mrs Nkosi", "email": "nkosi@example.co.za", "phone": "+27 82 555 0100" },
  "consultantName": "Thandi",
  "dealer": { "id": "tenant-uuid", "name": "Demo Tenant", "slug": "demo-tenant" },
  "currency": "ZAR",
  "totals": {
    "subtotalCents": 625500,
    "discountCents": 0,
    "vatBasisPoints": 1500,
    "vatCents": 93825,
    "totalCents": 719325,
    "currency": "ZAR"
  },
  "lines": [
    {
      "id": "uuid", "category": "WHEEL", "description": "Rota R5 18x8.5 — Gloss Black",
      "quantity": 4, "unitAmountCents": 345000, "totalCents": 1380000,
      "sortOrder": 10, "metadata": { "finish": "Gloss Black", "sizeId": "…" }
    }
  ],
  "snapshot": { "version": 1, "quoteNumber": "WV-2026-000001", "…": "see quote-domain.md" },
  "createdAt": "…", "updatedAt": "…", "validUntil": "…", "archivedAt": null
}
```

- `lines` are presentation-ordered (category order `WHEEL(10) TYRE(20)
  ACCESSORY(30) LABOUR(40)`, then description) and carry the same ids that
  appear inside `snapshot.pricing.lines` — snapshot and rows are twins.
- `vatBasisPoints`: 15% ⇒ `1500`. `totalCents = subtotalCents − discountCents + vatCents`.

## What is deliberately absent (Sprint 8 scope guard)

No invoicing, payments, subscriptions, billing or PDF generation anywhere in
this API. Printing is the browser's print pipeline over the on-screen
quotation document (a QR verification block is a documented placeholder).
