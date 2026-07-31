/**
 * RendererMath — pure functions only. Every geometric decision the engine
 * makes is computed here, which keeps the rules of Chapter 12 (metadata-driven
 * placement) testable in isolation. No DOM, no state, no side effects.
 */

export const CANVAS_WIDTH = 3600;
export const CANVAS_HEIGHT = 2400;
const MM_PER_INCH = 25.4;

export interface Point {
  readonly x: number;
  readonly y: number;
}

export interface Size {
  readonly width: number;
  readonly height: number;
}

export interface CameraState {
  readonly zoom: number;
  readonly panX: number;
  readonly panY: number;
}

export const DEFAULT_CAMERA: CameraState = { zoom: 1, panX: 0, panY: 0 };

/** Smallest meaningful asset diameter; shields callers from divide-by-zero. */
const MIN_DIMENSION_PX = 1;

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function aspectOf(width: number, height: number): number {
  return width / Math.max(height, MIN_DIMENSION_PX);
}

/** "Contain" fit: uniform scale that shows the full content in the container. */
export function containScale(container: Size, content: Size): number {
  return Math.min(
    container.width / Math.max(content.width, MIN_DIMENSION_PX),
    container.height / Math.max(content.height, MIN_DIMENSION_PX),
  );
}

/** Pixel scale when a canvas-space viewport is shown in a CSS-pixel box. */
export function viewportScaleFor(
  containerWidthPx: number,
  canvasWidth: number = CANVAS_WIDTH,
): number {
  return containerWidthPx / Math.max(canvasWidth, MIN_DIMENSION_PX);
}

/** Wheel-centre anchor for a wheel position (identity by design — one seam). */
export function wheelCenter(position: Point, camera: CameraState = DEFAULT_CAMERA): Point {
  return applyCamera(position, camera);
}

/**
 * Chapter-12 scale: how much a wheel asset must scale so its diameter matches
 * the metadata wheel diameter. Guards zero/negative asset diameters to 1.
 */
export function wheelScaleFor(metadataDiameterPx: number, assetDiameterPx: number): number {
  if (!Number.isFinite(assetDiameterPx) || assetDiameterPx <= 0) {
    return 1;
  }
  return metadataDiameterPx / assetDiameterPx;
}

/** Top-left offset that centres a scaled rectangle on an anchor point. */
export function offsetToCenter(anchor: Point, scaled: Size): Point {
  return { x: anchor.x - scaled.width / 2, y: anchor.y - scaled.height / 2 };
}

export function scaleSize(size: Size, scale: number): Size {
  return { width: size.width * scale, height: size.height * scale };
}

/** Tyre sidewall height in millimetres (width × aspect ratio / 100). */
export function tyreSidewallMm(widthMm: number, aspectRatio: number): number {
  return (widthMm * aspectRatio) / 100;
}

/** Overall rolling diameter in millimetres: 2 × sidewall + rim diameter. */
export function rollingDiameterMm(
  widthMm: number,
  aspectRatio: number,
  rimDiameterInches: number,
): number {
  return 2 * tyreSidewallMm(widthMm, aspectRatio) + rimDiameterInches * MM_PER_INCH;
}

/**
 * Visual diameter multiplier when a configured tyre/wheel differs from the
 * stock fitment the vehicle metadata describes. 1 = stock proportions.
 */
export function overallDiameterScale(configuredRollingMm: number, stockRollingMm: number): number {
  if (!Number.isFinite(stockRollingMm) || stockRollingMm <= 0) {
    return 1;
  }
  return configuredRollingMm / stockRollingMm;
}

/** Fraction of the rolling diameter occupied by the rim (the wheel asset). */
export function rimFraction(rimDiameterInches: number, rollingDiameterMmValue: number): number {
  return (rimDiameterInches * MM_PER_INCH) / Math.max(rollingDiameterMmValue, MIN_DIMENSION_PX);
}

/** Fraction of the radius occupied by tyre sidewall (the rubber ring band). */
export function sidewallRadiusFraction(
  widthMm: number,
  aspectRatio: number,
  rollingMm: number,
): number {
  return tyreSidewallMm(widthMm, aspectRatio) / Math.max(rollingMm / 2, MIN_DIMENSION_PX);
}

export function applyCamera(point: Point, camera: CameraState): Point {
  return { x: point.x * camera.zoom + camera.panX, y: point.y * camera.zoom + camera.panY };
}

export function invertCamera(point: Point, camera: CameraState): Point {
  const zoom = camera.zoom === 0 ? MIN_DIMENSION_PX : camera.zoom;
  return { x: (point.x - camera.panX) / zoom, y: (point.y - camera.panY) / zoom };
}

/** Canvas-space → viewport pixels. */
export function canvasToViewport(
  point: Point,
  viewportScale: number,
  camera: CameraState = DEFAULT_CAMERA,
): Point {
  const moved = applyCamera(point, camera);
  return { x: moved.x * viewportScale, y: moved.y * viewportScale };
}

/** Viewport pixels → canvas space. */
export function viewportToCanvas(
  point: Point,
  viewportScale: number,
  camera: CameraState = DEFAULT_CAMERA,
): Point {
  const scale = viewportScale === 0 ? MIN_DIMENSION_PX : viewportScale;
  return invertCamera({ x: point.x / scale, y: point.y / scale }, camera);
}

/** Wheel spin angle in degrees for a timestamp and rotational speed. */
export function rotationForTime(rpm: number, timestampMs: number): number {
  const degreesPerMs = (rpm * 360) / 60_000;
  return (((timestampMs * degreesPerMs) % 360) + 360) % 360;
}
