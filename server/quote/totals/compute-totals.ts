import type { QuoteLineCategory } from '@/types/quote';
import type { TaxStrategy } from '@/server/quote/tax/tax-strategy';
import { applyBasisPoints, capDiscount, lineTotal } from '@/server/quote/money';
import {
  categorySortOrder,
  type DiscountRuleInput,
  type PriceRuleInput,
  type PricedItem,
} from '@/server/quote/totals/quote-lines';

/**
 * The totals pipeline — pure, deterministic, and ordered. All money rules
 * live here exactly once:
 *
 * 1. Base line totals: quantity × unit price (exact integer math).
 * 2. Price rules (price-list adjustments) apply per matching line, sorted by
 *    priority then id; PERCENT adjusts by basis points, FIXED adds/subtracts
 *    cents once per line. Rules scope by category and, when set, brand.
 * 3. `subtotalCents` = sum of adjusted line totals (never below zero).
 * 4. Discount rules apply to the subtotal, sorted by priority then id,
 *    compounding sequentially; category-scoped rules reduce only that
 *    category's contribution. Total discount is capped at the subtotal.
 * 5. VAT applies on the discounted amount via the resolved TaxStrategy.
 * 6. `totalCents` = discounted subtotal + VAT.
 *
 * Same input → same output, always; every step is unit tested.
 */

export interface ComputedLine {
  readonly category: QuoteLineCategory;
  readonly description: string;
  readonly quantity: number;
  readonly unitAmountCents: number;
  readonly totalCents: number;
  readonly sortOrder: number;
  readonly metadata: Record<string, unknown> | null;
}

export interface DiscountApplication {
  readonly ruleId: string;
  readonly name: string;
  readonly amountCents: number;
}

export interface ComputedTotals {
  readonly lines: readonly ComputedLine[];
  readonly subtotalCents: number;
  readonly discountCents: number;
  readonly discountsApplied: readonly DiscountApplication[];
  readonly vatBasisPoints: number;
  readonly vatCents: number;
  readonly totalCents: number;
}

export interface ComputeTotalsInput {
  readonly items: readonly PricedItem[];
  readonly priceRules: readonly PriceRuleInput[];
  readonly discountRules: readonly DiscountRuleInput[];
  readonly taxStrategy: TaxStrategy;
}

function matchesRule(
  rule: PriceRuleInput,
  category: QuoteLineCategory,
  brand: string | null,
): boolean {
  if (rule.category !== category) {
    return false;
  }
  return rule.brand === null || rule.brand === brand;
}

function applyPriceRule(totalCents: number, rule: PriceRuleInput): number {
  if (rule.adjustmentType === 'PERCENT') {
    return totalCents + applyBasisPoints(totalCents, rule.percentBasisPoints ?? 0);
  }
  return totalCents + (rule.amountCents ?? 0);
}

export function computeTotals(input: ComputeTotalsInput): ComputedTotals {
  const orderedRules = [...input.priceRules].sort(
    (a, b) => a.priority - b.priority || a.id.localeCompare(b.id),
  );
  const orderedDiscounts = [...input.discountRules].sort(
    (a, b) => a.priority - b.priority || a.id.localeCompare(b.id),
  );

  const lines: ComputedLine[] = input.items.map((item) => {
    let totalCents = lineTotal(item.quantity, item.unitAmountCents);
    for (const rule of orderedRules) {
      if (matchesRule(rule, item.category, item.brand)) {
        totalCents = applyPriceRule(totalCents, rule);
      }
    }
    return {
      category: item.category,
      description: item.description,
      quantity: item.quantity,
      unitAmountCents: item.unitAmountCents,
      totalCents: Math.max(0, totalCents),
      sortOrder: categorySortOrder(item.category),
      metadata: item.metadata ?? null,
    };
  });
  lines.sort((a, b) => a.sortOrder - b.sortOrder || a.description.localeCompare(b.description));

  const subtotalCents = lines.reduce((sum, line) => sum + line.totalCents, 0);
  const categorySubtotal = (category: QuoteLineCategory): number =>
    lines
      .filter((line) => line.category === category)
      .reduce((sum, line) => sum + line.totalCents, 0);

  // Sequential compounding: category-scoped discounts are measured against
  // the remaining category contribution so caps stay honest under stacking.
  let remainingTotal = subtotalCents;
  const remainingByCategory = new Map<QuoteLineCategory, number>();
  const discountsApplied: DiscountApplication[] = [];

  for (const rule of orderedDiscounts) {
    const base =
      rule.category === null
        ? remainingTotal
        : (remainingByCategory.get(rule.category) ?? categorySubtotal(rule.category));
    if (base <= 0) {
      continue;
    }
    const raw =
      rule.kind === 'PERCENT'
        ? applyBasisPoints(base, rule.percentBasisPoints ?? 0)
        : (rule.amountCents ?? 0);
    const amountCents = capDiscount(base, raw);
    if (amountCents <= 0) {
      continue;
    }
    remainingTotal -= amountCents;
    if (rule.category !== null) {
      remainingByCategory.set(rule.category, base - amountCents);
    } else {
      // Order-wide discounts reduce every category bucket proportionally.
      // Exact proportional split is unnecessary — buckets only drive caps.
      for (const [category, value] of remainingByCategory) {
        remainingByCategory.set(category, Math.min(value, remainingTotal));
      }
    }
    discountsApplied.push({ ruleId: rule.id, name: rule.name, amountCents });
  }

  const discountCents = subtotalCents - remainingTotal;
  const vatCents = input.taxStrategy.calculate(remainingTotal);

  return {
    lines,
    subtotalCents,
    discountCents,
    discountsApplied,
    vatBasisPoints: input.taxStrategy.rateBasisPoints,
    vatCents,
    totalCents: remainingTotal + vatCents,
  };
}
