import { describe, expect, it } from 'vitest';
import type { LoadedAsset } from '@/features/preview/engine/asset-loader';
import { composeScene, type SceneAssets } from '@/features/preview/engine/scene-composer';
import {
  SCENE_LAYER_ORDER,
  type ImageNodeSpec,
  type RingNodeSpec,
} from '@/features/preview/engine/layer-types';
import {
  createRenderContext,
  type RenderContextInput,
} from '@/features/preview/engine/render-context';
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  rollingDiameterMm,
} from '@/features/preview/engine/renderer-math';

/** The Hilux-authored metadata (identical coordinates to the real package). */
const renderMetadata = {
  wheelDiameter: 455,
  frontWheel: { x: 840, y: 1375 },
  rearWheel: { x: 3090, y: 1375 },
  bodyImage: '/vehicles/toyota/hilux/2025/vehicle.webp',
  maskImage: '/vehicles/toyota/hilux/2025/mask.webp',
  shadowImage: '/vehicles/toyota/hilux/2025/shadow.webp',
};

const baseInput: RenderContextInput = {
  vehicle: { id: 'v1', displayName: '2025 Toyota Hilux SR5 Double Cab' },
  renderMetadata,
};

function fullBodyAsset(width = 3600, height = 2400): LoadedAsset {
  return { source: {} as CanvasImageSource, naturalWidth: width, naturalHeight: height };
}

function wheelAsset(size = 800): LoadedAsset {
  return { source: {} as CanvasImageSource, naturalWidth: size, naturalHeight: size };
}

function contextWith(overrides: Partial<RenderContextInput> = {}) {
  return createRenderContext({ ...baseInput, ...overrides });
}

describe('layer ordering (declarative, no hardcoded z-index)', () => {
  it('emits layers in exactly the declared order', () => {
    const scene = composeScene(contextWith(), {});
    expect(scene.layers.map((layer) => layer.kind)).toEqual([...SCENE_LAYER_ORDER]);
    expect(SCENE_LAYER_ORDER).toEqual([
      'shadow',
      'rear-wheel',
      'rear-body',
      'front-wheel',
      'body',
      'mask',
      'highlights',
      'overlay',
    ]);
  });

  it('reports the canonical canvas dimensions', () => {
    const scene = composeScene(contextWith(), {});
    expect(scene.width).toBe(CANVAS_WIDTH);
    expect(scene.height).toBe(CANVAS_HEIGHT);
  });
});

describe('image layer population', () => {
  it('fits the body asset by contain-scale centred on the canvas', () => {
    const assets: SceneAssets = { body: fullBodyAsset(7200, 2400) };
    const scene = composeScene(contextWith(), assets);
    const bodyLayer = scene.layers.find((layer) => layer.kind === 'body');

    expect(bodyLayer?.nodes).toHaveLength(1);
    const node = bodyLayer?.nodes[0] as ImageNodeSpec;
    expect(node.type).toBe('image');
    // min(3600/7200, 2400/2400) = 0.5 → width-limited fit, vertically centred
    expect(node.width).toBe(3600);
    expect(node.height).toBe(1200);
    expect(node.x).toBe(0);
    expect(node.y).toBe(CANVAS_HEIGHT / 2 - 600);
  });

  it('skips layers whose assets are absent (rear-body, mask, shadow)', () => {
    const scene = composeScene(contextWith(), {});
    for (const kind of ['shadow', 'rear-body', 'body', 'mask'] as const) {
      expect(scene.layers.find((layer) => layer.kind === kind)?.nodes).toEqual([]);
    }
  });
});

