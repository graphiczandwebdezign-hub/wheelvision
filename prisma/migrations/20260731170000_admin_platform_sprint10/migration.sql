-- CreateTable
CREATE TABLE "TenantSettings" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "dealerName" TEXT,
    "address" TEXT,
    "telephone" TEXT,
    "email" TEXT,
    "website" TEXT,
    "vatNumber" TEXT,
    "companyRegistration" TEXT,
    "logoUrl" TEXT,
    "quoteValidityDays" INTEGER NOT NULL DEFAULT 30,
    "currency" TEXT NOT NULL DEFAULT 'ZAR',
    "timezone" TEXT NOT NULL DEFAULT 'Africa/Johannesburg',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "TenantSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TenantSettings_tenantId_key" ON "TenantSettings"("tenantId");

-- AddForeignKey
ALTER TABLE "TenantSettings" ADD CONSTRAINT "TenantSettings_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable User
ALTER TABLE "User" ADD COLUMN "phone" TEXT,
ADD COLUMN "avatarUrl" TEXT,
ADD COLUMN "active" BOOLEAN NOT NULL DEFAULT TRUE,
ADD COLUMN "isDefault" BOOLEAN NOT NULL DEFAULT FALSE;

-- AlterTable DiscountRule
ALTER TABLE "DiscountRule" ADD COLUMN "restrictions" JSONB,
ADD COLUMN "metadata" JSONB;
