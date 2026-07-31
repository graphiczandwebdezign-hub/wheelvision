import type { VehiclePackageDto, PackageValidationResult } from '@/features/packages/types/package';

export function validateVehiclePackage(pkg: Partial<VehiclePackageDto>): PackageValidationResult {
  const errors: string[] = [];

  if (!pkg.name || pkg.name.trim().length === 0) {
    errors.push('Package name is required');
  }
  if (!pkg.manufacturer || pkg.manufacturer.trim().length === 0) {
    errors.push('Manufacturer is required');
  }
  if (!pkg.model || pkg.model.trim().length === 0) {
    errors.push('Model is required');
  }
  if (!pkg.colours || pkg.colours.length === 0) {
    errors.push('At least one vehicle colour must be specified');
  }
  if (!pkg.wheelPositions || pkg.wheelPositions.length === 0) {
    errors.push('Wheel positions (axles) must be defined');
  }
  if (!pkg.assetReferences || pkg.assetReferences.length === 0) {
    errors.push('At least one asset reference (body image) is required');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
