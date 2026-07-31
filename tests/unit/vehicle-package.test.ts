import { describe, expect, it } from 'vitest';
import { validateVehiclePackage } from '@/features/packages/validation/package-validator';

describe('Vehicle Package Validation & Authoring', () => {
  it('validates a complete package successfully', () => {
    const result = validateVehiclePackage({
      name: 'Toyota Hilux 2025',
      manufacturer: 'Toyota',
      model: 'Hilux',
      colours: ['Silver'],
      wheelPositions: [{ axle: 'front', x: 120, y: 220 }],
      assetReferences: [{ type: 'body', url: '/vehicles/toyota/hilux/body.webp' }],
    });
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('reports missing required fields honestly', () => {
    const result = validateVehiclePackage({
      name: '',
      manufacturer: '',
      model: '',
      colours: [],
      wheelPositions: [],
      assetReferences: [],
    });
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
