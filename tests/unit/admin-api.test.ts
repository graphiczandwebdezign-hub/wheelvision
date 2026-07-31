import { describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/server/utils/prisma', () => {
  const prismaFake = {
    quote: {
      findMany: vi.fn(async () => [
        {
          id: 'q-1',
          quoteNumber: 'WV-2026-000001',
          status: 'ACCEPTED',
          subtotalCents: 625500,
          createdAt: new Date(),
          customer: { name: 'Mrs Nkosi' },
          snapshot: { payload: { wheel: { brand: 'Rays' }, tyre: { brand: 'Michelin' } } },
        },
      ]),
    },
    wheelBrand: { findMany: vi.fn(async () => [{ name: 'Rays' }]) },
    tyreBrand: { findMany: vi.fn(async () => [{ name: 'Michelin' }]) },
    vehicleVariant: { findMany: vi.fn(async () => []) },
    wheelModel: { findMany: vi.fn(async () => []) },
    tyreModel: { findMany: vi.fn(async () => []) },
    priceList: { findFirst: vi.fn(async () => null) },
    discountRule: { findMany: vi.fn(async () => []) },
    user: { findMany: vi.fn(async () => []) },
    tenantSettings: {
      findUnique: vi.fn(async () => ({
        dealerName: 'Demo Dealership',
        currency: 'ZAR',
        quoteValidityDays: 30,
      })),
      upsert: vi.fn(async (args) => args.create),
    },
    tenant: {
      findUnique: vi.fn(async () => ({ id: 'tenant-1', name: 'Demo Tenant', slug: 'demo-tenant' })),
    },
  };
  return { prisma: prismaFake };
});

import { GET as getDashboard } from '@/app/api/admin/dashboard/route';
import { GET as getSettings } from '@/app/api/admin/settings/route';

describe('Admin API Endpoints', () => {
  it('returns dashboard metrics envelope', async () => {
    const req = new NextRequest('http://localhost/api/admin/dashboard', {
      headers: { 'x-tenant-slug': 'demo-tenant' },
    });
    const res = await getDashboard(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.totalQuotes).toBe(1);
    expect(json.data.acceptedQuotes).toBe(1);
  });

  it('returns tenant settings envelope', async () => {
    const req = new NextRequest('http://localhost/api/admin/settings', {
      headers: { 'x-tenant-slug': 'demo-tenant' },
    });
    const res = await getSettings(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.dealerName).toBe('Demo Dealership');
  });
});
