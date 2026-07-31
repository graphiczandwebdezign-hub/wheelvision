import { BaseService } from '@/server/services/base-service';
import { AppError } from '@/server/utils/errors';
import type { PricingRepositoryPort } from '@/server/repositories/pricing-repository';
import type { TaxStrategy } from '@/server/quote/tax/tax-strategy';
import { SOUTH_AFRICAN_VAT } from '@/server/quote/tax/tax-strategy';
import { resolveCurrency } from '@/lib/money/currency';
import { buildBaseItems } from '@/server/quote/totals/quote-lines';
import {
  computeTotals,
  type ComputedLine,
  type ComputeTotalsInput,
  type DiscountApplication,
} from '@/server/quote/totals/compute-totals';
import type { PriceListKind } from '@/types/quote';
import type { TyreDetail, WheelDetail } from '@/types/catalog';

/**
 * PricingService — server-side arbiter of every rand on a quote. Reads the
 * tenant's price book through the pricing repository and runs the pure
 * totals pipeline. Deterministic: identical catalogue + configuration +
 * time → identical computation. No price is ever invented: an unpriced
 * selection aborts the quote (no placeholder pricing).
 */

export interface PricingComputation {
  readonly priceList: {
    readonly id: string;
    readonly name: string;
    readonly kind: PriceListKind;
    readonly currency: string;
  };
  readonly lines: readonly ComputedLine[];
  readonly subtotalCents: number;
  readonly discountCents: number;
  readonly discountsApplied: readonly DiscountApplication[];
  readonly vatBasisPoints: number;
  readonly vatCents: number;
  readonly totalCents: number;
  readonly currency: string;
  readonly tax: TaxStrategy;
}

export class PricingService extends BaseService<PricingRepositoryPort> {
  constructor(repository: PricingRepositoryPort) {
    super(repository);
  }

  /** Tax strategy seam — defaults to South African VAT; future tenants swap by country. */
  protected resolveTaxStrategy(): TaxStrategy {
    return SOUTH_AFRICAN_VAT;
  }

  async priceConfiguration(input: {
    tenantId: string;
    wheel: WheelDetail;
    wheelFinish: string | null;
    wheelSizeId: string | null;
    tyre: TyreDetail;
    tyreProfileId: string | null;
    at: Date;
  }): Promise<PricingComputation> {
    const priceList = await this.repository.findDefaultPriceList(input.tenantId);
    if (priceList === null) {
      throw new AppError('No active price list is configured for this tenant', {
        code: 'INTERNAL_ERROR',
        statusCode: 500,
      });
    }
    // Currency guardrail: the whole quote domain prices in the resolved currency.
    resolveCurrency(priceList.currency);

    const [wheelUnitCents, tyreUnitCents, labourRates, priceRules, discountRules] =
      await Promise.all([
        this.repository.findWheelPrice(
          input.tenantId,
          priceList.id,
          input.wheel.id,
          input.wheelSizeId,
        ),
        this.repository.findTyrePrice(
          input.tenantId,
          priceList.id,
          input.tyre.id,
          input.tyreProfileId,
        ),
        this.repository.listLabourPrices(input.tenantId, priceList.id),
        this.repository.listActivePriceRules(input.tenantId, priceList.id),
        this.repository.listActiveDiscountRules(input.tenantId, input.at),
      ]);

    const wheelSize = input.wheel.sizes.find((size) => size.id === input.wheelSizeId) ?? null;
    const tyreProfile =
      input.tyre.profiles.find((profile) => profile.id === input.tyreProfileId) ?? null;

    const { items, missingPrices } = buildBaseItems({
      wheelDescription:
        `${input.wheel.brand} ${input.wheel.model}` +
        (wheelSize ? ` ${wheelSize.size}` : '') +
        (input.wheelFinish ? ` — ${input.wheelFinish}` : ''),
      wheelBrand: input.wheel.brand,
      wheelUnitAmountCents: wheelUnitCents,
      tyreDescription:
        `${input.tyre.brand} ${input.tyre.pattern}` +
        (tyreProfile ? ` ${tyreProfile.profile}` : ''),
      tyreBrand: input.tyre.brand,
      tyreUnitAmountCents: tyreUnitCents,
      labourRates,
      wheelMetadata: { finish: input.wheelFinish, sizeId: input.wheelSizeId },
      tyreMetadata: { profileId: input.tyreProfileId },
    });

    const missing = [...missingPrices];
    const requiredServices = new Set(['FITMENT', 'BALANCING', 'ALIGNMENT']);
    for (const rate of labourRates) {
      requiredServices.delete(rate.serviceType);
    }
    for (const service of requiredServices) {
      missing.push(`labour:${service.toLowerCase()}`);
    }

    if (missing.length > 0) {
      throw new AppError(
        'Pricing is not available for the selected items — ask an administrator to load the price book.',
        { code: 'VALIDATION_ERROR', statusCode: 400, details: { missingPrices: missing } },
      );
    }

    const taxStrategy = this.resolveTaxStrategy();
    const totals = computeTotals({
      items,
      priceRules,
      discountRules,
      taxStrategy,
    } satisfies ComputeTotalsInput);

    return {
      priceList,
      lines: totals.lines,
      subtotalCents: totals.subtotalCents,
      discountCents: totals.discountCents,
      discountsApplied: totals.discountsApplied,
      vatBasisPoints: totals.vatBasisPoints,
      vatCents: totals.vatCents,
      totalCents: totals.totalCents,
      currency: priceList.currency,
      tax: taxStrategy,
    };
  }
}
