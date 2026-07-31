/**
 * Declarative scene model for the rendering engine.
 *
 * Layer order is data — never z-indices scattered through code. The composer
 * emits layers in exactly `SCENE_LAYER_ORDER`; the canvas draws them in array
 * order. New layer kinds are added to the union AND the order constant in the
 * same change.
 */

export type SceneLayerKind =
  | 'shadow'
  | 'rear-wheel'
  | 'rear-body'
  | 'front-wheel'
  | 'body'
  | 'mask'
  | 'highlights'
  | 'overlay';

/**
 * Ground up: shadow beneath everything → rear wheel assets → rear bodywork
 * (packages that ship a separate rear section; skipped when a package only
 * provides a whole `bodyImage`) → front wheel assets → the main body, whose
 * transparent arches let the wheels show through → the arch mask shading
 * above the wheels → diagnostic highlights → future branded overlay.
 */
export const SCENE_LAYER_ORDER: readonly SceneLayerKind[] = [
  'shadow',
  'rear-wheel',
  'rear-body',
  'front-wheel',
  'body',
  'mask',
  'highlights',
  'overlay',
];

/** Image source agnostic to the drawing adapter (Konva/canvas/OffscreenCanvas). */
export interface SceneImageSource {
  readonly source: CanvasImageSource;
  readonly naturalWidth: number;
  readonly naturalHeight: number;
}

export interface ImageNodeSpec {
  readonly type: 'image';
  readonly image: SceneImageSource;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly rotation?: number;
  readonly opacity?: number;
}

export interface EllipseNodeSpec {
  readonly type: 'ellipse';
  readonly x: number;
  readonly y: number;
  readonly radiusX: number;
  readonly radiusY: number;
  readonly fill?: string;
  readonly stroke?: string;
  readonly strokeWidth?: number;
  readonly opacity?: number;
}

export interface RingNodeSpec {
  readonly type: 'ring';
  readonly x: number;
  readonly y: number;
  readonly innerRadius: number;
  readonly outerRadius: number;
  readonly fill: string;
  readonly opacity?: number;
}

export interface TextNodeSpec {
  readonly type: 'text';
  readonly x: number;
  readonly y: number;
  readonly text: string;
  readonly fontSize: number;
  readonly fill: string;
  readonly opacity?: number;
}

export type SceneNode = ImageNodeSpec | EllipseNodeSpec | RingNodeSpec | TextNodeSpec;

export interface SceneLayer {
  readonly kind: SceneLayerKind;
  readonly nodes: readonly SceneNode[];
  readonly visible: boolean;
}

/** Fully-composed, adapter-independent picture of one frame. */
export interface Scene {
  readonly width: number;
  readonly height: number;
  readonly layers: readonly SceneLayer[];
}
