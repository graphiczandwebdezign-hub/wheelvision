import { randomUUID } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { seedDatabase, type SeedClient } from '@/prisma/seed';

type SeedRecord = { id: string } & Record<string, unknown>;

/**
 * In-memory SeedClient with real upsert semantics (keyed on the same
 * unique where-clauses the production constraints enforce). Running the
 * seed against it twice must never create duplicates.
 */
function createFakeSeedClient() {
  const stores: Record<string, Map<string, SeedRecord>> = {};

  function delegate(name: string) {
    const records = new Map<string, SeedRecord>();
    stores[name] = records;
    return {
      upsert: vi.fn(
        async ({
          where,
          create,
          update,
        }: {
          where: Record<string, unknown>;
          create: Record<string, unknown>;
          update: Record<string, unknown>;
        }) => {
          const key = JSON.stringify(where);
          const existing = records.get(key);
          if (existing) {
            Object.assign(existing, update);
            return existing;
          }
          const record: SeedRecord = { id: randomUUID(), ...create };
          records.set(key, record);
          return record;
        },
      ),
    };
  }

  const client: SeedClient = {
    tenant: delegate('tenant'),
    vehicleManufacturer: delegate('vehicleManufacturer'),
    vehicleModel: delegate('vehicleModel'),
    vehicleVariant: delegate('vehicleVariant'),
    vehicleColour: delegate('vehicleColour'),
    wheelBrand: delegate('wheelBrand'),
    wheelModel: delegate('wheelModel'),
    wheelFinish: delegate('wheelFinish'),
    wheelSize: delegate('wheelSize'),
    tyreBrand: delegate('tyreBrand'),
    tyreModel: delegate('tyreModel'),
    tyreProfile: delegate('tyreProfile'),
    savedConfiguration: delegate('savedConfiguration'),
    customer: delegate('customer'),
    priceList: delegate('priceList'),
    wheelPrice: delegate('wheelPrice'),
    tyrePrice: delegate('tyrePrice'),
    labourPrice: delegate('labourPrice'),
  };

  return { client, stores };
}

const EXPECTED_SIZES: Record<string, number> = {
  tenant: 1,
  vehicleManufacturer: 1,
  vehicleModel: 1,
  vehicleVariant: 1,
  vehicleColour: 2,
  wheelBrand: 1,
  wheelModel: 1,
  wheelFinish: 2,
  wheelSize: 2,
  tyreBrand: 1,
  tyreModel: 1,
  tyreProfile: 2,
  savedConfiguration: 1,
  customer: 1,
  priceList: 1,
  wheelPrice: 2,
  tyrePrice: 2,
  labourPrice: 3,
};

describe('database seed', () => {
  it('creates exactly one copy of every record', async () => {
    const { client, stores } = createFakeSeedClient();

    await seedDatabase(client);

    for (const [name, size] of Object.entries(EXPECTED_SIZES)) {
      expect(stores[name].size, name).toBe(size);
    }
  });

  it('is idempotent: a second run creates no new records and keeps stable ids', async () => {
    const { client, stores } = createFakeSeedClient();

    await seedDatabase(client);
    const firstRunIds = Object.fromEntries(
      Object.entries(stores).map(([name, records]) => [
        name,
        [...records.values()].map((record) => record.id),
      ]),
    );

    await seedDatabase(client);

    for (const [name, size] of Object.entries(EXPECTED_SIZES)) {
      expect(stores[name].size, name).toBe(size);
      expect([...stores[name].values()].map((record) => record.id)).toEqual(firstRunIds[name]);
    }
  });

  it('wires relations between seeded records', async () => {
    const { client, stores } = createFakeSeedClient();

    await seedDatabase(client);

    const tenantId = [...stores.tenant.values()][0].id;
    const variant = [...stores.vehicleVariant.values()][0];
    const wheelModel = [...stores.wheelModel.values()][0];
    const tyreModel = [...stores.tyreModel.values()][0];
    const configuration = [...stores.savedConfiguration.values()][0];

    expect(variant.tenantId).toBe(tenantId);
    expect(variant.year).toBe(2025);
    expect(variant.renderMetadata).toMatchObject({
      wheelDiameter: 455,
      frontWheel: { x: 840, y: 1375 },
      bodyImage: '/vehicles/toyota/hilux/2025/vehicle.webp',
    });
    expect(configuration.tenantId).toBe(tenantId);
    expect(configuration.vehicleVariantId).toBe(variant.id);
    expect([...stores.vehicleColour.values()].every((c) => c.vehicleVariantId === variant.id)).toBe(
      true,
    );
    expect([...stores.wheelSize.values()].every((s) => s.wheelModelId === wheelModel.id)).toBe(
      true,
    );
    expect([...stores.tyreProfile.values()].every((p) => p.tyreModelId === tyreModel.id)).toBe(
      true,
    );
  });

  it('seeds a complete retail price book for the quote domain', async () => {
    const { client, stores } = createFakeSeedClient();

    await seedDatabase(client);

    const tenantId = [...stores.tenant.values()][0].id;
    const priceList = [...stores.priceList.values()][0];
    const wheelModel = [...stores.wheelModel.values()][0];
    const tyreModel = [...stores.tyreModel.values()][0];
    const wheelSizes = [...stores.wheelSize.values()];
    const tyreProfiles = [...stores.tyreProfile.values()];

    expect(priceList).toMatchObject({
      tenantId,
      name: 'Retail Price List',
      kind: 'RETAIL',
      currency: 'ZAR',
      isDefault: true,
      active: true,
    });

    const wheelPrices = [...stores.wheelPrice.values()];
    expect(wheelPrices.every((p) => p.priceListId === priceList.id)).toBe(true);
    expect(wheelPrices.every((p) => p.wheelModelId === wheelModel.id)).toBe(true);
    expect(wheelPrices.map((p) => p.wheelSizeId).sort()).toEqual(
      wheelSizes.map((size) => size.id).sort(),
    );
    expect(
      wheelPrices.map((p) => p.amountCents).sort((a, b) => (a as number) - (b as number)),
    ).toEqual([295000, 345000]);

    const tyrePrices = [...stores.tyrePrice.values()];
    expect(tyrePrices.every((p) => p.priceListId === priceList.id)).toBe(true);
    expect(tyrePrices.map((p) => p.tyreProfileId).sort()).toEqual(
      tyreProfiles.map((profile) => profile.id).sort(),
    );
    expect(
      tyrePrices.map((p) => p.amountCents).sort((a, b) => (a as number) - (b as number)),
    ).toEqual([215000, 265000]);

    const labour = [...stores.labourPrice.values()];
    expect(labour).toHaveLength(3);
    expect(labour.every((rate) => rate.priceListId === priceList.id)).toBe(true);
    const byService = Object.fromEntries(labour.map((rate) => [rate.serviceType, rate]));
    expect(byService.FITMENT).toMatchObject({ unit: 'PER_WHEEL', amountCents: 25000 });
    expect(byService.BALANCING).toMatchObject({ unit: 'PER_WHEEL', amountCents: 15000 });
    expect(byService.ALIGNMENT).toMatchObject({ unit: 'PER_VEHICLE', amountCents: 95000 });
  });
});
