import type { PrismaClient } from '@prisma/client';
import { BaseRepository } from '@/server/repositories/base-repository';
import type { AdjustmentKind, PriceListKind, PriceRuleCategory } from '@/types/quote';
import type { DiscountRuleInput, PriceRuleInput } from '@/server/quote/totals/quote-lines';

/** The tenant's active default price list. */
export interface PriceListRecord {
  readonly id: string;
  readonly name: string;
  readonly kind: PriceListKind;
  readonly currency: string;
}

export interface LabourPriceRecord {
  readonly serviceType: 'FITMENT' | 'BALANCING' | 'ALIGNMENT';
  readonly unit: 'PER_WHEEL' | 'PER_VEHICLE';
  readonly amountCents: number;
}

/** Port the PricingService depends on. Reads only — persistence of prices is an admin concern. */
export interface PricingRepositoryPort {
  findDefaultPriceList(tenantId: string): Promise<PriceListRecord | null>;
  findWheelPrice(
    tenantId: string,
    priceListId: string,
    wheelModelId: string,
    wheelSizeId: string | null,
  ): Promise<number | null>;
  findTyrePrice(
    tenantId: string,
    priceListId: string,
    tyreModelId: string,
    tyreProfileId: string | null,
  ): Promise<number | null>;
  listLabourPrices(tenantId: string, priceListId: string): Promise<LabourPriceRecord[]>;
  listActivePriceRules(tenantId: string, priceListId: string): Promise<PriceRuleRecord[]>;
  listActiveDiscountRules(tenantId: string, at: Date): Promise<DiscountRuleRecord[]>;
}

export type PriceRuleRecord = PriceRuleInput & { readonly tenantId?: never };
export type DiscountRuleRecord = DiscountRuleInput & { readonly tenantId?: never };

const LABOUR_SERVICE_TYPES = new Set(['FITMENT', 'BALANCING', 'ALIGNMENT']);
const LABOUR_UNITS = new Set(['PER_WHEEL', 'PER_VEHICLE']);

/**
 * Price lookups. Specificity rule for wheels/tyres: the size-/profile-priced
 * row wins over the model-wide (null qualifier) row; the service layer
 * decides what "no price" means (it is a hard business error, never a zero).
 */
export class PricingRepository extends BaseRepository implements PricingRepositoryPort {
  constructor(prisma: PrismaClient) {
    super(prisma);
  }

  async findDefaultPriceList(tenantId: string): Promise<PriceListRecord | null> {
    const priceList = await this.prisma.priceList.findFirst({
      where: { tenantId, active: true, deletedAt: null },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
      select: { id: true, name: true, kind: true, currency: true },
    });
    return priceList === null ? null : { ...priceList, kind: priceList.kind as PriceListKind };
  }

  async findWheelPrice(
    tenantId: string,
    priceListId: string,
    wheelModelId: string,
    wheelSizeId: string | null,
  ): Promise<number | null> {
    const rows: Array<{ wheelSizeId: string | null; amountCents: number }> =
      await this.prisma.wheelPrice.findMany({
        where: {
          tenantId,
          priceListId,
          wheelModelId,
          deletedAt: null,
          OR: [{ wheelSizeId: wheelSizeId ?? undefined }, { wheelSizeId: null }],
        },
        select: { wheelSizeId: true, amountCents: true },
      });
    const specific = rows.find((row) => row.wheelSizeId !== null);
    return (specific ?? rows[0])?.amountCents ?? null;
  }

  async findTyrePrice(
    tenantId: string,
    priceListId: string,
    tyreModelId: string,
    tyreProfileId: string | null,
  ): Promise<number | null> {
    const rows: Array<{ tyreProfileId: string | null; amountCents: number }> =
      await this.prisma.tyrePrice.findMany({
        where: {
          tenantId,
          priceListId,
          tyreModelId,
          deletedAt: null,
          OR: [{ tyreProfileId: tyreProfileId ?? undefined }, { tyreProfileId: null }],
        },
        select: { tyreProfileId: true, amountCents: true },
      });
    const specific = rows.find((row) => row.tyreProfileId !== null);
    return (specific ?? rows[0])?.amountCents ?? null;
  }

  async listLabourPrices(tenantId: string, priceListId: string): Promise<LabourPriceRecord[]> {
    const rows: Array<{ serviceType: string; unit: string; amountCents: number }> =
      await this.prisma.labourPrice.findMany({
        where: { tenantId, priceListId, deletedAt: null },
        select: { serviceType: true, unit: true, amountCents: true },
      });
    return rows.filter(
      (row): row is LabourPriceRecord =>
        LABOUR_SERVICE_TYPES.has(row.serviceType) && LABOUR_UNITS.has(row.unit),
    ) as LabourPriceRecord[];
  }

  async listActivePriceRules(tenantId: string, priceListId: string): Promise<PriceRuleRecord[]> {
    const rows: Array<{
      id: string;
      category: string;
      adjustmentType: string;
      percentBasisPoints: number | null;
      amountCents: number | null;
      brand: string | null;
      priority: number;
    }> = await this.prisma.priceRule.findMany({
      where: { tenantId, priceListId, active: true, deletedAt: null },
      select: {
        id: true,
        category: true,
        adjustmentType: true,
        percentBasisPoints: true,
        amountCents: true,
        brand: true,
        priority: true,
      },
    });
    return rows.map((row) => ({
      ...row,
      category: row.category as PriceRuleCategory,
      adjustmentType: row.adjustmentType as AdjustmentKind,
    }));
  }

  async listActiveDiscountRules(tenantId: string, at: Date): Promise<DiscountRuleRecord[]> {
    const rows: Array<{
      id: string;
      name: string;
      kind: string;
      percentBasisPoints: number | null;
      amountCents: number | null;
      category: string | null;
      priority: number;
    }> = await this.prisma.discountRule.findMany({
      where: {
        tenantId,
        active: true,
        deletedAt: null,
        AND: [
          { OR: [{ validFrom: null }, { validFrom: { lte: at } }] },
          { OR: [{ validTo: null }, { validTo: { gte: at } }] },
        ],
      },
      select: {
        id: true,
        name: true,
        kind: true,
        percentBasisPoints: true,
        amountCents: true,
        category: true,
        priority: true,
      },
    });
    return rows.map((row) => ({
      ...row,
      kind: row.kind as AdjustmentKind,
      category: row.category as DiscountRuleRecord['category'],
    }));
  }
}
