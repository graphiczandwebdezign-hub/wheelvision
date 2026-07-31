import { describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

/**
 * API-level tests for the catalog endpoints: each controller is exercised
 * with a mocked Prisma module so the full HTTP → tenant resolution →
 * validation → repository → envelope path is covered without a database.
 * Tenant isolation is asserted by inspecting the where-clauses the tenant
 * context produces inside the repositories.
 */

const TENANT_ID = '11111111-1111-4111-8111-111111111111';
const VEHICLE_ID = '22222222-2222-4222-8222-222222222222';
const WHEEL_ID = '33333333-3333-4333-8333-333333333333';

const prismaMock = vi.hoisted(() => {
  const delegate = () => ({ findMany: vi.fn(), findFirst: vi.fn(), count: vi.fn() });
  return {
    tenant: { findUnique: vi.fn() },
    vehicleVariant: delegate(),
    wheelModel: delegate(),
    tyreModel: delegate(),
  };
});

vi.mock('@/server/utils/prisma', () => {
  const tx = {
    vehicleVariant: prismaMock.vehicleVariant,
    wheelModel: prismaMock.wheelModel,
    tyreModel: prismaMock.tyreModel,
  };
  return {
    prisma: {
      ...tx,
      tenant: prismaMock.tenant,
      $transaction: (operation: (tx: unknown) => Promise<unknown>) => operation(tx),
    },
  };
});

import { GET as listVehicles } from '@/server/controllers/vehicle-controller';
import { GET as vehicleDetail } from '@/server/controllers/vehicle-detail-controller';
import { GET as listWheels } from '@/server/controllers/wheel-controller';
import { GET as wheelDetail } from '@/server/controllers/wheel-detail-controller';
import { GET as listTyres } from '@/server/controllers/tyre-controller';

const createdAt = new Date('2024-01-01T00:00:00.000Z');

const vehicleRecord = {
  id: VEHICLE_ID,
  name: 'SR5 Double Cab',
  year: 2025,
  wheelDiameterMm: 455,
  renderMetadata: {
    wheelDiameter: 455,
    frontWheel: { x: 840, y: 1375 },
    rearWheel: { x: 3090, y: 1375 },
    bodyImage: '/vehicles/toyota/hilux/2025/vehicle.webp',
    maskImage: '/vehicles/toyota/hilux/2025/mask.webp',
    shadowImage: '/vehicles/toyota/hilux/2025/shadow.webp',
  },
  model: { name: 'Hilux', manufacturer: { name: 'Toyota' } },
  colours: [{ name: 'Silver' }],
  createdAt,
  updatedAt: createdAt,
};

function detailContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

const json = (response: Response) => response.json();

describe('catalog API', () => {
  it('resolves the configured default tenant for list requests', async () => {
    prismaMock.tenant.findUnique.mockResolvedValue({ id: TENANT_ID });
    prismaMock.vehicleVariant.count.mockResolvedValue(1);
    prismaMock.vehicleVariant.findMany.mockResolvedValue([vehicleRecord]);

    const response = await listVehicles(
      new NextRequest('http://localhost:3000/api/vehicles?page=2&pageSize=5'),
    );
    const body = await json(response);

    expect(response.status).toBe(200);
    expect(prismaMock.tenant.findUnique).toHaveBeenCalledWith({
      where: { slug: 'demo-tenant' },
      select: { id: true },
    });
    expect(body.success).toBe(true);
    expect(body.meta).toEqual({ page: 2, pageSize: 5, total: 1, totalPages: 1 });
    expect(body.data[0]).toMatchObject({ id: VEHICLE_ID, manufacturer: 'Toyota' });
  });

  it('scopes every list query by the resolved tenant (isolation)', async () => {
    prismaMock.tenant.findUnique.mockResolvedValue({ id: TENANT_ID });
    prismaMock.vehicleVariant.count.mockResolvedValue(0);
    prismaMock.vehicleVariant.findMany.mockResolvedValue([]);

    await listVehicles(new NextRequest('http://localhost:3000/api/vehicles'));

    expect(prismaMock.vehicleVariant.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { tenantId: TENANT_ID, deletedAt: null } }),
    );
    expect(prismaMock.vehicleVariant.count).toHaveBeenCalledWith({
      where: { tenantId: TENANT_ID, deletedAt: null },
    });
  });

  it('honours an explicit x-tenant-slug header', async () => {
    prismaMock.tenant.findUnique.mockResolvedValue({ id: TENANT_ID });
    prismaMock.vehicleVariant.count.mockResolvedValue(0);
    prismaMock.vehicleVariant.findMany.mockResolvedValue([]);

    await listVehicles(
      new NextRequest('http://localhost:3000/api/vehicles', {
        headers: { 'x-tenant-slug': 'acme-wheels' },
      }),
    );

    expect(prismaMock.tenant.findUnique).toHaveBeenCalledWith({
      where: { slug: 'acme-wheels' },
      select: { id: true },
    });
  });

  it('returns 400 VALIDATION_ERROR for invalid pagination', async () => {
    const response = await listVehicles(
      new NextRequest('http://localhost:3000/api/vehicles?page=abc'),
    );
    const body = await json(response);

    expect(response.status).toBe(400);
    expect(body).toMatchObject({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Request validation failed' },
    });
    expect(body.error.details.fieldErrors.page).toBeDefined();
  });

  it('returns 404 TENANT_NOT_FOUND for an unknown tenant slug', async () => {
    prismaMock.tenant.findUnique.mockResolvedValue(null);

    const response = await listWheels(
      new NextRequest('http://localhost:3000/api/wheels', {
        headers: { 'x-tenant-slug': 'ghost' },
      }),
    );
    const body = await json(response);

    expect(response.status).toBe(404);
    expect(body).toMatchObject({
      success: false,
      error: { code: 'TENANT_NOT_FOUND', details: { tenantSlug: 'ghost' } },
    });
  });

  it('returns the vehicle detail with render metadata in a success envelope', async () => {
    prismaMock.tenant.findUnique.mockResolvedValue({ id: TENANT_ID });
    prismaMock.vehicleVariant.findFirst.mockResolvedValue(vehicleRecord);

    const response = await vehicleDetail(
      new NextRequest(`http://localhost:3000/api/vehicles/${VEHICLE_ID}`),
      detailContext(VEHICLE_ID),
    );
    const body = await json(response);

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      success: true,
      meta: {},
      data: {
        id: VEHICLE_ID,
        year: 2025,
        renderMetadata: { frontWheel: { x: 840, y: 1375 }, wheelDiameter: 455 },
      },
    });
    expect(prismaMock.vehicleVariant.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: VEHICLE_ID, tenantId: TENANT_ID, deletedAt: null } }),
    );
  });

  it('returns 400 for a malformed vehicle id', async () => {
    const response = await vehicleDetail(
      new NextRequest('http://localhost:3000/api/vehicles/not-a-uuid'),
      detailContext('not-a-uuid'),
    );
    const body = await json(response);

    expect(response.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 404 NOT_FOUND for a missing vehicle', async () => {
    prismaMock.tenant.findUnique.mockResolvedValue({ id: TENANT_ID });
    prismaMock.vehicleVariant.findFirst.mockResolvedValue(null);

    const response = await vehicleDetail(
      new NextRequest(`http://localhost:3000/api/vehicles/${VEHICLE_ID}`),
      detailContext(VEHICLE_ID),
    );
    const body = await json(response);

    expect(response.status).toBe(404);
    expect(body).toMatchObject({
      success: false,
      error: { code: 'NOT_FOUND', details: { vehicleId: VEHICLE_ID } },
    });
  });

  it('serves the wheel list', async () => {
    prismaMock.tenant.findUnique.mockResolvedValue({ id: TENANT_ID });
    prismaMock.wheelModel.count.mockResolvedValue(1);
    prismaMock.wheelModel.findMany.mockResolvedValue([
      {
        id: WHEEL_ID,
        name: 'R5',
        metadata: null,
        brand: { name: 'Rota' },
        finishes: [{ name: 'Gloss Black' }],
        createdAt,
        updatedAt: createdAt,
      },
    ]);

    const response = await listWheels(new NextRequest('http://localhost:3000/api/wheels'));
    const body = await json(response);

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data[0]).toMatchObject({ brand: 'Rota', model: 'R5', finishes: ['Gloss Black'] });
  });

  it('serves the wheel detail with sizes', async () => {
    prismaMock.tenant.findUnique.mockResolvedValue({ id: TENANT_ID });
    prismaMock.wheelModel.findFirst.mockResolvedValue({
      id: WHEEL_ID,
      name: 'R5',
      metadata: { construction: 'cast aluminium' },
      brand: { name: 'Rota' },
      finishes: [{ name: 'Gloss Black' }],
      sizes: [
        {
          id: 'size-1',
          size: '17x8',
          diameterInches: 17,
          widthInches: 8,
          boltPattern: '6x139.7',
          offsetMm: 30,
          centreBoreMm: 106.1,
        },
      ],
      createdAt,
      updatedAt: createdAt,
    });

    const response = await wheelDetail(
      new NextRequest(`http://localhost:3000/api/wheels/${WHEEL_ID}`),
      detailContext(WHEEL_ID),
    );
    const body = await json(response);

    expect(response.status).toBe(200);
    expect(body.data).toMatchObject({
      sizes: [{ size: '17x8', boltPattern: '6x139.7' }],
      boltPatterns: ['6x139.7'],
      offsetsMm: [30],
      pricing: null,
    });
  });

  it('serves the tyre list', async () => {
    prismaMock.tenant.findUnique.mockResolvedValue({ id: TENANT_ID });
    prismaMock.tyreModel.count.mockResolvedValue(1);
    prismaMock.tyreModel.findMany.mockResolvedValue([
      {
        id: '44444444-4444-4444-8444-444444444444',
        name: 'Pilot Sport 4',
        metadata: null,
        brand: { name: 'Michelin' },
        profiles: [{ profile: '205/55 R16' }],
        createdAt,
        updatedAt: createdAt,
      },
    ]);

    const response = await listTyres(new NextRequest('http://localhost:3000/api/tyres'));
    const body = await json(response);

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data[0]).toMatchObject({
      brand: 'Michelin',
      pattern: 'Pilot Sport 4',
      profiles: ['205/55 R16'],
    });
  });
});
