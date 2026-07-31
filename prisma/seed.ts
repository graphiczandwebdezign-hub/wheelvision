import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { logger } from '../lib/logger';
import { vehicleRenderMetadataSchema } from '../types/render-metadata';

/**
 * Authored vehicle package (vehicles/{manufacturer}/{model}/{year}/) — the
 * single source of vehicle truth. The seed validates it and stores it on the
 * variant; the running application only ever reads the database.
 */
const authoredVehiclePackageSchema = vehicleRenderMetadataSchema.extend({
  id: z.string().min(1),
  manufacturer: z.string().min(1),
  model: z.string().min(1),
  year: z.number().int(),
});

function loadAuthoredVehiclePackage() {
  const packageDir = join(dirname(fileURLToPath(import.meta.url)), '../vehicles/toyota/hilux/2025');
  const raw = JSON.parse(readFileSync(join(packageDir, 'metadata.json'), 'utf8'));
  const parsed = authoredVehiclePackageSchema.parse(raw);

  const assetUrl = (fileName: string) =>
    `/vehicles/${parsed.manufacturer.toLowerCase()}/${parsed.model.toLowerCase()}/${parsed.year}/${fileName}`;

  return {
    ...parsed,
    renderMetadata: {
      wheelDiameter: parsed.wheelDiameter,
      frontWheel: parsed.frontWheel,
      rearWheel: parsed.rearWheel,
      bodyImage: assetUrl(parsed.bodyImage),
      maskImage: assetUrl(parsed.maskImage),
      shadowImage: assetUrl(parsed.shadowImage),
    },
  };
}

/**
 * Idempotent seed: every write is an upsert keyed on a tenant-scoped unique
 * constraint (see migration 20260731130000_add_tenant_scoped_unique_constraints),
 * so running the seed any number of times produces exactly one copy of each
 * record and refreshes mutable display fields.
 */

type SeedRecord = { id: string } & Record<string, unknown>;

interface SeedDelegate {
  upsert(args: {
    where: Record<string, unknown>;
    create: Record<string, unknown>;
    update: Record<string, unknown>;
  }): Promise<SeedRecord>;
}

/** Structural subset of PrismaClient used by the seed — also easy to fake in tests. */
export interface SeedClient {
  tenant: SeedDelegate;
  vehicleManufacturer: SeedDelegate;
  vehicleModel: SeedDelegate;
  vehicleVariant: SeedDelegate;
  vehicleColour: SeedDelegate;
  wheelBrand: SeedDelegate;
  wheelModel: SeedDelegate;
  wheelFinish: SeedDelegate;
  wheelSize: SeedDelegate;
  tyreBrand: SeedDelegate;
  tyreModel: SeedDelegate;
  tyreProfile: SeedDelegate;
  savedConfiguration: SeedDelegate;
  customer: SeedDelegate;
}

