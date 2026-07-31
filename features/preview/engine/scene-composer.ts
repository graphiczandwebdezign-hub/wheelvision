import type { LoadedAsset } from '@/features/preview/engine/asset-loader';
import {
  SCENE_LAYER_ORDER,
  type Scene,
  type SceneLayer,
  type SceneLayerKind,
  type SceneNode,
} from '@/features/preview/engine/layer-types';
import type { RenderContext } from '@/features/preview/engine/render-context';
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  containScale,
  offsetToCenter,
  rimFraction,
  rollingDiameterMm,
  scaleSize,
  sidewallRadiusFraction,
  wheelScaleFor,
  type Point,
  type Size,
} from '@/features/preview/engine/renderer-math';

/**
 * SceneComposer — pure layer composition. Given an immutable RenderContext
 * and the assets the loader resolved, it emits the full declarative scene.
 * No fetching, no rendering, no vehicle-specific branches: every measure
 * comes from metadata or from context selections.
 */

export interface SceneAssets {
  readonly body?: LoadedAsset | null;
  readonly shadow?: LoadedAsset | null;
  readonly mask?: LoadedAsset | null;
  /** Present when a package ships a separate rear body section (extension). */
  readonly rearBody?: LoadedAsset | null;
  /** Wheel face asset shared by both positions (single side-profile view). */
  readonly wheel?: LoadedAsset | null;
}

interface WheelGeometry {
  readonly center: Point;
  readonly outerRadius: number;
}

const TYRE_FILL = 'rgba(15, 23, 42, 0.92)';
const RIM_FALLBACK_FILL = 'rgba(148, 163, 184, 0.35)';
const RIM_FALLBACK_STROKE = '#94a3b8';
const HIGHLIGHT_STROKE = '#fde68a';

export function composeScene(context: RenderContext, assets: SceneAssets): Scene {
  const builders: Record<SceneLayerKind, () => SceneNode[]> = {
    shadow: () => buildImageLayer(assets.shadow),
    'rear-wheel': () => buildWheelNodes(context, assets, context.renderMetadata.rearWheel),
    'rear-body': () => buildImageLayer(assets.rearBody),
    'front-wheel': () => buildWheelNodes(context, assets, context.renderMetadata.frontWheel),
    body: () => buildImageLayer(assets.body),
    mask: () => buildImageLayer(assets.mask),
    highlights: () => buildHighlightNodes(context),
    overlay: () => [],
  };

  const layers: SceneLayer[] = SCENE_LAYER_ORDER.map((kind) => ({
    kind,
    nodes: builders[kind](),
    visible: true,
  }));

  return { width: CANVAS_WIDTH, height: CANVAS_HEIGHT, layers };
}

function buildImageLayer(asset: LoadedAsset | null | undefined): SceneNode[] {
  if (!asset) {
    return [];
  }
  const scale = containScale(
    { width: CANVAS_WIDTH, height: CANVAS_HEIGHT },
    { width: asset.naturalWidth, height: asset.naturalHeight },
  );
  const fitted = scaleSize({ width: asset.naturalWidth, height: asset.naturalHeight }, scale);
  const offset = offsetToCenter({ x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2 }, fitted);
  return [
    {
      type: 'image',
      image: asset,
      x: offset.x,
      y: offset.y,
      width: fitted.width,
      height: fitted.height,
    },
  ];
}

/**
 * Physics-first wheel geometry: the overall diameter follows the selected
 * tyre's rolling diameter relative to the stock fitment (independent of the
 * chosen wheel asset's pixel size).
 */
function wheelGeometry(context: RenderContext, position: Point): WheelGeometry {
  const stockDiameterMm = context.renderMetadata.wheelDiameter;
  const stockRadiusPx = context.renderMetadata.wheelDiameter / 2;

  const profile = context.tyreProfile;
  const rollingMm =
    profile?.widthMm && profile.aspectRatio && profile.rimDiameterInches
      ? rollingDiameterMm(profile.widthMm, profile.aspectRatio, profile.rimDiameterInches)
      : stockDiameterMm;

  const diameterRatio = context.scale.overallDiameter * (rollingMm / stockDiameterMm);
  return { center: position, outerRadius: stockRadiusPx * diameterRatio };
}

function rimRadius(context: RenderContext, geometry: WheelGeometry): number {
  const profile = context.tyreProfile;
  if (profile?.rimDiameterInches && profile.widthMm && profile.aspectRatio) {
    const rollingMm = rollingDiameterMm(
      profile.widthMm,
      profile.aspectRatio,
      profile.rimDiameterInches,
    );
    return geometry.outerRadius * rimFraction(profile.rimDiameterInches, rollingMm);
  }
  // Stock look: a conventional 65% rim share of the wheel's radius.
  return geometry.outerRadius * 0.65;
}

function buildWheelNodes(
  context: RenderContext,
  assets: SceneAssets,
  position: Point,
): SceneNode[] {
  const geometry = wheelGeometry(context, position);
  const nodes: SceneNode[] = [];

  const sidewallFraction =
    context.tyreProfile?.widthMm && context.tyreProfile.aspectRatio
      ? sidewallRadiusFraction(
          context.tyreProfile.widthMm,
          context.tyreProfile.aspectRatio,
          rollingDiameterMm(
            context.tyreProfile.widthMm,
            context.tyreProfile.aspectRatio,
            context.tyreProfile.rimDiameterInches ?? 17,
          ),
        )
      : 0.35;

  // Rubber: the tyre ring (sidewall) always renders — selection or not.
  nodes.push({
    type: 'ring',
    x: geometry.center.x,
    y: geometry.center.y,
    innerRadius: geometry.outerRadius * (1 - clampFraction(sidewallFraction)),
    outerRadius: geometry.outerRadius,
    fill: TYRE_FILL,
  });

  const rim = rimRadius(context, geometry);

  if (assets.wheel) {
    // Real wheel asset: scale so its diameter matches the rim diameter.
    const targetDiameterPx = rim * 2;
    const assetDiameter = Math.max(assets.wheel.naturalWidth, assets.wheel.naturalHeight);
    const scale = wheelScaleFor(targetDiameterPx, assetDiameter);
    const fitted: Size = scaleSize(
      { width: assets.wheel.naturalWidth, height: assets.wheel.naturalHeight },
      scale,
    );
    const offset = offsetToCenter(geometry.center, fitted);
    nodes.push({
      type: 'image',
      image: assets.wheel,
      x: offset.x,
      y: offset.y,
      width: fitted.width,
      height: fitted.height,
    });
  } else {
    // No asset yet (nothing selected or still loading): subtle rim stand-in.
    nodes.push({
      type: 'ellipse',
      x: geometry.center.x,
      y: geometry.center.y,
      radiusX: rim,
      radiusY: rim,
      fill: RIM_FALLBACK_FILL,
      stroke: RIM_FALLBACK_STROKE,
      strokeWidth: 6,
    });
  }

  return nodes;
}

function buildHighlightNodes(context: RenderContext): SceneNode[] {
  if (!context.diagnostics.wheelCenters) {
    return [];
  }
  return [context.renderMetadata.frontWheel, context.renderMetadata.rearWheel].map((position) => ({
    type: 'ring' as const,
    x: position.x,
    y: position.y,
    innerRadius: 28,
    outerRadius: 40,
    fill: HIGHLIGHT_STROKE,
  }));
}

function clampFraction(value: number): number {
  return Math.min(0.9, Math.max(0.05, value));
}
