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
});