export async function seedDatabase(prisma: SeedClient): Promise<void> {
  const vehicle = loadAuthoredVehiclePackage();

  const tenant = await prisma.tenant.upsert({
    where: { slug: 'demo-tenant' },
    create: { name: 'Demo Tenant', slug: 'demo-tenant' },
    update: { name: 'Demo Tenant' },
  });
  const tenantId = tenant.id;

  const manufacturer = await prisma.vehicleManufacturer.upsert({
    where: { tenantId_name: { tenantId, name: vehicle.manufacturer } },
    create: { tenantId, name: vehicle.manufacturer },
    update: {},
  });

  const model = await prisma.vehicleModel.upsert({
    where: {
      tenantId_vehicleManufacturerId_name: {
        tenantId,
        vehicleManufacturerId: manufacturer.id,
        name: vehicle.model,
      },
    },
    create: { tenantId, vehicleManufacturerId: manufacturer.id, name: vehicle.model },
    update: {},
  });

  const variant = await prisma.vehicleVariant.upsert({
    where: {
      tenantId_vehicleModelId_name: {
        tenantId,
        vehicleModelId: model.id,
        name: 'SR5 Double Cab',
      },
    },
    create: {
      tenantId,
      vehicleModelId: model.id,
      name: 'SR5 Double Cab',
      year: vehicle.year,
      wheelDiameterMm: vehicle.renderMetadata.wheelDiameter,
      renderMetadata: vehicle.renderMetadata,
    },
    update: {
      year: vehicle.year,
      wheelDiameterMm: vehicle.renderMetadata.wheelDiameter,
      renderMetadata: vehicle.renderMetadata,
    },
  });

  for (const colour of ['Silver', 'Black']) {
    await prisma.vehicleColour.upsert({
      where: {
        tenantId_vehicleVariantId_name: { tenantId, vehicleVariantId: variant.id, name: colour },
      },
      create: { tenantId, vehicleVariantId: variant.id, name: colour },
      update: {},
    });
  }

  const wheelBrand = await prisma.wheelBrand.upsert({
    where: { tenantId_name: { tenantId, name: 'Rota' } },
    create: { tenantId, name: 'Rota' },
    update: {},
  });

  const wheelModel = await prisma.wheelModel.upsert({
    where: {
      tenantId_wheelBrandId_name: { tenantId, wheelBrandId: wheelBrand.id, name: 'R5' },
    },
    create: {
      tenantId,
      wheelBrandId: wheelBrand.id,
      name: 'R5',
      metadata: { construction: 'cast aluminium', spokeDesign: 'split five-spoke' },
    },
    update: { metadata: { construction: 'cast aluminium', spokeDesign: 'split five-spoke' } },
  });

  for (const finish of ['Gloss Black', 'Matte Bronze']) {
    await prisma.wheelFinish.upsert({
      where: {
        tenantId_wheelModelId_name: { tenantId, wheelModelId: wheelModel.id, name: finish },
      },
      create: { tenantId, wheelModelId: wheelModel.id, name: finish },
      update: {},
    });
  }

  const wheelSizes = [
    {
      size: '17x8',
      diameterInches: 17,
      widthInches: 8,
      boltPattern: '6x139.7',
      offsetMm: 30,
      centreBoreMm: 106.1,
    },
    {
      size: '18x8.5',
      diameterInches: 18,
      widthInches: 8.5,
      boltPattern: '6x139.7',
      offsetMm: 35,
      centreBoreMm: 106.1,
    },
  ];

  for (const spec of wheelSizes) {
    await prisma.wheelSize.upsert({
      where: { tenantId_size: { tenantId, size: spec.size } },
      create: { tenantId, wheelModelId: wheelModel.id, ...spec },
      update: { wheelModelId: wheelModel.id, ...spec },
    });
  }

  const tyreBrand = await prisma.tyreBrand.upsert({
    where: { tenantId_name: { tenantId, name: 'Michelin' } },
    create: { tenantId, name: 'Michelin' },
    update: {},
  });

  const tyreModel = await prisma.tyreModel.upsert({
    where: {
      tenantId_tyreBrandId_name: { tenantId, tyreBrandId: tyreBrand.id, name: 'Pilot Sport 4' },
    },
    create: {
      tenantId,
      tyreBrandId: tyreBrand.id,
      name: 'Pilot Sport 4',
      metadata: { terrain: 'highway', season: 'summer' },
    },
    update: { metadata: { terrain: 'highway', season: 'summer' } },
  });

  const tyreProfiles = [
    {
      profile: '205/55 R16',
      widthMm: 205,
      aspectRatio: 55,
      rimDiameterInches: 16,
      construction: 'R',
      loadIndex: 91,
      speedRating: 'V',
    },
    {
      profile: '225/60 R17',
      widthMm: 225,
      aspectRatio: 60,
      rimDiameterInches: 17,
      construction: 'R',
      loadIndex: 99,
      speedRating: 'H',
    },
  ];

  for (const spec of tyreProfiles) {
    await prisma.tyreProfile.upsert({
      where: {
        tenantId_tyreModelId_profile: {
          tenantId,
          tyreModelId: tyreModel.id,
          profile: spec.profile,
        },
      },
      create: { tenantId, tyreModelId: tyreModel.id, ...spec },
      update: { ...spec },
    });
  }

  await prisma.savedConfiguration.upsert({
    where: { tenantId_name: { tenantId, name: 'Hilux Premium Fitment' } },
    create: {
      tenantId,
      vehicleVariantId: variant.id,
      vehicleModelId: model.id,
      wheelModelId: wheelModel.id,
      tyreModelId: tyreModel.id,
      name: 'Hilux Premium Fitment',
    },
    update: {
      vehicleVariantId: variant.id,
      vehicleModelId: model.id,
      wheelModelId: wheelModel.id,
      tyreModelId: tyreModel.id,
    },
  });

  await prisma.customer.upsert({
    where: { tenantId_email: { tenantId, email: 'alex@example.com' } },
    create: {
      tenantId,
      name: 'Alex Roberts',
      email: 'alex@example.com',
      phone: '+61123456789',
    },
    update: { name: 'Alex Roberts', phone: '+61123456789' },
  });

  logger.info('seed complete', { tenantSlug: 'demo-tenant' });
}

const isDirectRun = process.argv[1]
  ? import.meta.url === pathToFileURL(process.argv[1]).href
  : false;

if (isDirectRun) {
  const prisma = new PrismaClient();
  seedDatabase(prisma as unknown as SeedClient)
    .then(async () => {
      await prisma.$disconnect();
    })
    .catch(async (error) => {
      logger.error('seed failed', { error });
      await prisma.$disconnect();
      process.exit(1);
    });
}
