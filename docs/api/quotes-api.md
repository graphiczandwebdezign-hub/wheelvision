# Quotes API

The commercial surface of WheelVision: a completed preview configuration
becomes a **priced, immutable quotation** here. All money is computed
server-side by the PricingService — clients send the raw configuration, never
prices. Quote content never changes after issue; lifecycle state tracks
complete auditability (`DRAFT`, `ISSUED`, `VIEWED`, `ACCEPTED`, `REJECTED`, `EXPIRED`, `CANCELLED`, `ARCHIVED`).

Base path: `/api/quotes` · Tenant resolution: `x-tenant-slug` header,
falling back to `DEFAULT_TENANT_SLUG` (or globally by quote number for public customer verification).

## Conventions

- **Money** travels as integer cents plus an ISO-4217 `currency` code
  (`totalCents: 719325, currency: "ZAR"`).
- **Success envelopes:** details/mutations → `{ success: true, data, meta: {} }`;
  lists → `{ success: true, data, meta: { page, pageSize, total, totalPages } }`.
- **Error envelope:** `{ success: false, error: { code, message, details? } }`.
- **Quote numbers:** `WV-<issueYear>-<sixDigits>` (e.g. `WV-2026-000001`) —
  sequential, atomic and collision-safe per tenant (see
  [quote domain](../quotes/quote-domain.md)).

## Endpoints

| Method   | Path                         | Purpose                                             | Success |
| -------- | ---------------------------- | --------------------------------------------------- | ------- |
| `POST`   | `/api/quotes`                | Issue a quotation from a completed configuration    | `201`   |
| `GET`    | `/api/quotes`                | Paginated quote history (newest first)              | `200`   |
| `GET`    | `/api/quotes/:id`            | Full quote detail (lines, totals, snapshot, number) | `200`   |
| `GET`    | `/api/quotes/:quoteNumber`   | Public quote fetch by quote number (`WV-...`)       | `200`   |
| `GET`    | `/quote/:quoteNumber`        | Public customer-facing quotation & verification page| `200`   |
| `GET`    | `/api/quotes/:id/status`     | Get quotation status, expiry & immutable history    | `200`   |
| `PATCH`  | `/api/quotes/:id/status`     | Update quotation status (ACCEPTED, REJECTED, etc.)  | `200`   |
| `POST`   | `/api/quotes/:id/duplicate`  | Re-issue from the snapshot at current pricing       | `201`   |
| `POST`   | `/api/quotes/:id/archive`    | Transition to ARCHIVED                              | `200`   |

---

## Public Customer Page (`/quote/:quoteNumber`)
Customers scanning the automatic QR code on any printed or digital quotation are directed to `/quote/:quoteNumber`. The page features:
- Dealer branding and consultant details
- Verification badge (`Verified Authentic`, `Accepted`, `Expired`, `Rejected`, `Cancelled`)
- Validity countdown & expiry tracking
- Vehicle, wheel and tyre snapshot details
- Commercial summary with subtotal, discounts, VAT (15%), and grand total
- Interactive customer action buttons to Accept or Reject quotation
- Complete, immutable status timeline with timestamps and actor tracking

## Status Lifecycle & Immutability
- Supported statuses: `DRAFT`, `ISSUED`, `VIEWED`, `ACCEPTED`, `REJECTED`, `EXPIRED`, `CANCELLED`, `ARCHIVED`.
- **Validity:** Configurable quotation validity (default 30 days). Expired quotations remain viewable, cannot be accepted, and clearly display expiration.
- **Auditability:** Every state transition is recorded in `QuoteStatusHistory` storing `fromStatus`, `toStatus`, `actorName`, and timestamp. History is strictly immutable and never editable.
