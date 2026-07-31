/**
 * AssetLoader — owns every asset concern: loading, preloading, caching,
 * fallback substitution, progress reporting, error mapping and lazy
 * scheduling. It never renders; it returns adapter-agnostic loaded assets
 * ({ source, naturalWidth, naturalHeight }) which the composer consumes.
 *
 * The image factory is injectable so tests can drive success, failure and
 * timing deterministically.
 */

export type AssetStatus = 'idle' | 'loading' | 'loaded' | 'error';

export interface LoadedAsset {
  readonly source: CanvasImageSource;
  readonly naturalWidth: number;
  readonly naturalHeight: number;
}

export interface AssetLoadProgress {
  readonly settled: number;
  readonly total: number;
}

export interface AssetResult {
  readonly url: string;
  readonly asset: LoadedAsset;
  readonly fromFallback: boolean;
  readonly error?: string;
}

export type ImageFactory = () => HTMLImageElement;
/**
 * May return `undefined` when no DOM canvas exists in the host environment
 * (SSR, minimal test DOMs) — the loader falls back to a stub asset then.
 */
export type CanvasFactory = () => HTMLCanvasElement | undefined;
export type IdleScheduler = (task: () => void) => void;

export interface AssetLoaderOptions {
  readonly createImage?: ImageFactory;
  readonly createCanvas?: CanvasFactory;
  readonly scheduleIdle?: IdleScheduler;
  readonly cache?: Map<string, Promise<LoadedAsset>>;
}

interface ImageLike {
  src: string;
  onload: (() => void) | null;
  onerror: (() => void) | null;
  naturalWidth: number;
  naturalHeight: number;
}

const FALLBACK_WIDTH = 512;
const FALLBACK_HEIGHT = 512;

export class AssetLoader {
  private readonly createImage: ImageFactory;
  private readonly createCanvas?: CanvasFactory;
  private readonly scheduleIdle: IdleScheduler;
  private readonly cache: Map<string, Promise<LoadedAsset>>;

  constructor(options: AssetLoaderOptions = {}) {
    this.createImage = options.createImage ?? defaultImageFactory;
    this.createCanvas = options.createCanvas;
    this.scheduleIdle = options.scheduleIdle ?? defaultIdleScheduler;
    this.cache = options.cache ?? new Map();
  }

  /**
   * Load one image. Concurrent and repeated calls for the same URL share a
   * single in-flight request. Failures substitute a generated fallback asset
   * and resolve — a broken URL must never take the scene down.
   */
  load(url: string): Promise<AssetResult> {
    const promise = this.loadImage(url);
    return promise
      .then((asset) => ({ url, asset, fromFallback: false }))
      .catch((error: unknown) => ({
        url,
        asset: this.createFallbackAsset(fallbackLabel(url)),
        fromFallback: true,
        error: error instanceof Error ? error.message : String(error),
      }));
  }

  /**
   * Preload many URLs, reporting progress after each one settles. Resolves
   * once every URL has settled (successfully or via fallback) — order of
   * results matches the input order.
   */
  async preload(
    urls: readonly string[],
    onProgress?: (progress: AssetLoadProgress) => void,
  ): Promise<AssetResult[]> {
    const total = urls.length;
    let settled = 0;

    const report = () => {
      settled += 1;
      onProgress?.({ settled, total });
    };

    return Promise.all(urls.map((url) => this.load(url).then((result) => (report(), result))));
  }

  /**
   * Lazy preloading: schedules low-priority warming of the cache during
   * browser idle time. Returned assets are ignored by design — callers that
   * need the result use `load`/`preload`.
   */
  loadLazily(urls: readonly string[]): void {
    for (const url of urls) {
      this.scheduleIdle(() => {
        void this.load(url);
      });
    }
  }

  /** Remove a cached entry (e.g. after an asset is re-published). */
  invalidate(url: string): void {
    this.cache.delete(url);
  }

  get size(): number {
    return this.cache.size;
  }

  private loadImage(url: string): Promise<LoadedAsset> {
    const cached = this.cache.get(url);
    if (cached) {
      return cached;
    }

    const promise = this.decode(url);
    this.cache.set(url, promise);
    // A failed entry is evicted so a later retry is possible.
    promise.catch(() => this.cache.delete(url));
    return promise;
  }

  private decode(url: string): Promise<LoadedAsset> {
    return new Promise((resolve, reject) => {
      const image = this.createImage() as ImageLike;
      image.onload = () => {
        image.onload = null;
        image.onerror = null;
        resolve({
          source: image as unknown as CanvasImageSource,
          naturalWidth: image.naturalWidth,
          naturalHeight: image.naturalHeight,
        });
      };
      image.onerror = () => {
        image.onload = null;
        image.onerror = null;
        reject(new Error(`Unable to load asset: ${url}`));
      };
      image.src = url;
    });
  }

  /**
   * Generated stand-in for a missing asset: a muted panel with a diagonal
   * cross, clearly legible as a stand-in without breaking scene geometry.
   * Falls back to a 1x1 transparent canvas-object when no DOM canvas exists.
   */
  private createFallbackAsset(label: string): LoadedAsset {
    const canvasFactory = this.createCanvas ?? defaultCanvasFactory;
    const canvas = canvasFactory();

    if (canvas && typeof window !== 'undefined') {
      const context = canvas.getContext('2d');
      canvas.width = FALLBACK_WIDTH;
      canvas.height = FALLBACK_HEIGHT;
      if (context) {
        context.fillStyle = '#1e293b';
        context.fillRect(0, 0, FALLBACK_WIDTH, FALLBACK_HEIGHT);
        context.strokeStyle = '#475569';
        context.lineWidth = 6;
        context.strokeRect(8, 8, FALLBACK_WIDTH - 16, FALLBACK_HEIGHT - 16);
        context.beginPath();
        context.moveTo(8, 8);
        context.lineTo(FALLBACK_WIDTH - 8, FALLBACK_HEIGHT - 8);
        context.moveTo(FALLBACK_WIDTH - 8, 8);
        context.lineTo(8, FALLBACK_HEIGHT - 8);
        context.stroke();
        context.fillStyle = '#94a3b8';
        context.font = '28px sans-serif';
        context.textAlign = 'center';
        context.fillText(label, FALLBACK_WIDTH / 2, FALLBACK_HEIGHT / 2 + 10);
      }
      return {
        source: canvas,
        naturalWidth: FALLBACK_WIDTH,
        naturalHeight: FALLBACK_HEIGHT,
      };
    }

    return { source: {} as CanvasImageSource, naturalWidth: 1, naturalHeight: 1 };
  }
}

function defaultImageFactory(): HTMLImageElement {
  return new Image();
}

function defaultCanvasFactory(): HTMLCanvasElement | undefined {
  return typeof document === 'undefined' ? undefined : document.createElement('canvas');
}

function defaultIdleScheduler(task: () => void): void {
  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    window.requestIdleCallback(task);
  } else {
    setTimeout(task, 0);
  }
}

function fallbackLabel(url: string): string {
  const fileName = url.split('/').pop() ?? 'asset';
  return fileName.length > 20 ? `${fileName.slice(0, 17)}…` : fileName;
}
