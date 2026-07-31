# Pricing Engine

The PricingService (`server/services/pricing-service.ts`) is the single
arbiter of every rand on a quotation. React components never see a price
formula; they send the raw configuration and render the issued result.

## Design goals

- **Deterministic** — identical catalog + configuration + timestamp ⇒
  identical computation. The pure pipeline (`server/quote/totals/compute-totals.ts`)
  is fully unit tested; money arithmetic lives once in the money kernel
  (`server/quote/money.ts`).
- **No placeholder pricing** — an unpriced selection is a hard business
  error (`400` with `details.missingPrices`), never a zero or an invention.
- **Integer cents everywhere** — no floats; basis points for percentages;
  rounding is half-up at the exact step where a rule applies (see below).
- **Open for extension** — wholesale/dealer price lists, promotions and new
  currencies/taxes plug into seams without engine rewrites.

## Inputs

| Input | Source |
| -------------------- | --------------------------------------------------------------------- |
| Default price list   | `PricingRepository.findDefaultPriceList` (active, `isDefault` first)  |
| Wheel unit price     | `findWheelPrice` — **size-priced row wins** over model-wide (null)    |
| Tyre unit price      | `findTyrePrice` — **profile-priced row wins** over model-wide         |
| Labour rate card     | `listLabourPrices` (`FITMENT`/`BALANCING` per-wheel, `ALIGNMENT` per-vehicle) |
| Price rules          | `listActivePriceRules` (per price list, active)                        |
| Discount rules       | `listActiveDiscountRules` (active, inside validity window)             |
| Tax strategy         | `TaxService.resolveTaxStrategy()` — South African VAT by default       |

A missing default price list is a `500` (tenant misconfiguration); a missing
currency registration fails loud through `resolveCurrency`.

## The bill of quantities

`buildBaseItems` (`server/quote/totals/quote-lines.ts`) turns a configuration
into priced items before rules apply:

| Line | Category | Qty | Unit price |
| --------------------------- | -------- | --- | ----------------- |
| Wheels (brand model size — finish) | `WHEEL` | 4 | size- or model-priced |
| Tyres (brand pattern profile)      | `TYRE`  | 4 | profile- or model-priced |
| Fitment                            | `LABOUR`| 4 | `FITMENT` per-wheel   |
| Balancing                          | `LABOUR`| 4 | `BALANCING` per-wheel |
| Alignment                          | `LABOUR`| 1 | `ALIGNMENT` per-vehicle |

Any missing wheel/tyre price or missing labour service type lands in
`missingPrices` and aborts the quote.

## The totals pipeline (ordered, pure)

1. **Line totals** — `quantity × unitAmountCents` (exact integer math).
2. **Price rules** — per matching line, in priority order (then id):
   `PERCENT` adjusts by basis points, `FIXED` adds/subtracts cents once per
   line; rules scope by category and optionally brand. Line totals never go
   below zero.
3. **Subtotal** — the sum of adjusted line totals, floor zero.
4. **Discount rules** — applied to the subtotal in priority order (compounding);
   category-scoped rules reduce only that category's contribution; the total
   discount is capped at the subtotal. Applications are recorded by name +
   amount for the snapshot's `discountsApplied`.
5. **VAT** — `TaxStrategy.calculate(subtotal − discount)` (see Tax Strategy).
6. **Total** — `subtotalCents − discountCents + vatCents`.

### Rounding and basis points

Percentages are basis points (`15%` ⇒ `1500`) applied with half-up rounding
in the money kernel: `round(amount × bp / 10 000)` with `.5` rounding up.
Rounding happens exactly once per rule/tax step — never repeatedly on floats.

**Worked example** (the fixture book used across the test suite):

```
wheels    4 × 100 000   = 400 000
tyres     4 ×  50 000   = 200 000
fitment   4 ×   2 500   =  10 000
balancing 4 ×   1 500   =   6 000
alignment 1 ×   9 500   =   9 500
subtotal                = 625 500
VAT (1500 bp)           =  93 825
total                   = 719 325          → "R 7 193,25" (en-ZA)
```

With a 10% order discount: `62 550` off ⇒ VAT on `562 950` = `84 443`
(half-up at `.5`) ⇒ total `647 393`.

## Presentation order

Computed lines sort by category order (`WHEEL 10`, `TYRE 20`, `ACCESSORY 30`,
`LABOUR 40`) then by description ascending — the printed line order is stable
and identical on screen, in the snapshot and in the database (`sortOrder`).

## Tax strategy

Country-specific tax stays out of the engine behind the `TaxStrategy` seam
(`server/quote/tax/tax-strategy.ts`):

```ts
interface TaxStrategy {
  code: string;             // 'ZA_VAT' — stored on snapshots
  name: string;             // 'VAT (South Africa)' — rendered on documents
  rateBasisPoints: number;  // 1500
  calculate(taxableCents): number;
}
```

A registry maps ISO country codes to strategies (`ZA` today). Adding a
country = adding one strategy + one registry entry — **no engine rewrite**.
The snapshot persists the strategy code/name/rate so a future rate change
never rewrites history.

## Currency abstraction

`lib/money/currency.ts` is the only place currency knowledge exists: a
registry of ISO-4217 entries (`ZAR` first: `en-ZA`, 2 fraction digits) and
`formatCents` which delegates symbol/grouping/decimals to `Intl.NumberFormat`.
Nothing — server or client — hardcodes a currency symbol. The price list's
currency flows into the quote and gates the whole computation; adding a
currency means one registry entry (and the matching price list rows).

## Extension seams (Sprint 9+)

- **Wholesale / dealer price lists** — `PriceList.kind` is already stored and
  carried into the snapshot; the resolver currently picks the active default.
  A dealer-tier resolver swaps in without touching the pipeline.
- **Promotions** — `DiscountRule` (percent/fixed, category-scoped, priority,
  validity window) is fully wired through the pipeline today.
- **Price rules on lists** — `PriceRule` rows adjust lines per
  category/brand before the subtotal.
- **Accessories / packages** — `QuoteLineCategory` already includes
  `ACCESSORY` / `PACKAGE`; `buildBaseItems` is the single place to extend the
  bill of quantities.
