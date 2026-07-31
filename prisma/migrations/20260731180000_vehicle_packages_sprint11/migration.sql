-- CreateTable
CREATE TABLE "VehiclePackage" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "manufacturer" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "generation" TEXT,
    "year" INTEGER,
    "trim" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "publishedFlag" BOOLEAN NOT NULL DEFAULT FALSE,
    "colours" JSONB NOT NULL,
    "wheelPositions" JSONB NOT NULL,
    "wheelMetadata" JSONB,
    "tyreMetadata" JSONB,
    "renderMetadata" JSONB,
    "assetReferences" JSONB NOT NULL,
    "validationState" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "VehiclePackage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VehiclePackage_tenantId_status_idx" ON "VehiclePackage"("tenantId", "status");

-- AddForeignKey
ALTER TABLE "VehiclePackage" ADD CONSTRAINT "VehiclePackage_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
