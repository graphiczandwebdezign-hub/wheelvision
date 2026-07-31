-- CreateTable
CREATE TABLE "Tenant" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Role" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserRole" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "roleId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "UserRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Store" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Store_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleManufacturer" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "VehicleManufacturer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleModel" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "vehicleManufacturerId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "VehicleModel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleVariant" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "vehicleModelId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "wheelDiameterMm" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "VehicleVariant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleColour" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "vehicleVariantId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "VehicleColour_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WheelBrand" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "WheelBrand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WheelModel" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "wheelBrandId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "WheelModel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WheelFinish" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "wheelModelId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "WheelFinish_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WheelSize" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "size" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "WheelSize_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TyreBrand" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "TyreBrand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TyreModel" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "tyreBrandId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "TyreModel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TyreProfile" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "tyreModelId" UUID NOT NULL,
    "profile" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "TyreProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedConfiguration" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "vehicleVariantId" UUID NOT NULL,
    "vehicleModelId" UUID NOT NULL,
    "wheelModelId" UUID NOT NULL,
    "tyreModelId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "SavedConfiguration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Quote" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "savedConfigurationId" UUID NOT NULL,
    "status" TEXT NOT NULL,
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Quote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Asset" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "quoteId" UUID,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "actorId" UUID,
    "details" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_slug_key" ON "Tenant" ("slug");

-- CreateIndex
CREATE INDEX "User_tenantId_idx" ON "User" ("tenantId");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User" ("email");

