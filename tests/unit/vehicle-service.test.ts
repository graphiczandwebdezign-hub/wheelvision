import { describe, expect, it, vi } from 'vitest';
import { VehicleService } from '@/server/services/vehicle-service';
import type { VehicleRepositoryPort } from '@/server/repositories/vehicle-repository';

const createdAt = new Date('2024-01-01T00:00:00.000Z');
const updatedAt = new Date('2024-01-02T00:00:00.000Z');

const renderMetadata = {
  wheelDiameter: 455,
  frontWheel: { x: 840, y: 1375 },
  rearWheel: { x: 3090, y: 1375 },
  bodyImage: '/vehicles/toyota/hilux/2025/vehicle.webp',
  maskImage: '/vehicles/toyota/hilux/2025/mask.webp',
  shadowImage: '/vehicles/toyota/hilux/2025/shadow.webp',
};

const record = {
  id: 'variant-1',
  name: 'SR5 Double Cab',
  year: 2025,
  wheelDiameterMm: 455,
  renderMetadata,
  model: { name: 'Hilux', manufacturer: { name: 'Toyota' } },
  colours: [{ name: 'Silver' }, { name: 'Black' }],
  createdAt,
  updatedAt,
};

const summary = {
  id: 'variant-1',
  manufacturer: 'Toyota',
  model: 'Hilux',
  variant: 'SR5 Double Cab',
  year: 2025,
  wheelDiameterMm: 455,
  colours: ['Silver', 'Black'],
  createdAt: createdAt.toISOString(),
  updatedAt: updatedAt.toISOString(),
};

describe('VehicleService.listVehicles', () => {
  it('maps records to summaries with all colours and ISO timestamps', async () => {
    const repository: VehicleRepositoryPort = {
      listByTenant: vi.fn().mockResolvedValue({ data: [record], total: 1 }),
      findById: vi.fn(),
      exists: vi.fn(),
      count: vi.fn(),
    };

    const result = await new VehicleService(repository).listVehicles('tenant-1', {
      page: 1,
      pageSize: 20,
    });

    expect(result).toEqual({ total: 1, data: [summary] });
    expect(repository.listByTenant).toHaveBeenCalledWith('tenant-1', { page: 1, pageSize: 20 });
  });
});

describe('VehicleService.getVehicle', () => {
  it('returns the detail with validated render metadata', async () => {
    const repository: VehicleRepositoryPort = {
      listByTenant: vi.fn(),
      findById: vi.fn().mockResolvedValue(record),
      exists: vi.fn(),
      count: vi.fn(),
    };

    const detail = await new VehicleService(repository).getVehicle('tenant-1', 'variant-1');

    expect(repository.findById).toHaveBeenCalledWith('tenant-1', 'variant-1');
    expect(detail).toEqual({ ...summary, renderMetadata });
  });

  it('exposes null render metadata when none is stored', async () => {
    const repository: VehicleRepositoryPort = {
      listByTenant: vi.fn(),
      findById: vi.fn().mockResolvedValue({ ...record, renderMetadata: null }),
      exists: vi.fn(),
      count: vi.fn(),
    };

    const detail = await new VehicleService(repository).getVehicle('tenant-1', 'variant-1');

    expect(detail.renderMetadata).toBeNull();
  });

  it('degrades invalid stored render metadata to null instead of failing the request', async () => {
    const repository: VehicleRepositoryPort = {
      listByTenant: vi.fn(),
      findById: vi.fn().mockResolvedValue({ ...record, renderMetadata: { broken: true } }),
      exists: vi.fn(),
      count: vi.fn(),
    };

    const detail = await new VehicleService(repository).getVehicle('tenant-1', 'variant-1');

    expect(detail.renderMetadata).toBeNull();
  });

  it('throws NOT_FOUND for a missing vehicle', async () => {
    const repository: VehicleRepositoryPort = {
      listByTenant: vi.fn(),
      findById: vi.fn().mockResolvedValue(null),
      exists: vi.fn(),
      count: vi.fn(),
    };

    await expect(
      new VehicleService(repository).getVehicle('tenant-1', 'missing'),
    ).rejects.toMatchObject({ code: 'NOT_FOUND', statusCode: 404 });
  });
});
