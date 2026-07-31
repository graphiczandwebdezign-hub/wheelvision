import { describe, expect, it, vi } from 'vitest';
import { WheelService } from '@/server/services/wheel-service';
import type { WheelRepositoryPort } from '@/server/repositories/wheel-repository';

const createdAt = new Date('2024-01-01T00:00:00.000Z');
const updatedAt = new Date('2024-01-02T00:00:00.000Z');

const metadata = { construction: 'cast aluminium' };

const sizes = [
  {
    id: 'size-1',
    size: '17x8',
    diameterInches: 17,
    widthInches: 8,
    boltPattern: '6x139.7',
    offsetMm: 30,
    centreBoreMm: 106.1,
  },
  {
    id: 'size-2',
    size: '18x8.5',
    diameterInches: 18,
    widthInches: 8.5,
    boltPattern: '6x139.7',
    offsetMm: 35,
    centreBoreMm: null,
  },
];

const record = {
  id: 'wheel-1',
  name: 'R5',
  metadata,
  brand: { name: 'Rota' },
  finishes: [{ name: 'Gloss Black' }, { name: 'Matte Bronze' }],
  createdAt,
  updatedAt,
};

const summary = {
  id: 'wheel-1',
  brand: 'Rota',
  model: 'R5',
  finishes: ['Gloss Black', 'Matte Bronze'],
  createdAt: createdAt.toISOString(),
  updatedAt: updatedAt.toISOString(),
};

function repositoryOf(overrides: Partial<WheelRepositoryPort>): WheelRepositoryPort {
  return {
    listByTenant: vi.fn().mockResolvedValue({ data: [], total: 0 }),
    findById: vi.fn().mockResolvedValue(null),
    exists: vi.fn(),
    count: vi.fn(),
    ...overrides,
  };
}

describe('WheelService.listWheels', () => {
  it('maps records to summaries with all finishes and ISO timestamps', async () => {
    const repository = repositoryOf({
      listByTenant: vi.fn().mockResolvedValue({ data: [record], total: 1 }),
    });

    const result = await new WheelService(repository).listWheels('tenant-1', {
      page: 1,
      pageSize: 20,
    });

    expect(result).toEqual({ total: 1, data: [summary] });
  });
});

describe('WheelService.getWheel', () => {
  it('returns sizes plus deduplicated fitment lists and the pricing contract', async () => {
    const repository = repositoryOf({
      findById: vi.fn().mockResolvedValue({ ...record, sizes }),
    });

    const detail = await new WheelService(repository).getWheel('tenant-1', 'wheel-1');

    expect(detail).toEqual({
      ...summary,
      sizes,
      boltPatterns: ['6x139.7'],
      offsetsMm: [30, 35],
      centreBoresMm: [106.1],
      metadata,
      pricing: null,
    });
  });

  it('returns empty fitment lists when there are no sizes', async () => {
    const repository = repositoryOf({
      findById: vi.fn().mockResolvedValue({ ...record, sizes: [] }),
    });

    const detail = await new WheelService(repository).getWheel('tenant-1', 'wheel-1');

    expect(detail.sizes).toEqual([]);
    expect(detail.boltPatterns).toEqual([]);
    expect(detail.offsetsMm).toEqual([]);
    expect(detail.centreBoresMm).toEqual([]);
  });

  it('returns null metadata for non-object stored values', async () => {
    const repository = repositoryOf({
      findById: vi.fn().mockResolvedValue({ ...record, metadata: 'unexpected', sizes: [] }),
    });

    const detail = await new WheelService(repository).getWheel('tenant-1', 'wheel-1');

    expect(detail.metadata).toBeNull();
  });

  it('throws NOT_FOUND for a missing wheel', async () => {
    const repository = repositoryOf({ findById: vi.fn().mockResolvedValue(null) });

    await expect(
      new WheelService(repository).getWheel('tenant-1', 'missing'),
    ).rejects.toMatchObject({ code: 'NOT_FOUND', statusCode: 404 });
  });
});
