import { describe, expect, it, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { createElement } from 'react';
import { AssetLoader, type AssetResult } from '@/features/preview/engine/asset-loader';
import { SCENE_LAYER_ORDER } from '@/features/preview/engine/layer-types';
import {
  RendererProvider,
  useRenderer,
  type RendererState,
} from '@/features/preview/engine/renderer-provider';
import type { VehicleDetail, WheelDetail } from '@/types/catalog';

/**
 * RendererProvider tests: orchestration only. The loader is injected, no
 * Konva is involved (the canvas adapter is deliberately excluded from the
 * unit surface and verified by the future e2e preview spec).
 */

const renderMetadata = {
  wheelDiameter: 455,
  frontWheel: { x: 840, y: 1375 },
  rearWheel: { x: 3090, y: 1375 },
  bodyImage: '/vehicles/toyota/hilux/2025/vehicle.webp',
  maskImage: '/vehicles/toyota/hilux/2025/mask.webp',
  shadowImage: '/vehicles/toyota/hilux/2025/shadow.webp',
};

const vehicle: VehicleDetail = {
  id: 'v1',
  manufacturer: 'Toyota',
  model: 'Hilux',
  variant: 'SR5 Double Cab',
  year: 2025,
  wheelDiameterMm: 455,
  colours: ['Silver', 'Black'],
  renderMetadata,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-02T00:00:00.000Z',
};

const wheel: WheelDetail = {
  id: 'w1',
  brand: 'Rota',
  model: 'R5',
  finishes: ['Gloss Black'],
  sizes: [
    {
      id: 's1',
      size: '17x8',
      diameterInches: 17,
      widthInches: 8,
      boltPattern: '6x139.7',
      offsetMm: 30,
      centreBoreMm: 106.1,
    },
    {
      id: 's2',
      size: '18x8.5',
      diameterInches: 18,
      widthInches: 8.5,
      boltPattern: '6x139.7',
      offsetMm: 35,
      centreBoreMm: 106.1,
    },
  ],
  boltPatterns: ['6x139.7'],
  offsetsMm: [30, 35],
  centreBoresMm: [106.1],
  metadata: null,
  pricing: null,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-02T00:00:00.000Z',
};

const stubAsset = { source: {} as CanvasImageSource, naturalWidth: 3600, naturalHeight: 2400 };

function loaderReturning(load: (url: string) => Promise<AssetResult>): AssetLoader {
  return { load: vi.fn(load) } as unknown as AssetLoader;
}

function captureState(props: Parameters<typeof RendererProvider>[0]) {
  const captured: { current: RendererState | null } = { current: null };

  function Spy() {
    captured.current = useRenderer();
    return null;
  }

  render(createElement(RendererProvider, props, createElement(Spy)));
  return captured;
}

describe('RendererProvider', () => {
  it('builds the context from the catalog detail and composes the scene', async () => {
    const loader = loaderReturning(async (url) => ({ url, asset: stubAsset, fromFallback: false }));
    const captured = captureState({ vehicle, loader });

    await waitFor(() => expect(captured.current?.scene).toBeTruthy());

    expect(captured.current?.context.vehicle).toEqual({
      id: 'v1',
      displayName: '2025 Toyota Hilux SR5 Double Cab',
    });
    expect(captured.current?.scene.layers.map((l) => l.kind)).toEqual([...SCENE_LAYER_ORDER]);
    expect(captured.current?.assetErrors).toEqual([]);
    expect(loader.load).toHaveBeenCalledTimes(3);
    expect(loader.load).toHaveBeenCalledWith(renderMetadata.bodyImage);
  });

  it('populates body, shadow and mask slots once loading settles', async () => {
    const loader = loaderReturning(async (url) => ({ url, asset: stubAsset, fromFallback: false }));
    const captured = captureState({ vehicle, loader });

    await waitFor(() => {
      const scene = captured.current?.scene;
      const body = scene?.layers.find((l) => l.kind === 'body');
      expect(body?.nodes).toHaveLength(1);
    });

    const scene = captured.current!.scene;
    expect(scene.layers.find((l) => l.kind === 'shadow')?.nodes).toHaveLength(1);
    expect(scene.layers.find((l) => l.kind === 'mask')?.nodes).toHaveLength(1);
  });

  it('resolves the explicitly selected wheel size (not merely the first)', () => {
    const loader = loaderReturning(async (url) => ({ url, asset: stubAsset, fromFallback: false }));
    const captured = captureState({ vehicle, wheel, selectedWheelSizeId: 's2', loader });

    expect(captured.current?.context.wheelSize?.id).toBe('s2');
    expect(captured.current?.context.selection.sizeId).toBe('s2');
    expect(captured.current?.context.wheel).toEqual({ id: 'w1', brand: 'Rota', model: 'R5' });
  });

  it('falls back to the first size and reports nothing as selected tyre', () => {
    const loader = loaderReturning(async (url) => ({ url, asset: stubAsset, fromFallback: false }));
    const captured = captureState({ vehicle, wheel, loader });

    expect(captured.current?.context.wheelSize?.id).toBe('s1');
    expect(captured.current?.context.tyre).toBeNull();
  });

  it('surfaces loader failures without taking the scene down', async () => {
    const loader = loaderReturning(async (url) =>
      url.includes('mask')
        ? {
            url,
            asset: { source: {} as CanvasImageSource, naturalWidth: 512, naturalHeight: 512 },
            fromFallback: true,
            error: 'boom',
          }
        : { url, asset: stubAsset, fromFallback: false },
    );
    const captured = captureState({ vehicle, loader });

    await waitFor(() => expect(captured.current?.assetErrors.length).toBe(1));

    expect(captured.current?.assetErrors[0]).toContain('mask');
    expect(captured.current?.scene.layers.find((l) => l.kind === 'body')?.nodes).toHaveLength(1);
  });

  it('renders nothing when the vehicle has no render metadata', () => {
    const { container } = render(
      createElement(RendererProvider, { vehicle: { ...vehicle, renderMetadata: null } }, 'child'),
    );

    expect(container.innerHTML).toBe('');
  });
});
