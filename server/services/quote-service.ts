import { createStorageId } from '@/lib/create-id';
import { BaseService } from '@/server/services/base-service';
import type { PricingService } from '@/server/services/pricing-service';
import type { TyreService } from '@/server/services/tyre-service';
import type { VehicleService } from '@/server/services/vehicle-service';
import type { WheelService } from '@/server/services/wheel-service';
import type { QuoteRepositoryPort } from '@/server/repositories/quote-repository';
import { buildQuoteDetail, buildSnapshotPayload } from '@/server/quote/quote-builder';
import { QUOTE_VALIDITY_DAYS } from '@/server/quote/quote-terms';
import type { CreateQuoteInput, ListQuotesQuery } from '@/server/validators/quote-schemas';
import { AppError } from '@/server/utils/errors';
import type { PaginatedResult } from '@/server/utils/pagination';
import type { VehicleDetail, WheelDetail, TyreDetail } from '@/types/catalog';
import type { QuoteDetail, QuoteSnapshotPayload, QuoteSummary } from '@/types/quote';

/**
 * QuoteService — the only place quote business decisions live. Controllers
 * parse and respond; repositories persist; this service owns completeness
 * validation, catalog-membership revalidation, pricing orchestration,
 * immutable snapshot assembly and the quote lifecycle (issue / duplicate /
 * archive).
 *
 * Immutability contract: a quote's content is assembled once from the
 * *priced* configuration and persisted with its snapshot; nothing in the
 * read path recomputes money, so catalog/price changes afterwards can never
 * retroactively alter an issued quote. Duplication is the only "reuse" —
 * it deliberately re-prices at current catalogue state under a fresh number.
 */

export interface QuoteCatalogServices {
  readonly vehicles: VehicleService;
  readonly wheels: WheelService;
  readonly tyres: TyreService;
}

export interface DealerLookup {
  findById(id: string): Promise<{ id: string; name: string; slug: string } | null>;
}

export interface QuoteServiceDeps {
  readonly catalog: QuoteCatalogServices;
  readonly pricing: PricingService;
  readonly dealers: DealerLookup;
  /** Clock seam for deterministic tests (defaults to system time). */
  readonly now?: () => Date;
}

interface CompleteConfiguration {
  readonly vehicleId: string;
  readonly colour: string;
  readonly wheelId: string;
  readonly wheelFinish: string;
  readonly wheelSizeId: string;
  readonly tyreId: string;
  readonly tyreProfileId: string;
}

const MISSING_FIELD_LABELS: Record<string, string> = {
  vehicleId: 'vehicle',
  colour: 'vehicle colour',
  wheelId: 'wheel',
  wheelFinish: 'wheel finish',
  wheelSizeId: 'wheel size',
  tyreId: 'tyre',
  tyreProfileId: 'tyre profile',
};

export class QuoteService extends BaseService<QuoteRepositoryPort> {
  constructor(
    repository: QuoteRepositoryPort,
    private readonly deps: QuoteServiceDeps,
  ) {
    super(repository);
  }

  async createQuote(tenantId: string, input: CreateQuoteInput): Promise<QuoteDetail> {
    const configuration = this.requireCompleteConfiguration(input.configuration);
    const [vehicle, wheel, tyre] = await Promise.all([
      this.deps.catalog.vehicles.getVehicle(tenantId, configuration.vehicleId),
      this.deps.catalog.wheels.getWheel(tenantId, configuration.wheelId),
      this.deps.catalog.tyres.getTyre(tenantId, configuration.tyreId),
    ]);
    this.assertCatalogMembership(configuration, vehicle, wheel, tyre);

    const anchors = await this.deps.catalog.vehicles.getVehicleAnchors(
      tenantId,
      configuration.vehicleId,
    );
    const dealer = await this.requireDealer(tenantId);
    const now = this.deps.now?.() ?? new Date();
    const validUntil = new Date(now.getTime() + QUOTE_VALIDITY_DAYS * 24 * 60 * 60 * 1000);

    const customer = {
      name: input.customer.name,
      email: input.customer.email ?? null,
      phone: input.customer.phone ?? null,
    };

    const pricing = await this.deps.pricing.priceConfiguration({
      tenantId,
      wheel,
      wheelFinish: configuration.wheelFinish,
      wheelSizeId: configuration.wheelSizeId,
      tyre,
      tyreProfileId: configuration.tyreProfileId,
      at: now,
    });

    // Line ids are pre-generated so the snapshot payload and the persisted
    // rows carry identical identities.
    const lines = pricing.lines.map((line) => ({
      id: createStorageId('qline'),
      category: line.category,
      description: line.description,
      quantity: line.quantity,
      unitAmountCents: line.unitAmountCents,
      totalCents: line.totalCents,
      sortOrder: line.sortOrder,
      metadata: line.metadata && typeof line.metadata === 'object' ? line.metadata : null,
    }));

    // The number is allocated atomically inside the repository's creation
    // transaction (tenant counter bump); it replaces this placeholder before
    // the snapshot row is written, so the persisted snapshot carries it.
    const snapshotPayload = buildSnapshotPayload({
      quoteNumber: 'WV-PENDING',
      issuedAt: now,
      validUntil,
      dealer,
      input: { ...input, configuration },
      customer,
      vehicle,
      wheel,
      tyre,
      pricing: {
        priceList: pricing.priceList,
        lines,
        subtotalCents: pricing.subtotalCents,
        discountCents: pricing.discountCents,
        discountsApplied: pricing.discountsApplied,
        tax: {
          strategy: pricing.tax.code,
          name: pricing.tax.name,
          rateBasisPoints: pricing.vatBasisPoints,
          vatCents: pricing.vatCents,
        },
        totalCents: pricing.totalCents,
        currency: pricing.currency,
      },
    });

    const record = await this.repository.createQuote({
      tenantId,
      issuedAt: now,
      customer,
      configuration: {
        ...anchors,
        wheelModelId: configuration.wheelId,
        tyreModelId: configuration.tyreId,
      },
      consultantName: input.consultantName ?? null,
      currency: pricing.currency,
      subtotalCents: pricing.subtotalCents,
      discountCents: pricing.discountCents,
      vatBasisPoints: pricing.vatBasisPoints,
      vatCents: pricing.vatCents,
      totalCents: pricing.totalCents,
      validUntil,
      lines,
      snapshotPayload,
    });

    return buildQuoteDetail(record);
  }

