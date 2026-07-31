import { describe, expect, it, vi } from 'vitest';
import { VehicleService } from '@/server/services/vehicle-service';

describe('VehicleService', () => {
  it('maps repository records into the public vehicle response', async () => {
    const repository = {
      listByTenant: vi.fn().mockResolvedValue([
        {
          id: 'variant-1',
          name: 'SR5 Double Cab',
          model: { name: 'Hilux', manufacturer: { name: 'Toyota' } },
          colour: { name: 'Silver' },
          createdAt: new Date('2024-01-01T00:00:00.000Z'),
          updatedAt: new Date('2024-01-01T00:00:00.000Z'),
        },
      ]),
    };

    const service = new VehicleService(repository as never);
    const result = await service.listVehicles('tenant-1');

    expect(result).toEqual([
      {
        id: 'variant-1',
        manufacturer: 'Toyota',
        model: 'Hilux',
        variant: 'SR5 Double Cab',
        colour: 'Silver',
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        updatedAt: new Date('2024-01-01T00:00:00.000Z'),
      },
    ]);
  });
});