-- CreateIndex
CREATE INDEX "Role_tenantId_name_idx" ON "Role" ("tenantId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "UserRole_userId_roleId_key" ON "UserRole" ("userId", "roleId");

-- CreateIndex
CREATE INDEX "UserRole_userId_idx" ON "UserRole" ("userId");

-- CreateIndex
CREATE INDEX "UserRole_roleId_idx" ON "UserRole" ("roleId");

-- CreateIndex
CREATE INDEX "Store_tenantId_name_idx" ON "Store" ("tenantId", "name");

-- CreateIndex
CREATE INDEX "VehicleManufacturer_tenantId_name_idx" ON "VehicleManufacturer" ("tenantId", "name");

-- CreateIndex
CREATE INDEX "VehicleModel_tenantId_name_idx" ON "VehicleModel" ("tenantId", "name");

-- CreateIndex
CREATE INDEX "VehicleModel_vehicleManufacturerId_idx" ON "VehicleModel" ("vehicleManufacturerId");

-- CreateIndex
CREATE INDEX "VehicleVariant_tenantId_name_idx" ON "VehicleVariant" ("tenantId", "name");

-- CreateIndex
CREATE INDEX "VehicleVariant_vehicleModelId_idx" ON "VehicleVariant" ("vehicleModelId");

-- CreateIndex
CREATE INDEX "VehicleColour_tenantId_name_idx" ON "VehicleColour" ("tenantId", "name");

-- CreateIndex
CREATE INDEX "VehicleColour_vehicleVariantId_idx" ON "VehicleColour" ("vehicleVariantId");

-- CreateIndex
CREATE INDEX "WheelBrand_tenantId_name_idx" ON "WheelBrand" ("tenantId", "name");

-- CreateIndex
CREATE INDEX "WheelModel_tenantId_name_idx" ON "WheelModel" ("tenantId", "name");

-- CreateIndex
CREATE INDEX "WheelModel_wheelBrandId_idx" ON "WheelModel" ("wheelBrandId");

-- CreateIndex
CREATE INDEX "WheelFinish_tenantId_name_idx" ON "WheelFinish" ("tenantId", "name");

-- CreateIndex
CREATE INDEX "WheelFinish_wheelModelId_idx" ON "WheelFinish" ("wheelModelId");

-- CreateIndex
CREATE INDEX "WheelSize_tenantId_size_idx" ON "WheelSize" ("tenantId", "size");

-- CreateIndex
CREATE INDEX "TyreBrand_tenantId_name_idx" ON "TyreBrand" ("tenantId", "name");

-- CreateIndex
CREATE INDEX "TyreModel_tenantId_name_idx" ON "TyreModel" ("tenantId", "name");

-- CreateIndex
CREATE INDEX "TyreModel_tyreBrandId_idx" ON "TyreModel" ("tyreBrandId");

-- CreateIndex
CREATE INDEX "TyreProfile_tenantId_profile_idx" ON "TyreProfile" ("tenantId", "profile");

-- CreateIndex
CREATE INDEX "TyreProfile_tyreModelId_idx" ON "TyreProfile" ("tyreModelId");

-- CreateIndex
CREATE INDEX "SavedConfiguration_tenantId_name_idx" ON "SavedConfiguration" ("tenantId", "name");

-- CreateIndex
CREATE INDEX "SavedConfiguration_vehicleVariantId_idx" ON "SavedConfiguration" ("vehicleVariantId");

-- CreateIndex
CREATE INDEX "SavedConfiguration_vehicleModelId_idx" ON "SavedConfiguration" ("vehicleModelId");

-- CreateIndex
CREATE INDEX "SavedConfiguration_wheelModelId_idx" ON "SavedConfiguration" ("wheelModelId");

-- CreateIndex
CREATE INDEX "SavedConfiguration_tyreModelId_idx" ON "SavedConfiguration" ("tyreModelId");

-- CreateIndex
CREATE INDEX "Customer_tenantId_name_idx" ON "Customer" ("tenantId", "name");

-- CreateIndex
CREATE INDEX "Customer_email_idx" ON "Customer" ("email");

-- CreateIndex
CREATE INDEX "Quote_tenantId_status_idx" ON "Quote" ("tenantId", "status");

-- CreateIndex
CREATE INDEX "Quote_customerId_idx" ON "Quote" ("customerId");

-- CreateIndex
CREATE INDEX "Quote_savedConfigurationId_idx" ON "Quote" ("savedConfigurationId");

-- CreateIndex
CREATE INDEX "Asset_tenantId_fileName_idx" ON "Asset" ("tenantId", "fileName");

-- CreateIndex
CREATE INDEX "Asset_quoteId_idx" ON "Asset" ("quoteId");

-- CreateIndex
CREATE INDEX "AuditLog_tenantId_entityType_idx" ON "AuditLog" ("tenantId", "entityType");

-- CreateIndex
CREATE INDEX "AuditLog_entityId_idx" ON "AuditLog" ("entityId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Role" ADD CONSTRAINT "Role_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Store" ADD CONSTRAINT "Store_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleManufacturer" ADD CONSTRAINT "VehicleManufacturer_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleModel" ADD CONSTRAINT "VehicleModel_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleModel" ADD CONSTRAINT "VehicleModel_vehicleManufacturerId_fkey" FOREIGN KEY ("vehicleManufacturerId") REFERENCES "VehicleManufacturer" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleVariant" ADD CONSTRAINT "VehicleVariant_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleVariant" ADD CONSTRAINT "VehicleVariant_vehicleModelId_fkey" FOREIGN KEY ("vehicleModelId") REFERENCES "VehicleModel" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleColour" ADD CONSTRAINT "VehicleColour_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleColour" ADD CONSTRAINT "VehicleColour_vehicleVariantId_fkey" FOREIGN KEY ("vehicleVariantId") REFERENCES "VehicleVariant" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WheelBrand" ADD CONSTRAINT "WheelBrand_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WheelModel" ADD CONSTRAINT "WheelModel_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WheelModel" ADD CONSTRAINT "WheelModel_wheelBrandId_fkey" FOREIGN KEY ("wheelBrandId") REFERENCES "WheelBrand" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WheelFinish" ADD CONSTRAINT "WheelFinish_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WheelFinish" ADD CONSTRAINT "WheelFinish_wheelModelId_fkey" FOREIGN KEY ("wheelModelId") REFERENCES "WheelModel" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WheelSize" ADD CONSTRAINT "WheelSize_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TyreBrand" ADD CONSTRAINT "TyreBrand_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TyreModel" ADD CONSTRAINT "TyreModel_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TyreModel" ADD CONSTRAINT "TyreModel_tyreBrandId_fkey" FOREIGN KEY ("tyreBrandId") REFERENCES "TyreBrand" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TyreProfile" ADD CONSTRAINT "TyreProfile_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TyreProfile" ADD CONSTRAINT "TyreProfile_tyreModelId_fkey" FOREIGN KEY ("tyreModelId") REFERENCES "TyreModel" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedConfiguration" ADD CONSTRAINT "SavedConfiguration_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedConfiguration" ADD CONSTRAINT "SavedConfiguration_vehicleVariantId_fkey" FOREIGN KEY ("vehicleVariantId") REFERENCES "VehicleVariant" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedConfiguration" ADD CONSTRAINT "SavedConfiguration_vehicleModelId_fkey" FOREIGN KEY ("vehicleModelId") REFERENCES "VehicleModel" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedConfiguration" ADD CONSTRAINT "SavedConfiguration_wheelModelId_fkey" FOREIGN KEY ("wheelModelId") REFERENCES "WheelModel" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedConfiguration" ADD CONSTRAINT "SavedConfiguration_tyreModelId_fkey" FOREIGN KEY ("tyreModelId") REFERENCES "TyreModel" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_savedConfigurationId_fkey" FOREIGN KEY ("savedConfigurationId") REFERENCES "SavedConfiguration" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
