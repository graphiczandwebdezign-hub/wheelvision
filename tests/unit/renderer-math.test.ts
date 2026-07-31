import { describe, expect, it } from 'vitest';
import {
  applyCamera,
  aspectOf,
  CANVAS_WIDTH,
  canvasToViewport,
  clamp,
  containScale,
  DEFAULT_CAMERA,
  invertCamera,
  offsetToCenter,
  overallDiameterScale,
  rimFraction,
  rollingDiameterMm,
  rotationForTime,
  scaleSize,
  sidewallRadiusFraction,
  tyreSidewallMm,
  viewportScaleFor,
  viewportToCanvas,
  wheelCenter,
  wheelScaleFor,
} from '@/features/preview/engine/renderer-math';

describe('clamp', () => {
  it.each([
    [5, 0, 10, 5],
    [-1, 0, 10, 0],
    [11, 0, 10, 10],
  ])('clamp(%i, %i, %i) = %i', (value, min, max, expected) => {
    expect(clamp(value, min, max)).toBe(expected);
  });
});

describe('aspectOf', () => {
  it('returns width divided by height', () => {
    expect(aspectOf(1600, 900)).toBeCloseTo(16 / 9);
  });

  it('is safe against a zero height', () => {
    expect(aspectOf(100, 0)).toBe(100);
  });
});

describe('containScale', () => {
  it('fits by the limiting dimension', () => {
    expect(containScale({ width: 100, height: 100 }, { width: 200, height: 100 })).toBe(0.5);
    expect(containScale({ width: 100, height: 100 }, { width: 100, height: 200 })).toBe(0.5);
  });

  it('returns 1 for an exact fit', () => {
    expect(containScale({ width: 3600, height: 2400 }, { width: 3600, height: 2400 })).toBe(1);
  });
});

describe('viewportScaleFor', () => {
  it('maps container pixels onto the canonical canvas width', () => {
    expect(viewportScaleFor(1800)).toBe(1800 / CANVAS_WIDTH);
    expect(viewportScaleFor(720, 3600)).toBe(0.2);
  });
});

describe('wheelCenter', () => {
  it('returns the anchor in canvas space with the default camera', () => {
    expect(wheelCenter({ x: 840, y: 1375 })).toEqual({ x: 840, y: 1375 });
  });

  it('applies the camera transform when provided', () => {
    expect(wheelCenter({ x: 100, y: 50 }, { zoom: 2, panX: 10, panY: -5 })).toEqual({
      x: 210,
      y: 95,
    });
  });
});

describe('wheelScaleFor — Chapter 12 wheel scaling', () => {
  it('scales the asset to the metadata diameter', () => {
    expect(wheelScaleFor(455, 910)).toBe(0.5);
    expect(wheelScaleFor(455, 227.5)).toBe(2);
  });

  it.each([[0], [-100], [Number.NaN]])('guards invalid asset diameter %s to neutral scale', (d) => {
    expect(wheelScaleFor(455, d)).toBe(1);
  });
});

describe('offsetToCenter / scaleSize', () => {
  it('centres a scaled rectangle on the anchor', () => {
    expect(offsetToCenter({ x: 840, y: 1375 }, { width: 455, height: 455 })).toEqual({
      x: 840 - 455 / 2,
      y: 1375 - 455 / 2,
    });
  });

  it('scales sizes uniformly', () => {
    expect(scaleSize({ width: 10, height: 5 }, 3)).toEqual({ width: 30, height: 15 });
  });
});

describe('tyre physics — sidewall and rolling diameter', () => {
  it('computes sidewall in millimetres (width × profile / 100)', () => {
    expect(tyreSidewallMm(205, 55)).toBeCloseTo(112.75);
    expect(tyreSidewallMm(265, 65)).toBeCloseTo(172.25);
  });

  it('computes the rolling diameter (2 × sidewall + rim)', () => {
    // 205/55 R16: 2×112.75 + 406.4 = 631.9
    expect(rollingDiameterMm(205, 55, 16)).toBeCloseTo(631.9, 1);
    // 265/65 R17: 2×172.25 + 431.8 = 776.3
    expect(rollingDiameterMm(265, 65, 17)).toBeCloseTo(776.3, 1);
  });

  it('computes rim and sidewall fractions consistently', () => {
    const rolling = rollingDiameterMm(205, 55, 16);
    expect(rimFraction(16, rolling)).toBeCloseTo(406.4 / rolling);
    expect(sidewallRadiusFraction(205, 55, rolling)).toBeCloseTo(112.75 / (rolling / 2));
  });
});

describe('overallDiameterScale', () => {
  it('returns the configured-to-stock ratio', () => {
    expect(overallDiameterScale(910, 455)).toBe(2);
  });

  it.each([[0], [-5], [Number.NaN]])('guards invalid stock diameter %s to 1', (stock) => {
    expect(overallDiameterScale(600, stock)).toBe(1);
  });
});

describe('camera math', () => {
  const camera = { zoom: 2, panX: 10, panY: -5 };

  it('applies and inverts the camera symmetrically', () => {
    const point = { x: 123, y: 45 };
    const moved = applyCamera(point, camera);
    expect(moved).toEqual({ x: 256, y: 85 });
    expect(invertCamera(moved, camera)).toEqual(point);
  });

  it('converts canvas ↔ viewport symmetrically', () => {
    const scale = 0.5;
    const canvas = { x: 840, y: 1375 };
    const viewport = canvasToViewport(canvas, scale, DEFAULT_CAMERA);
    expect(viewport).toEqual({ x: 420, y: 687.5 });
    expect(viewportToCanvas(viewport, scale, DEFAULT_CAMERA)).toEqual(canvas);
  });

  it('is safe against a zero zoom or scale', () => {
    expect(invertCamera({ x: 1, y: 1 }, { zoom: 0, panX: 0, panY: 0 })).toEqual({ x: 1, y: 1 });
    expect(viewportToCanvas({ x: 2, y: 2 }, 0)).toEqual({ x: 2, y: 2 });
  });
});

describe('rotationForTime (future animation loop)', () => {
  it('returns 0 at t=0', () => {
    expect(rotationForTime(60, 0)).toBe(0);
  });

  it('runs one full turn per period', () => {
    expect(rotationForTime(60, 500)).toBeCloseTo(180);
    expect(rotationForTime(60, 1000)).toBeCloseTo(0);
  });

  it('normalises negative input into [0, 360)', () => {
    const value = rotationForTime(60, -500);
    expect(value).toBeGreaterThanOrEqual(0);
    expect(value).toBeLessThan(360);
  });
});
