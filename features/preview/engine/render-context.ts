import type { TyreProfileSpec, WheelSizeSpec } from '@/types/catalog';
import type { VehicleRenderMetadata } from '@/types/render-metadata';
import { DEFAULT_CAMERA, type CameraState } from '@/features/preview/engine/renderer-math';

/**
 * RenderContext — the single immutable object the renderer receives.
 *
 * Nothing else is consulted: no vehicle-specific branches, no globals, no
 * metadata parsing at draw time. Built once per selection change by
 * `createRenderContext` (which deep-freezes it) and consumed by the scene
 * composer and canvas. `lighting`, `reflections` and `animation` are typed
 * extension points — populated by later renderer milestones without changing
 * this contract.
 */

export interface RenderVehicle {
  readonly id: string;
  readonly displayName: string;
}

export interface RenderWheel {
  readonly id: string;
  readonly brand: string;
  readonly model: string;
}

export interface RenderTyre {
  readonly id: string;
  readonly brand: string;
  readonly pattern: string;
}

export interface ScaleState {
  /** canvas-units per CSS-pixel for the current viewport (1 = native size). */
  readonly viewport: number;
  /** configured-vs-stock rolling diameter ratio (1 = stock proportions). */
  readonly overallDiameter: number;
}

export interface SelectionState {
  readonly vehicleId: string;
  readonly wheelId: string | null;
  readonly finish: string | null;
  readonly sizeId: string | null;
  readonly tyreId: string | null;
  readonly tyreProfileId: string | null;
}

/** Future: directional light for shadow/highlight synthesis. */
export interface LightingConfig {
  readonly directionDegrees: number;
  readonly intensity: number;
}

/** Future: ground-reflection strength for showroom presentation. */
export interface ReflectionConfig {
  readonly strength: number;
}

/** Future: animation loop settings (e.g. wheel spin on a turntable view). */
export interface AnimationConfig {
  readonly wheelSpinRpm: number;
  readonly playing: boolean;
}

/** Developer visualisation toggles, rendered on the highlights layer. */
export interface DiagnosticsConfig {
  readonly wheelCenters: boolean;
  readonly layerOutlines: boolean;
}

export interface RenderContext {
  readonly vehicle: RenderVehicle;
  readonly renderMetadata: VehicleRenderMetadata;
  readonly wheel: RenderWheel | null;
  readonly wheelFinish: string | null;
  readonly wheelSize: WheelSizeSpec | null;
  readonly tyre: RenderTyre | null;
  readonly tyreProfile: TyreProfileSpec | null;
  readonly scale: ScaleState;
  readonly camera: CameraState;
  readonly selection: SelectionState;
  readonly lighting: LightingConfig | null;
  readonly reflections: ReflectionConfig | null;
  readonly animation: AnimationConfig | null;
  readonly diagnostics: DiagnosticsConfig;
}

export interface RenderContextInput {
  readonly vehicle: RenderVehicle;
  readonly renderMetadata: VehicleRenderMetadata;
  readonly wheel?: RenderWheel | null;
  readonly wheelFinish?: string | null;
  readonly wheelSize?: WheelSizeSpec | null;
  readonly tyre?: RenderTyre | null;
  readonly tyreProfile?: TyreProfileSpec | null;
  readonly scale?: Partial<ScaleState>;
  readonly camera?: Partial<CameraState>;
  readonly selection?: Partial<SelectionState>;
  readonly lighting?: LightingConfig | null;
  readonly reflections?: ReflectionConfig | null;
  readonly animation?: AnimationConfig | null;
  readonly diagnostics?: Partial<DiagnosticsConfig>;
}

function freezeAll<T extends object>(value: T): T {
  for (const key of Object.keys(value) as Array<keyof T>) {
    const entry = value[key];
    if (typeof entry === 'object' && entry !== null && !Object.isFrozen(entry)) {
      freezeAll(entry);
    }
  }
  return Object.freeze(value);
}

/** Build a validated, deeply immutable render context with explicit defaults. */
export function createRenderContext(input: RenderContextInput): RenderContext {
  const context: RenderContext = {
    vehicle: input.vehicle,
    renderMetadata: input.renderMetadata,
    wheel: input.wheel ?? null,
    wheelFinish: input.wheelFinish ?? null,
    wheelSize: input.wheelSize ?? null,
    tyre: input.tyre ?? null,
    tyreProfile: input.tyreProfile ?? null,
    scale: {
      viewport: input.scale?.viewport ?? 1,
      overallDiameter: input.scale?.overallDiameter ?? 1,
    },
    camera: { ...DEFAULT_CAMERA, ...input.camera },
    selection: {
      vehicleId: input.vehicle.id,
      wheelId: input.wheel?.id ?? null,
      finish: input.wheelFinish ?? null,
      sizeId: input.wheelSize?.id ?? null,
      tyreId: input.tyre?.id ?? null,
      tyreProfileId: input.tyreProfile?.id ?? null,
      ...input.selection,
    },
    lighting: input.lighting ?? null,
    reflections: input.reflections ?? null,
    animation: input.animation ?? null,
    diagnostics: {
      wheelCenters: input.diagnostics?.wheelCenters ?? false,
      layerOutlines: input.diagnostics?.layerOutlines ?? false,
    },
  };

  return freezeAll(context);
}
