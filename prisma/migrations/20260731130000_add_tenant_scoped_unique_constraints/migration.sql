-- Tenant-scoped uniqueness for natural keys.
--
-- Correctness-only migration: no business fields change. Unique constraints
-- on (tenantId, natural key) make seed upserts possible, prevent duplicate
-- catalog rows per tenant, and replace plain indexes where the unique index
-- already covers the same column tuple (indexes verified).

-- DropIndex (covered by the new unique indexes below)
DROP INDEX "VehicleManufacturer_tenantId_name_idx";
DROP INDEX "WheelBrand_tenantId_name_idx";
DROP INDEX "TyreBrand_tenantId_name_idx";
DROP INDEX "WheelSize_tenantId_size_idx";
DROP INDEX "SavedConfiguration_tenantId_name_idx";

-- CreateIndex
CREATE UNIQUE INDEX "VehicleManufacturer_tenantId_name_key" ON "VehicleManufacturer"("tenantId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "VehicleModel_tenantId_vehicleManufacturerId_name_key" ON "VehicleModel"("tenantId", "vehicleManufacturerId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "VehicleVariant_tenantId_vehicleModelId_name_key" ON "VehicleVariant"("tenantId", "vehicleModelId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "VehicleColour_tenantId_vehicleVariantId_name_key" ON "VehicleColour"("tenantId", "vehicleVariantId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "WheelBrand_tenantId_name_key" ON "WheelBrand"("tenantId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "WheelModel_tenantId_wheelBrandId_name_key" ON "WheelModel"("tenantId", "wheelBrandId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "WheelFinish_tenantId_wheelModelId_name_key" ON "WheelFinish"("tenantId", "wheelModelId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "WheelSize_tenantId_size_key" ON "WheelSize"("tenantId", "size");

-- CreateIndex
CREATE UNIQUE INDEX "TyreBrand_tenantId_name_key" ON "TyreBrand"("tenantId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "TyreModel_tenantId_tyreBrandId_name_key" ON "TyreModel"("tenantId", "tyreBrandId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "TyreProfile_tenantId_tyreModelId_profile_key" ON "TyreProfile"("tenantId", "tyreModelId", "profile");

-- CreateIndex
CREATE UNIQUE INDEX "SavedConfiguration_tenantId_name_key" ON "SavedConfiguration"("tenantId", "name");

-- CreateIndex (nullable email: PostgreSQL treats NULLs as distinct, so
-- customers without an email do not collide)
CREATE UNIQUE INDEX "Customer_tenantId_email_key" ON "Customer"("tenantId", "email");
