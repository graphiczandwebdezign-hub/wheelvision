export type PackageStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export interface VehiclePackageDto {
  readonly id: string;
  readonly name: string;
  readonly manufacturer: string;
  readonly model: string;
  readonly generation: string | null;
  readonly year: number | null;
  readonly trim: string | null;
  readonly status: PackageStatus;
  readonly version: number;
  readonly publishedFlag: boolean;
  readonly colours: readonly string[];
  readonly wheelPositions: readonly { readonly axle: string; readonly x: number; readonly y: number }[];
  readonly wheelMetadata: Record<string, unknown> | null;
  readonly tyreMetadata: Record<string, unknown> | null;
  readonly renderMetadata: Record<string, unknown> | null;
  readonly assetReferences: readonly { readonly type: string; readonly url: string }[];
  readonly validationState: {
    readonly isValid: boolean;
    readonly errors: readonly string[];
  };
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface PackageValidationResult {
  readonly isValid: boolean;
  readonly errors: readonly string[];
}
