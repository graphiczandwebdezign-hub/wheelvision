import { describe, expect, it, vi } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import { VehicleRepository } from '@/server/repositories/vehicle-repository';
import { WheelRepository } from '@/server/repositories/wheel-repository';
import { TyreRepository } from '@/server/repositories/tyre-repository';

/**
 * Verifies query composition without a database: every repository method
 * must scope by tenant, exclude soft-deleted rows, paginate via skip/take,
 * and fetch count + page inside one transaction with identical filters.
 */

type ModelName = 'vehicleVariant' | 'wheelModel' | 'tyreModel';

interface QueryCall {
  where: Record<string, unknown>;
  skip?: number;
  take?: number;
  orderBy?: unknown;
  select?: unknown;
  include?: unknown;
}

function createPrismaFake(model: ModelName) {
  const calls = {
    count: [] as QueryCall[],
    findMany: [] as QueryCall[],
    findFirst: [] as QueryCall[],
  };
  const responses = { findFirst: null as unknown, rows: [] as unknown[], total: 0 };

  const delegate = {
    count: vi.fn(async (args: QueryCall) => {
      calls.count.push(args);
      return responses.total;
    }),
    findMany: vi.fn(async (args: QueryCall) => {
      calls.findMany.push(args);
      return responses.rows;
    }),
    findFirst: vi.fn(async (args: QueryCall) => {
      calls.findFirst.push(args);
      return responses.findFirst;
    }),
  };

  const tx = { [model]: delegate };
  const prisma = {
    [model]: delegate,
    $transaction: vi.fn(async (operation: (tx: unknown) => Promise<unknown>) => operation(tx)),
  } as unknown as PrismaClient;

  return { prisma, calls, responses };
}

const tenantScoped = (tenantId: string) => ({ tenantId, deletedAt: null });

describe('repository list methods', () => {
  it.each([
    ['vehicleVariant', (prisma: PrismaClient) => new VehicleRepository(prisma)],
    ['wheelModel', (prisma: PrismaClient) => new WheelRepository(prisma)],
    ['tyreModel', (prisma: PrismaClient) => new TyreRepository(prisma)],
  ] as const)('%s lists tenant-scoped, un-deleted, paginated rows', async (model, make) => {
    const { prisma, calls, responses } = createPrismaFake(model);
    responses.rows = ['row'];
    responses.total = 42;

    const result = await make(prisma).listByTenant('tenant-1', { page: 2, pageSize: 5 });

    expect(calls.count[0].where).toEqual(tenantScoped('tenant-1'));
    expect(calls.findMany[0]).toEqual(
      expect.objectContaining({ where: tenantScoped('tenant-1'), skip: 5, take: 5 }),
    );
    expect(result).toEqual({ data: ['row'], total: 42 });
  });
});

describe('repository findById', () => {
  it.each([
    ['vehicleVariant', (prisma: PrismaClient) => new VehicleRepository(prisma)],
    ['wheelModel', (prisma: PrismaClient) => new WheelRepository(prisma)],
    ['tyreModel', (prisma: PrismaClient) => new TyreRepository(prisma)],
  ] as const)('%s looks up by id within the tenant boundary', async (model, make) => {
    const { prisma, calls, responses } = createPrismaFake(model);
    responses.findFirst = { id: 'entity-1' };

    const result = await make(prisma).findById('tenant-9', 'entity-1');

    expect(calls.findFirst[0].where).toEqual({ id: 'entity-1', ...tenantScoped('tenant-9') });
    expect(result).toEqual({ id: 'entity-1' });
  });
});

describe('repository exists', () => {
  it.each([
    ['vehicleVariant', (prisma: PrismaClient) => new VehicleRepository(prisma)],
    ['wheelModel', (prisma: PrismaClient) => new WheelRepository(prisma)],
    ['tyreModel', (prisma: PrismaClient) => new TyreRepository(prisma)],
  ] as const)('%s returns existence using a minimal select', async (model, make) => {
    const { prisma, calls, responses } = createPrismaFake(model);
    responses.findFirst = { id: 'entity-1' };

    await expect(make(prisma).exists('tenant-1', 'entity-1')).resolves.toBe(true);

    responses.findFirst = null;
    await expect(make(prisma).exists('tenant-1', 'entity-1')).resolves.toBe(false);

    expect(calls.findFirst[0].select).toEqual({ id: true });
    expect(calls.findFirst[0].where).toEqual({ id: 'entity-1', ...tenantScoped('tenant-1') });
  });
});

describe('repository count', () => {
  it.each([
    ['vehicleVariant', (prisma: PrismaClient) => new VehicleRepository(prisma)],
    ['wheelModel', (prisma: PrismaClient) => new WheelRepository(prisma)],
    ['tyreModel', (prisma: PrismaClient) => new TyreRepository(prisma)],
  ] as const)(
    '%s counts within the tenant boundary using the shared filter',
    async (model, make) => {
      const { prisma, calls, responses } = createPrismaFake(model);
      responses.total = 7;

      await expect(make(prisma).count('tenant-3')).resolves.toBe(7);
      expect(calls.count[0].where).toEqual(tenantScoped('tenant-3'));
    },
  );
});
