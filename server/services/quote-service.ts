import { createStorageId } from '@/lib/create-id';
import { BaseService } from '@/server/services/base-service';
import type { PricingService } from '@/server/services/pricing-service';
import type { TyreService } from '@/server/services/tyre-service';
import type { VehicleService } from '@/server/services/vehicle-service';
import type { WheelService } from '@/server/services/wheel-service';
import type { QuoteRepositoryPort, QuoteRecord } from '@/server/repositories/quote-repository';
import { buildQuoteDetail, buildSnapshotPayload } from '@/server/quote/quote-builder';
import { QUOTE_VALIDITY_DAYS } from '@/server/quote/quote-terms';
import type { CreateQuoteInput, ListQuotesQuery } from '@/server/validators/quote-schemas';
import { AppError } from '@/server/utils/errors';
import type { PaginatedResult } from '@/server/utils/pagination';
import type { VehicleDetail, WheelDetail, TyreDetail } from '@/types/catalog';
import type { QuoteDetail, QuoteSnapshotPayload, QuoteStatus, QuoteStatusDetail, QuoteSummary } from '@/types/quote';

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
    const processed = await Promise.all(data.map((record) => this.ensureFreshExpiryRecord(record)));
    return { total, data: processed.map((record) => buildQuoteDetail(record)) };
  }

  async getQuote(tenantId: string | null, id: string): Promise<QuoteDetail> {
    const isUuid = id.includes('-');
    const isQuoteNumber = id.startsWith('WV-');
    let record: QuoteRecord | null = null;
    if (isUuid) {
      record = await this.repository.findById(tenantId, id);
      if (record === null && !tenantId) {
        record = await this.repository.findById(null, id);
      }
    } else if (isQuoteNumber) {
      record = await this.repository.findByNumber(id);
    }
    if (record === null) {
      throw AppError.notFound('Quote not found', { quoteId: id });
    }
    return this.ensureFreshExpiry(record);
  }

  async getQuoteByNumber(quoteNumber: string): Promise<QuoteDetail> {
    const record = await this.repository.findByNumber(quoteNumber);
    if (record === null) {
      throw AppError.notFound('Quote not found', { quoteNumber });
    }
    return this.ensureFreshExpiry(record);
  }

  async getQuoteStatus(idOrQuoteNumber: string, tenantId: string | null = null): Promise<QuoteStatusDetail> {
    let record = idOrQuoteNumber.includes('-')
      ? await this.repository.findById(tenantId, idOrQuoteNumber)
      : await this.repository.findByNumber(idOrQuoteNumber);

    if (record === null) {
      throw AppError.notFound('Quote not found', { quoteId: idOrQuoteNumber });
    }

    record = await this.ensureFreshExpiryRecord(record);

    const now = this.deps.now?.() ?? new Date();
    const validUntilDate = record.validUntil ? new Date(record.validUntil) : now;
    const isExpired = validUntilDate.getTime() < now.getTime() || record.status === 'EXPIRED';
    const canBeAccepted = !isExpired && ['ISSUED', 'VIEWED'].includes(record.status);

    return {
      quoteNumber: record.quoteNumber ?? '',
      status: record.status as QuoteStatus,
      validUntil: validUntilDate.toISOString(),
      isExpired,
      canBeAccepted,
      history: (record.statusHistories ?? []).map((h) => ({
        id: h.id,
        fromStatus: (h.fromStatus as QuoteStatus) ?? null,
        toStatus: h.toStatus as QuoteStatus,
        actorName: h.actorName,
        createdAt: h.createdAt.toISOString(),
      })),
    };
  }

  async updateQuoteStatus(
    idOrQuoteNumber: string,
    newStatus: string,
    actorName?: string | null,
    tenantId: string | null = null,
  ): Promise<QuoteDetail> {
    let record = idOrQuoteNumber.includes('-')
      ? await this.repository.findById(tenantId, idOrQuoteNumber)
      : await this.repository.findByNumber(idOrQuoteNumber);

    if (record === null) {
      throw AppError.notFound('Quote not found', { quoteId: idOrQuoteNumber });
    }

    const now = this.deps.now?.() ?? new Date();
    const validUntilDate = record.validUntil ? new Date(record.validUntil) : now;
    if (validUntilDate.getTime() < now.getTime() && ['ISSUED', 'VIEWED'].includes(record.status)) {
      record = (await this.repository.updateStatus(tenantId, record.quoteNumber ?? record.id, 'EXPIRED', 'System')) ?? record;
    }

    if (newStatus === 'ACCEPTED') {
      if (record.status === 'EXPIRED' || validUntilDate.getTime() < now.getTime()) {
        throw new AppError('Expired quotations cannot be accepted', {
          code: 'VALIDATION_ERROR',
          statusCode: 400,
        });
      }
      if (!['ISSUED', 'VIEWED'].includes(record.status)) {
        throw new AppError(`Cannot accept a quote with status ${record.status}`, {
          code: 'VALIDATION_ERROR',
          statusCode: 400,
        });
      }
    }

    const updated = await this.repository.updateStatus(
      tenantId,
      record.quoteNumber ?? record.id,
      newStatus,
      actorName ?? undefined,
    );

    if (updated === null) {
      throw AppError.notFound('Quote not found', { quoteId: idOrQuoteNumber });
    }

    return buildQuoteDetail(updated);
  }

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

  private async ensureFreshExpiry(record: QuoteRecord): Promise<QuoteDetail> {
    const fresh = await this.ensureFreshExpiryRecord(record);
    return buildQuoteDetail(fresh);
  }

  private async ensureFreshExpiryRecord(record: QuoteRecord): Promise<QuoteRecord> {
    const now = this.deps.now?.() ?? new Date();
    const validUntilDate = record.validUntil ? new Date(record.validUntil) : now;
    if (validUntilDate.getTime() < now.getTime() && ['ISSUED', 'VIEWED'].includes(record.status)) {
      const updated = await this.repository.updateStatus(
        record.tenantId,
        record.quoteNumber ?? record.id,
        'EXPIRED',
        'System',
      );
      return updated ?? record;
    }
    return record;
  }
}
