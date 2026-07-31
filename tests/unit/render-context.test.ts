import { describe, expect, it } from 'vitest';
import { createRenderContext } from '@/features/preview/engine/render-context';
import { vehicleRenderMetadataSchema } from '@/types/render-metadata';

const renderMetadata = {
  wheelDiameter: 455,
  frontWheel: { x: 840, y: 1375 },
  rearWheel: { x: 3090, y: 1375 },
  bodyImage: '/vehicles/toyota/hilux/2025/vehicle.webp',
  maskImage: '/vehicles/toyota/hilux/2025/mask.webp',
  shadowImage: '/vehicles/toyota/hilux/2025/shadow.webp',
};

describe('createRenderContext', () => {
  it('defaults every optional field explicitly', () => {
    const context = createRenderContext({
      vehicle: { id: 'v1', displayName: 'Hilux' },
      renderMetadata,
    });

    expect(context.wheel).toBeNull();
    expect(context.wheelFinish).toBeNull();
    expect(context.wheelSize).toBeNull();
    expect(context.tyre).toBeNull();
    expect(context.tyreProfile).toBeNull();
    expect(context.scale).toEqual({ viewport: 1, overallDiameter: 1 });
    expect(context.camera).toEqual({ zoom: 1, panX: 0, panY: 0 });
    expect(context.lighting).toBeNull();
    expect(context.reflections).toBeNull();
    expect(context.animation).toBeNull();
    expect(context.diagnostics).toEqual({ wheelCenters: false, layerOutlines: false });
  });

  it('derives the selection from the provided entities', () => {
    const context = createRenderContext({
      vehicle: { id: 'v1', displayName: 'Hilux' },
      renderMetadata,
      wheel: { id: 'w1', brand: 'Rota', model: 'R5' },
      wheelFinish: 'Gloss Black',
      wheelSize: {
        id: 's1',
        size: '17x8',
        diameterInches: 17,
        widthInches: 8,
        boltPattern: '6x139.7',
        offsetMm: 30,
        centreBoreMm: 106.1,
      },
      tyre: { id: 't1', brand: 'Michelin', pattern: 'Pilot Sport 4' },
      tyreProfile: {
        id: 'p1',
        profile: '205/55 R16',
        widthMm: 205,
        aspectRatio: 55,
        rimDiameterInches: 16,
        construction: 'R',
        loadIndex: 91,
        speedRating: 'V',
      },
    });

    expect(context.selection).toEqual({
      vehicleId: 'v1',
      wheelId: 'w1',
      finish: 'Gloss Black',
      sizeId: 's1',
      tyreId: 't1',
      tyreProfileId: 'p1',
    });
  });

  it('merges partial camera and scale with defaults', () => {
    const context = createRenderContext({
      vehicle: { id: 'v1', displayName: 'Hilux' },
      renderMetadata,
      camera: { zoom: 1.5 },
      scale: { viewport: 0.5 },
    });

    expect(context.camera).toEqual({ zoom: 1.5, panX: 0, panY: 0 });
    expect(context.scale).toEqual({ viewport: 0.5, overallDiameter: 1 });
  });

  it('is deeply immutable (single immutable object contract)', () => {
    const context = createRenderContext({
      vehicle: { id: 'v1', displayName: 'Hilux' },
      renderMetadata,
      wheel: { id: 'w1', brand: 'Rota', model: 'R5' },
    });

    expect(Object.isFrozen(context)).toBe(true);
    expect(Object.isFrozen(context.scale)).toBe(true);
    expect(Object.isFrozen(context.camera)).toBe(true);
    expect(Object.isFrozen(context.selection)).toBe(true);
    expect(Object.isFrozen(context.diagnostics)).toBe(true);
    expect(Object.isFrozen(context.wheel)).toBe(true);
  });

  it('carries typed future extension points when provided', () => {
    const context = createRenderContext({
      vehicle: { id: 'v1', displayName: 'Hilux' },
      renderMetadata,
      lighting: { directionDegrees: 45, intensity: 0.8 },
      reflections: { strength: 0.3 },
      animation: { wheelSpinRpm: 12, playing: true },
    });

    expect(context.lighting).toEqual({ directionDegrees: 45, intensity: 0.8 });
    expect(context.reflections).toEqual({ strength: 0.3 });
    expect(context.animation).toEqual({ wheelSpinRpm: 12, playing: true });
  });
});

describe('Chapter-6 metadata parsing (the renderer boundary)', () => {
  it('accepts a valid package', () => {
    expect(vehicleRenderMetadataSchema.parse(renderMetadata)).toEqual(renderMetadata);
  });

  it.each([
    ['a non-positive wheel diameter', { ...renderMetadata, wheelDiameter: 0 }],
    ['a fractional diameter', { ...renderMetadata, wheelDiameter: 455.5 }],
    ['non-integer coordinates', { ...renderMetadata, frontWheel: { x: 840.5, y: 1375 } }],
    [
      'a missing asset reference',
      (() => {
        const { maskImage: _omit, ...rest } = renderMetadata;
        return rest;
      })(),
    ],
    ['an empty asset reference', { ...renderMetadata, bodyImage: '' }],
  ])('rejects %s', (_label, candidate) => {
    expect(vehicleRenderMetadataSchema.safeParse(candidate).success).toBe(false);
  });
});
