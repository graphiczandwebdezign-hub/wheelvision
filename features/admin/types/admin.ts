export interface AdminDashboardMetrics {
  readonly totalQuotes: number;
  readonly acceptedQuotes: number;
  readonly rejectedQuotes: number;
  readonly expiredQuotes: number;
  readonly conversionRatePercent: number;
  readonly estimatedRevenueCents: number;
  readonly topWheelBrands: readonly { readonly brand: string; readonly count: number }[];
  readonly topTyreBrands: readonly { readonly brand: string; readonly count: number }[];
  readonly recentActivity: readonly {
    readonly id: string;
    readonly quoteNumber: string;
    readonly customerName: string;
    readonly status: string;
    readonly totalCents: number;
    readonly createdAt: string;
  }[];
  readonly systemHealth: {
    readonly databaseStatus: 'HEALTHY' | 'DEGRADED' | 'DOWN';
    readonly apiLatencyMs: number;
    readonly activeTenantSlug: string;
  };
}

export interface AdminCatalogItemDto {
  readonly id: string;
  readonly category: 'VEHICLE' | 'WHEEL' | 'TYRE';
  readonly name: string;
  readonly brand?: string;
  readonly model?: string;
  readonly variant?: string;
  readonly active: boolean;
  readonly createdAt: string;
}

export interface AdminPricingDto {
  readonly priceListId: string;
  readonly priceListName: string;
  readonly currency: string;
  readonly vatBasisPoints: number;
  readonly wheelPrices: readonly { readonly id: string; readonly wheelModelId: string; readonly wheelName: string; readonly amountCents: number }[];
  readonly tyrePrices: readonly { readonly id: string; readonly tyreModelId: string; readonly tyreName: string; readonly amountCents: number }[];
  readonly labourPrices: readonly { readonly id: string; readonly serviceType: string; readonly unit: string; readonly amountCents: number }[];
}

export interface AdminPromotionDto {
  readonly id: string;
  readonly name: string;
  readonly kind: 'PERCENT' | 'FIXED';
  readonly percentBasisPoints: number | null;
  readonly amountCents: number | null;
  readonly category: string | null;
  readonly priority: number;
  readonly active: boolean;
  readonly validFrom: string | null;
  readonly validTo: string | null;
}

export interface AdminConsultantDto {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly phone: string | null;
  readonly avatarUrl: string | null;
  readonly active: boolean;
  readonly isDefault: boolean;
  readonly createdAt: string;
}

export interface AdminTenantSettingsDto {
  readonly dealerName: string;
  readonly address: string | null;
  readonly telephone: string | null;
  readonly email: string | null;
  readonly website: string | null;
  readonly vatNumber: string | null;
  readonly companyRegistration: string | null;
  readonly logoUrl: string | null;
  readonly quoteValidityDays: number;
  readonly currency: string;
  readonly timezone: string;
}
