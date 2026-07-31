-- Sprint 8: quote domain.
--
-- Additive-only migration: every new column is nullable or defaulted, the
-- legacy Quote model keeps its required relations (which the quote service
-- now populates properly), and every new table is independent of existing
-- data. Nothing is dropped, renamed or rewritten.

-- Tenant: atomic quote-number counter ( UPDATE ... + 1 serialises in PG ).
ALTER TABLE "Tenant" ADD COLUMN "quoteSequence" INTEGER NOT NULL DEFAULT 0;

-- Quote: numbering, currency and the money breakdown (integer cents).
ALTER TABLE "Quote" ADD COLUMN "quoteNumber" TEXT;
ALTER TABLE "Quote" ADD COLUMN "consultantName" TEXT;
ALTER TABLE "Quote" ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'ZAR';
ALTER TABLE "Quote" ADD COLUMN "subtotalCents" INTEGER;
ALTER TABLE "Quote" ADD COLUMN "discountCents" INTEGER;
ALTER TABLE "Quote" ADD COLUMN "vatBasisPoints" INTEGER;
ALTER TABLE "Quote" ADD COLUMN "vatCents" INTEGER;
ALTER TABLE "Quote" ADD COLUMN "validUntil" TIMESTAMP(3);
ALTER TABLE "Quote" ADD COLUMN "archivedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "Quote_tenantId_quoteNumber_key" ON "Quote"("tenantId", "quoteNumber");

CREATE TABLE "PriceList" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'RETAIL',
    "currency" TEXT NOT NULL DEFAULT 'ZAR',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    CONSTRAINT "PriceList_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PriceRule" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "priceListId" UUID NOT NULL,
    "category" TEXT NOT NULL,
    "adjustmentType" TEXT NOT NULL,
    "percentBasisPoints" INTEGER,
    "amountCents" INTEGER,
    "brand" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    CONSTRAINT "PriceRule_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WheelPrice" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "priceListId" UUID NOT NULL,
    "wheelModelId" UUID NOT NULL,
    "wheelSizeId" UUID,
    "amountCents" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    CONSTRAINT "WheelPrice_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TyrePrice" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "priceListId" UUID NOT NULL,
    "tyreModelId" UUID NOT NULL,
    "tyreProfileId" UUID,
    "amountCents" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    CONSTRAINT "TyrePrice_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LabourPrice" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "priceListId" UUID NOT NULL,
    "serviceType" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    CONSTRAINT "LabourPrice_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DiscountRule" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "percentBasisPoints" INTEGER,
    "amountCents" INTEGER,
    "category" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "validFrom" TIMESTAMP(3),
    "validTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    CONSTRAINT "DiscountRule_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "QuoteLine" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "quoteId" UUID NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitAmountCents" INTEGER NOT NULL,
    "totalCents" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "QuoteLine_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "QuoteSnapshot" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "quoteId" UUID NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "QuoteSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PriceList_tenantId_name_key" ON "PriceList"("tenantId", "name");
CREATE INDEX "PriceRule_tenantId_priceListId_active_idx" ON "PriceRule"("tenantId", "priceListId", "active");
CREATE INDEX "WheelPrice_tenantId_priceListId_wheelModelId_idx" ON "WheelPrice"("tenantId", "priceListId", "wheelModelId");
CREATE INDEX "TyrePrice_tenantId_priceListId_tyreModelId_idx" ON "TyrePrice"("tenantId", "priceListId", "tyreModelId");
CREATE UNIQUE INDEX "LabourPrice_priceListId_serviceType_unit_key" ON "LabourPrice"("priceListId", "serviceType", "unit");
CREATE INDEX "DiscountRule_tenantId_active_idx" ON "DiscountRule"("tenantId", "active");
CREATE INDEX "QuoteLine_quoteId_idx" ON "QuoteLine"("quoteId");
CREATE UNIQUE INDEX "QuoteSnapshot_quoteId_key" ON "QuoteSnapshot"("quoteId");
CREATE INDEX "QuoteSnapshot_tenantId_idx" ON "QuoteSnapshot"("tenantId");

ALTER TABLE "PriceList" ADD CONSTRAINT "PriceList_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PriceRule" ADD CONSTRAINT "PriceRule_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PriceRule" ADD CONSTRAINT "PriceRule_priceListId_fkey" FOREIGN KEY ("priceListId") REFERENCES "PriceList"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WheelPrice" ADD CONSTRAINT "WheelPrice_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WheelPrice" ADD CONSTRAINT "WheelPrice_priceListId_fkey" FOREIGN KEY ("priceListId") REFERENCES "PriceList"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TyrePrice" ADD CONSTRAINT "TyrePrice_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TyrePrice" ADD CONSTRAINT "TyrePrice_priceListId_fkey" FOREIGN KEY ("priceListId") REFERENCES "PriceList"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LabourPrice" ADD CONSTRAINT "LabourPrice_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LabourPrice" ADD CONSTRAINT "LabourPrice_priceListId_fkey" FOREIGN KEY ("priceListId") REFERENCES "PriceList"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DiscountRule" ADD CONSTRAINT "DiscountRule_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QuoteLine" ADD CONSTRAINT "QuoteLine_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QuoteSnapshot" ADD CONSTRAINT "QuoteSnapshot_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QuoteSnapshot" ADD CONSTRAINT "QuoteSnapshot_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE CASCADE ON UPDATE CASCADE;
