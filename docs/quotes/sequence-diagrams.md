# Quote Flows — Sequence Diagrams

The four server flows of the quote engine plus the client share-link flow.
All diagrams render as [Mermaid](https://mermaid.js.org).

## 1. Issue a quotation (`POST /api/quotes`)

```mermaid
sequenceDiagram
    autonumber
    actor D as Dealer (browser)
    participant UI as QuoteDialog
    participant Q as React Query hook
    participant API as POST /api/quotes
    participant S as QuoteService
    participant P as PricingService
    participant T as TaxService
    participant R as QuoteRepository
    participant DB as PostgreSQL

    D->>UI: Complete 7-field config, enter customer, "Issue quotation"
    UI->>UI: Zod-validate customer (never POSTs invalid drafts)
    UI->>Q: createQuote(request)
    Q->>API: POST /api/quotes
    API->>API: createQuoteSchema.parse (strict boundary)
    API->>S: createQuote(tenantId, input)
    S->>S: requireCompleteConfiguration (400 + missingFields)
    S->>S: fetch vehicle/wheel/tyre DTOs (404 if foreign)
    S->>S: assertCatalogMembership (colour/finish/size/profile)
    S->>P: priceConfiguration(wheel, tyre, at)
    P->>DB: default price list, wheel/tyre prices, labour, rules
    P->>P: buildBaseItems → missing? (400 + missingPrices)
    P->>T: resolveTaxStrategy() (ZA_VAT)
    P->>P: computeTotals (rules → discounts → VAT)
    P-->>S: PricingComputation
    S->>S: pre-generate line ids, build snapshot payload (WV-PENDING)
    S->>R: createQuote(record input)
    R->>DB: BEGIN
    R->>DB: UPDATE Tenant SET quoteSequence += 1 RETURNING
    R->>R: quoteNumber = WV-2026-000001
    R->>DB: upsert Customer, create SavedConfiguration `Quote WV-…`
    R->>DB: INSERT Quote + QuoteLine[] + QuoteSnapshot (number stamped)
    R->>DB: COMMIT
    Note over R,DB: P2002 → rollback (counter too) → retry ≤ 3
    R-->>S: QuoteRecord
    S-->>API: QuoteDetail (deep-frozen)
    API-->>Q: 201 { success, data }
    Q-->>UI: cache detail, invalidate list
    UI-->>D: view mode: summary, lines, totals, share, actions, print doc
```

## 2. Quote history (`GET /api/quotes`)

```mermaid
sequenceDiagram
    actor D as Dealer
    participant H as QuoteHistory
    participant Q as useQuotes(params)
    participant API as GET /api/quotes
    participant S as QuoteService
    participant R as QuoteRepository

    D->>H: Open history / filter status / page
    H->>Q: { page, pageSize, status? }
    Q->>API: GET /api/quotes?…
    API->>API: listQuotesQuerySchema.parse
    API->>S: listQuotes(tenantId, pagination, status)
    S->>R: listByTenant
    R->>R: count + findMany in one tx (tenantId, deletedAt null, status?)
    R-->>S: PaginatedResult<QuoteRecord>
    S-->>API: QuoteSummary[] (newest first)
    API-->>Q: 200 { data, meta }
    Q-->>H: rows (keepPreviousData while paging)
    D->>H: Open → workspace · Duplicate → 5 · Archive → 4
```

## 3. Read a quote (`GET /api/quotes/:id`)

```mermaid
sequenceDiagram
    participant L as Shared link (?quote=uuid)
    participant UI as QuoteDialog (view mode)
    participant API as GET /api/quotes/:id
    participant S as QuoteService
    participant R as QuoteRepository

    L->>UI: consume link once → openWithQuoteId
    UI->>API: GET /api/quotes/:id
    API->>API: entityIdParamSchema.parse (uuid → 400)
    API->>S: getQuote(tenantId, id)
    S->>R: findById(tenantId, id)
    R-->>S: QuoteRecord | null (tenant-scoped → foreign id = null)
    S-->>API: QuoteDetail or 404
    API-->>UI: 200 { data } / 404
    Note over UI: renders summary/pricing/totals/share/actions/print<br/>404 → "Quote not found" state
```

## 4. Archive (`POST /api/quotes/:id/archive`)

```mermaid
sequenceDiagram
    actor D as Dealer
    participant API as POST /api/quotes/:id/archive
    participant S as QuoteService
    participant R as QuoteRepository

    D->>API: Archive
    API->>S: archiveQuote(tenantId, id)
    S->>R: archive(tenantId, id, now)
    R->>R: findFirst (id + tenantId, not deleted)
    alt missing / foreign
        R-->>S: null → 404
    else exists
        R->>R: update status=ARCHIVED, archivedAt
        Note over R: totals/lines/snapshot untouched (immutability)
        R-->>S: QuoteRecord
        S-->>API: 200 QuoteDetail (status ARCHIVED)
    end
```

## 5. Duplicate (`POST /api/quotes/:id/duplicate`)

```mermaid
sequenceDiagram
    actor D as Dealer
    participant API as POST /api/quotes/:id/duplicate
    participant S as QuoteService
    participant P as PricingService
    participant R as QuoteRepository

    D->>API: Duplicate
    API->>S: duplicateQuote(tenantId, id)
    S->>R: findById(tenantId, id)
    R-->>S: QuoteRecord | null → (404)
    S->>S: readSnapshot (null/corrupt → 400)
    S->>S: rebuild request from snapshot (config + parties)
    S->>P: priceConfiguration(…, now)  ← today's price book
    P-->>S: fresh PricingComputation
    S->>R: createQuote (new number, new id)
    R-->>S: QuoteRecord
    S-->>API: 201 QuoteDetail (fresh WV number)
    Note over S,R: source quote untouched; history never rewritten
```
