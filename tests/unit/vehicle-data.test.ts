import { describe, expect, it } from 'vitest';
import { getVehicleById } from '@/services/vehicles/vehicle-data';

describe('vehicle data service', () => {
  it('returns the Hilux vehicle by default', () => {
    const vehicle = getVehicleById('toyota-hilux-2025');
    expect(vehicle.id).toBe('toyota-hilux-2025');
    expect(vehicle.metadata.wheelDiameter).toBe(455);
  });
});