  async listQuotes(
    tenantId: string,
    query: ListQuotesQuery,
  ): Promise<PaginatedResult<QuoteSummary>> {
    const { data, total } = await this.repository.listByTenant(tenantId, query, query.status);
    return { total, data: data.map((record) => buildQuoteDetail(record)) };
  }

  async getQuote(tenantId: string, id: string): Promise<QuoteDetail> {
    const record = await this.repository.findById(tenantId, id);
    if (record === null) {
      throw AppError.notFound('Quote not found', { quoteId: id });
    }
    return buildQuoteDetail(record);
  }

  /**
   * Duplicates from the immutable snapshot: same configuration, customer and
   * consultant, but re-priced at current catalogue state and issued under a
   * fresh sequential number — the duplicate never touches the source quote.
   */
  async duplicateQuote(tenantId: string, id: string): Promise<QuoteDetail> {
    const source = await this.repository.findById(tenantId, id);
    if (source === null) {
      throw AppError.notFound('Quote not found', { quoteId: id });
    }
    const snapshot = this.readSnapshot(source.snapshot?.payload);
    if (snapshot === null) {
      throw new AppError('This quote cannot be duplicated because it has no snapshot', {
        code: 'VALIDATION_ERROR',
        statusCode: 400,
        details: { quoteId: id },
      });
    }
    return this.createQuote(tenantId, {
      configuration: { ...snapshot.configuration },
      customer: { ...snapshot.customer },
      consultantName: snapshot.consultant?.name ?? source.consultantName ?? null,
    });
  }

  async archiveQuote(tenantId: string, id: string): Promise<QuoteDetail> {
    const record = await this.repository.archive(tenantId, id, this.deps.now?.() ?? new Date());
    if (record === null) {
      throw AppError.notFound('Quote not found', { quoteId: id });
    }
    return buildQuoteDetail(record);
  }

  // -------------------------------------------------------------------------

  /**
   * A quotation can only be issued from a fully specified configuration —
   * every dimension of the priced package must be present. Missing
   * dimensions are a business error (400), distinct from a schema error.
   */
  private requireCompleteConfiguration(
    configuration: CreateQuoteInput['configuration'],
  ): CompleteConfiguration {
    const missing = Object.entries(MISSING_FIELD_LABELS)
      .filter(([field]) => {
        const value = configuration[field as keyof typeof configuration];
        return value === null || value === undefined;
      })
      .map(([, label]) => label);
    if (missing.length > 0) {
      throw new AppError('Complete the vehicle, wheel and tyre selection before quoting', {
        code: 'VALIDATION_ERROR',
        statusCode: 400,
        details: { missingFields: missing },
      });
    }
    return configuration as CompleteConfiguration;
  }

  /**
   * Revalidates the selection against the live catalog so a quote can never
   * reference a delisted colour/finish/size/profile — the commercial
   * equivalent of the preview's reconciliation pass.
   */
  private assertCatalogMembership(
    configuration: CompleteConfiguration,
    vehicle: VehicleDetail,
    wheel: WheelDetail,
    tyre: TyreDetail,
  ): void {
    const problems: string[] = [];
    if (!vehicle.colours.includes(configuration.colour)) {
      problems.push(`colour "${configuration.colour}" is not available on this vehicle`);
    }
    if (!wheel.finishes.includes(configuration.wheelFinish)) {
      problems.push(`finish "${configuration.wheelFinish}" is not available on this wheel`);
    }
    if (!wheel.sizes.some((size) => size.id === configuration.wheelSizeId)) {
      problems.push('the selected wheel size is not in the current catalog');
    }
    if (!tyre.profiles.some((profile) => profile.id === configuration.tyreProfileId)) {
      problems.push('the selected tyre profile is not in the current catalog');
    }
    if (problems.length > 0) {
      throw new AppError('The configuration no longer matches the current catalog', {
        code: 'VALIDATION_ERROR',
        statusCode: 400,
        details: { problems },
      });
    }
  }

  private async requireDealer(tenantId: string) {
    const dealer = await this.deps.dealers.findById(tenantId);
    if (dealer === null) {
      throw new AppError('Tenant could not be resolved', {
        code: 'INTERNAL_ERROR',
        statusCode: 500,
        details: { tenantId },
      });
    }
    return dealer;
  }

  /** Snapshot payloads are JSON; the shape is trusted but validated minimally. */
  private readSnapshot(payload: unknown): QuoteSnapshotPayload | null {
    if (typeof payload !== 'object' || payload === null) {
      return null;
    }
    const record = payload as Partial<QuoteSnapshotPayload>;
    if (record.version !== 1 || !record.configuration || !record.customer) {
      return null;
    }
    return record as QuoteSnapshotPayload;
  }
}
