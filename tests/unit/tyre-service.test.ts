import { describe, expect, it, vi } from 'vitest';
import { TyreService } from '@/server/services/tyre-service';
import type { TyreRepositoryPort } from '@/server/repositories/tyre-repository';

const createdAt = new Date('2024-01-01T00:00:00.000Z');
const updatedAt = new Date('2024-01-02T00:00:00.000Z');

const metadata = { terrain: 'highway', season: 'summer' };

const profiles = [
  {
    id: 'profile-1',
    profile: '205/55 R16',
    widthMm: 205,
    aspectRatio: 55,
    rimDiameterInches: 16,
    construction: 'R',
    loadIndex: 91,
    speedRating: 'V',
  },
];

const record = {
  id: 'tyre-1',
  name: 'Pilot Sport 4',
  metadata,
  brand: { name: 'Michelin' },
  profiles,
  createdAt,
  updatedAt,
};

describe('TyreService.listTyres', () => {
  it('maps records to summaries with profile strings and ISO timestamps', async () => {
    const repository: TyreRepositoryPort = {
      listByTenant: vi.fn().mockResolvedValue({
        data: [{ ...record, profiles: profiles.map(({ profile }) => ({ profile })) }],
        total: 1,
      }),
      findById: vi.fn(),
      exists: vi.fn(),
      count: vi.fn(),
    };

    const result = await new TyreService(repository).listTyres('tenant-1', {
      page: 1,
      pageSize: 20,
    });

    expect(result).toEqual({
      total: 1,
      data: [
        {
          id: 'tyre-1',
          brand: 'Michelin',
          pattern: 'Pilot Sport 4',
          profiles: ['205/55 R16'],
          createdAt: createdAt.toISOString(),
          updatedAt: updatedAt.toISOString(),
        },
      ],
    });
  });
});

describe('TyreService.getTyre', () => {
  it('returns the detail with decomposed profile specifications', async () => {
    const repository: TyreRepositoryPort = {
      listByTenant: vi.fn(),
      findById: vi.fn().mockResolvedValue(record),
      exists: vi.fn(),
      count: vi.fn(),
    };

    const detail = await new TyreService(repository).getTyre('tenant-1', 'tyre-1');

    expect(repository.findById).toHaveBeenCalledWith('tenant-1', 'tyre-1');
    expect(detail).toEqual({
      id: 'tyre-1',
      brand: 'Michelin',
      pattern: 'Pilot Sport 4',
      profiles,
      metadata,
      createdAt: createdAt.toISOString(),
      updatedAt: updatedAt.toISOString(),
    });
  });

  it('throws NOT_FOUND for a missing tyre', async () => {
    const repository: TyreRepositoryPort = {
      listByTenant: vi.fn(),
      findById: vi.fn().mockResolvedValue(null),
      exists: vi.fn(),
      count: vi.fn(),
    };

    await expect(new TyreService(repository).getTyre('tenant-1', 'missing')).rejects.toMatchObject({
      code: 'NOT_FOUND',
      statusCode: 404,
    });
  });
});
