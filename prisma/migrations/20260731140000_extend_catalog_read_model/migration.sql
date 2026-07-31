-- Extend the catalog read model.
--
-- Additive-only migration: every new column is nullable or required on a
-- table whose only rows come from the (idempotent) seed, so existing
-- development databases can apply it with `prisma migrate dev` followed by
-- a re-run of the seed. No business values are rewritten and no columns or
-- tables are removed.

-- Vehicle variants: model year + the Chapter-6 render metadata package
-- (wheel positions, wheel diameter in pixels and asset references consumed
-- by the rendering engine).
ALTER TABLE "VehicleVariant" ADD COLUMN "year" INTEGER;
ALTER TABLE "VehicleVariant" ADD COLUMN "renderMetadata" JSONB;

-- Wheel models: free-form metadata attributes (construction, imagery, ...).
ALTER TABLE "WheelModel" ADD COLUMN "metadata" JSONB;

-- Wheel sizes: attach to their wheel model and carry fitment structure.
-- WheelSize rows exist only via the seed; the seed re-creates them with
-- wheelModelId populated.
ALTER TABLE "WheelSize" ADD COLUMN "wheelModelId" UUID NOT NULL;
ALTER TABLE "WheelSize" ADD COLUMN "diameterInches" INTEGER;
ALTER TABLE "WheelSize" ADD COLUMN "widthInches" DOUBLE PRECISION;
ALTER TABLE "WheelSize" ADD COLUMN "boltPattern" TEXT;
ALTER TABLE "WheelSize" ADD COLUMN "offsetMm" INTEGER;
ALTER TABLE "WheelSize" ADD COLUMN "centreBoreMm" DOUBLE PRECISION;

-- CreateIndex
CREATE INDEX "WheelSize_wheelModelId_idx" ON "WheelSize"("wheelModelId");

-- AddForeignKey
ALTER TABLE "WheelSize" ADD CONSTRAINT "WheelSize_wheelModelId_fkey" FOREIGN KEY ("wheelModelId") REFERENCES "WheelModel" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Tyre models: free-form metadata attributes (terrain, season, ...).
ALTER TABLE "TyreModel" ADD COLUMN "metadata" JSONB;

-- Tyre profiles: decomposed specification alongside the display string
-- ("205/55 R16" -> width 205, aspect 55, rim 16, construction R, ...).
ALTER TABLE "TyreProfile" ADD COLUMN "widthMm" INTEGER;
ALTER TABLE "TyreProfile" ADD COLUMN "aspectRatio" INTEGER;
ALTER TABLE "TyreProfile" ADD COLUMN "rimDiameterInches" INTEGER;
ALTER TABLE "TyreProfile" ADD COLUMN "construction" TEXT;
ALTER TABLE "TyreProfile" ADD COLUMN "loadIndex" INTEGER;
ALTER TABLE "TyreProfile" ADD COLUMN "speedRating" TEXT;