describe('wheel composition — physics and metadata, never literals', () => {
  it('places stock wheels from metadata at both metadata positions', () => {
    const scene = composeScene(contextWith(), {});
    const front = scene.layers.find((layer) => layer.kind === 'front-wheel')!;
    const rear = scene.layers.find((layer) => layer.kind === 'rear-wheel')!;

    const frontTyre = front.nodes.find((n) => n.type === 'ring') as RingNodeSpec;
    const rearTyre = rear.nodes.find((n) => n.type === 'ring') as RingNodeSpec;

    expect(frontTyre.outerRadius).toBeCloseTo(455 / 2);
    expect([frontTyre.x, frontTyre.y]).toEqual([840, 1375]);
    expect([rearTyre.x, rearTyre.y]).toEqual([3090, 1375]);
  });

  it('scales geometry with the selected tyre rolling diameter', () => {
    const profile = {
      id: 'p1',
      profile: '205/55 R16',
      widthMm: 205,
      aspectRatio: 55,
      rimDiameterInches: 16,
      construction: 'R',
      loadIndex: 91,
      speedRating: 'V',
    };
    const context = contextWith({
      tyre: { id: 't1', brand: 'Michelin', pattern: 'Pilot Sport 4' },
      tyreProfile: profile,
    });
    const scene = composeScene(context, {});
    const frontTyre = scene.layers
      .find((layer) => layer.kind === 'front-wheel')!
      .nodes.find((n) => n.type === 'ring') as RingNodeSpec;

    const expectedRolling = rollingDiameterMm(205, 55, 16); // 631.9mm vs 455 stock
    const expectedOuter = (455 / 2) * (expectedRolling / 455);
    expect(frontTyre.outerRadius).toBeCloseTo(expectedOuter);

    // Physics consistency: the tyre ring's inner radius equals the rim radius.
    const rimRadius = expectedOuter * ((16 * 25.4) / expectedRolling);
    expect(frontTyre.innerRadius).toBeCloseTo(rimRadius, 0);
  });

  it('honours the global overall-diameter scale factor', () => {
    const context = contextWith({ scale: { overallDiameter: 1.1 } });
    const scene = composeScene(context, {});
    const frontTyre = scene.layers
      .find((layer) => layer.kind === 'front-wheel')!
      .nodes.find((n) => n.type === 'ring') as RingNodeSpec;
    expect(frontTyre.outerRadius).toBeCloseTo((455 / 2) * 1.1);
  });

  it('centres the wheel asset scaled to the rim diameter', () => {
    const assets: SceneAssets = { wheel: wheelAsset(800) };
    const scene = composeScene(contextWith(), assets);
    const front = scene.layers.find((layer) => layer.kind === 'front-wheel')!;
    const imageNode = front.nodes.find((n) => n.type === 'image') as ImageNodeSpec;

    const rimDiameter = 455 * 0.65; // stock rim share
    expect(imageNode.width).toBeCloseTo(rimDiameter);
    expect(imageNode.height).toBeCloseTo(rimDiameter);
    expect(imageNode.x).toBeCloseTo(840 - rimDiameter / 2);
    expect(imageNode.y).toBeCloseTo(1375 - rimDiameter / 2);
  });

  it('draws the rim stand-in when no wheel asset is loaded', () => {
    const scene = composeScene(contextWith(), {});
    const front = scene.layers.find((layer) => layer.kind === 'front-wheel')!;
    const fallback = front.nodes.find((n) => n.type === 'ellipse');
    expect(fallback).toBeDefined();
    expect(fallback && 'radiusX' in fallback && fallback.radiusX).toBeCloseTo((455 / 2) * 0.65);
  });
});

describe('highlights and overlay', () => {
  it('renders wheel-centre markers only when diagnostics enable them', () => {
    const off = composeScene(contextWith(), {});
    expect(off.layers.find((l) => l.kind === 'highlights')!.nodes).toEqual([]);

    const on = composeScene(contextWith({ diagnostics: { wheelCenters: true } }), {});
    const markers = on.layers.find((l) => l.kind === 'highlights')!.nodes;
    expect(markers).toHaveLength(2);
    expect(markers.map((m) => [m.x, m.y])).toEqual([
      [840, 1375],
      [3090, 1375],
    ]);
  });

  it('keeps the overlay layer declared and empty by default', () => {
    const scene = composeScene(contextWith(), {});
    const overlay = scene.layers.find((l) => l.kind === 'overlay')!;
    expect(overlay.nodes).toEqual([]);
    expect(overlay.visible).toBe(true);
  });
});

describe('vehicle-independence', () => {
  it('renders a synthetic second vehicle package unchanged in behaviour', () => {
    const synthetic = contextWith({
      vehicle: { id: 'v2', displayName: 'Synthetic Test Vehicle' },
      renderMetadata: {
        wheelDiameter: 600,
        frontWheel: { x: 400, y: 900 },
        rearWheel: { x: 2000, y: 900 },
        bodyImage: '/pkg/body.webp',
        maskImage: '/pkg/mask.webp',
        shadowImage: '/pkg/shadow.webp',
      },
    });
    const scene = composeScene(synthetic, { body: fullBodyAsset() });
    const frontTyre = scene.layers
      .find((l) => l.kind === 'front-wheel')!
      .nodes.find((n) => n.type === 'ring') as RingNodeSpec;

    expect(frontTyre.outerRadius).toBeCloseTo(300);
    expect([frontTyre.x, frontTyre.y]).toEqual([400, 900]);
  });
});
