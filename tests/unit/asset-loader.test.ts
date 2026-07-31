import { afterEach, describe, expect, it, vi } from 'vitest';
import { AssetLoader } from '@/features/preview/engine/asset-loader';

/**
 * AssetLoader tests drive success, failure, caching, concurrency, fallback,
 * progress and lazy scheduling through the injected factories — no network,
 * no DOM image loading.
 */

interface FakeImage {
  src: string;
  onload: (() => void) | null;
  onerror: (() => void) | null;
  naturalWidth: number;
  naturalHeight: number;
}

function createImageHarness(outcome: 'load' | 'error' | ((url: string) => 'load' | 'error')) {
  const instances: FakeImage[] = [];
  const factory = () => {
    const image: FakeImage = {
      src: '',
      onload: null,
      onerror: null,
      naturalWidth: 800,
      naturalHeight: 600,
    };
    Object.defineProperty(image, 'src', {
      set(url: string) {
        const result = typeof outcome === 'function' ? outcome(url) : outcome;
        queueMicrotask(() => {
          if (result === 'load') {
            image.onload?.();
          } else {
            image.onerror?.();
          }
        });
      },
      get() {
        return '';
      },
    });
    instances.push(image);
    return image as unknown as HTMLImageElement;
  };
  return { instances, factory };
}

describe('AssetLoader.load', () => {
  it('resolves the loaded asset with its natural dimensions', async () => {
    const { factory } = createImageHarness('load');
    const loader = new AssetLoader({ createImage: factory });

    const result = await loader.load('/vehicles/body.webp');

    expect(result.fromFallback).toBe(false);
    expect(result.asset.naturalWidth).toBe(800);
    expect(result.asset.naturalHeight).toBe(600);
  });

  it('caches by URL: repeated loads share one request and one identity', async () => {
    const { instances, factory } = createImageHarness('load');
    const loader = new AssetLoader({ createImage: factory });

    const [a, b] = await Promise.all([loader.load('/a.webp'), loader.load('/a.webp')]);

    expect(instances).toHaveLength(1);
    expect(a.asset).toBe(b.asset);
    expect(loader.size).toBe(1);
  });

  it('substitutes a generated fallback when loading fails', async () => {
    const { factory } = createImageHarness('error');
    const loader = new AssetLoader({ createImage: factory });

    const result = await loader.load('/missing/body.webp');

    expect(result.fromFallback).toBe(true);
    expect(result.error).toContain('/missing/body.webp');
    expect(result.asset.naturalWidth).toBeGreaterThan(1);
  });

  it('evicts failed entries so a retry is possible', async () => {
    let calls = 0;
    const { instances, factory } = createImageHarness((url) => {
      calls += 1;
      return calls === 1 ? 'error' : 'load';
    });
    const loader = new AssetLoader({ createImage: factory });

    const failed = await loader.load('/flakey.webp');
    expect(failed.fromFallback).toBe(true);
    expect(loader.size).toBe(0);

    const retried = await loader.load('/flakey.webp');
    expect(retried.fromFallback).toBe(false);
    expect(instances).toHaveLength(2);
  });

  it('paints the fallback panel with a truncated label via the canvas context', async () => {
    const fillText = vi.fn();
    const fakeContext = {
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 0,
      font: '',
      textAlign: '',
      fillRect: vi.fn(),
      strokeRect: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      fillText,
    };
    const fakeCanvas = {
      width: 0,
      height: 0,
      getContext: () => fakeContext,
    } as unknown as HTMLCanvasElement;
    const { factory } = createImageHarness('error');
    const loader = new AssetLoader({ createImage: factory, createCanvas: () => fakeCanvas });
    const long = '/assets/' + 'x'.repeat(40) + '.webp';

    const result = await loader.load(long);

    expect(result.fromFallback).toBe(true);
    expect(result.asset.naturalWidth).toBe(512);
    expect(fillText).toHaveBeenCalledWith(
      'x'.repeat(17) + '…',
      expect.any(Number),
      expect.any(Number),
    );
    expect(fakeContext.fillRect).toHaveBeenCalled();
    expect(fakeContext.strokeRect).toHaveBeenCalled();
    expect(fakeContext.stroke).toHaveBeenCalled();
  });

  it('produces a minimal stub asset when no DOM canvas is available', async () => {
    const { factory } = createImageHarness('error');
    const loader = new AssetLoader({ createImage: factory, createCanvas: () => undefined });

    const result = await loader.load('/gone.webp');

    expect(result.fromFallback).toBe(true);
    expect(result.asset.naturalWidth).toBe(1);
    expect(result.asset.naturalHeight).toBe(1);
  });
});

describe('AssetLoader defaults', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete (window as unknown as { requestIdleCallback?: unknown }).requestIdleCallback;
  });

  it('works with entirely default factories (DOM Image, setTimeout idle scheduler)', async () => {
    const { instances, factory } = createImageHarness('load');
    // `defaultImageFactory` constructs with `new Image()`, so the stub must be
    // constructible: a plain function (never an arrow) whose return value — the
    // fake image — becomes the result of the `new` expression.
    const ImageStub = vi.fn(function (this: unknown) {
      return factory();
    });
    vi.stubGlobal('Image', ImageStub);
    const loader = new AssetLoader();

    const result = await loader.load('/default.webp');

    expect(ImageStub).toHaveBeenCalled();
    expect(result.asset.naturalWidth).toBe(800);
    expect(instances).toHaveLength(1);

    // jsdom has no requestIdleCallback, so the default scheduler must fall back
    // to setTimeout for lazy loads.
    loader.loadLazily(['/default-lazy.webp']);
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(instances).toHaveLength(2);
  });

  it('prefers requestIdleCallback for lazy scheduling when available', () => {
    const ric = vi.fn((task: () => void) => task());
    (window as unknown as { requestIdleCallback: typeof ric }).requestIdleCallback = ric;
    const { instances, factory } = createImageHarness('load');
    const loader = new AssetLoader({ createImage: factory });

    loader.loadLazily(['/warm.webp']);

    expect(ric).toHaveBeenCalled();
    expect(instances).toHaveLength(1);
  });
});

describe('AssetLoader.preload', () => {
  it('preserves input order and reports progress after every settle', async () => {
    const { factory } = createImageHarness((url) => (url.includes('bad') ? 'error' : 'load'));
    const loader = new AssetLoader({ createImage: factory });
    const progress: Array<{ settled: number; total: number }> = [];

    const results = await loader.preload(['/one.webp', '/bad.webp', '/two.webp'], (p) =>
      progress.push(p),
    );

    expect(results.map((r) => r.url)).toEqual(['/one.webp', '/bad.webp', '/two.webp']);
    expect(results.map((r) => r.fromFallback)).toEqual([false, true, false]);
    expect(progress).toEqual([
      { settled: 1, total: 3 },
      { settled: 2, total: 3 },
      { settled: 3, total: 3 },
    ]);
  });

  it('handles an empty set without reporting progress', async () => {
    const loader = new AssetLoader({ createImage: createImageHarness('load').factory });
    const onProgress = vi.fn();

    await expect(loader.preload([], onProgress)).resolves.toEqual([]);
    expect(onProgress).not.toHaveBeenCalled();
  });
});

describe('AssetLoader lazy loading and cache control', () => {
  it('schedules lazy loads through the injected idle scheduler', async () => {
    const { instances, factory } = createImageHarness('load');
    const tasks: Array<() => void> = [];
    const loader = new AssetLoader({
      createImage: factory,
      scheduleIdle: (task) => tasks.push(task),
    });

    loader.loadLazily(['/lazy-1.webp', '/lazy-2.webp']);
    expect(instances).toHaveLength(0);
    expect(tasks).toHaveLength(2);

    for (const task of tasks) task();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(instances).toHaveLength(2);
    expect(loader.size).toBe(2);
  });

  it('invalidate() drops a cached entry', async () => {
    const { instances, factory } = createImageHarness('load');
    const loader = new AssetLoader({ createImage: factory });

    await loader.load('/a.webp');
    loader.invalidate('/a.webp');
    expect(loader.size).toBe(0);

    await loader.load('/a.webp');
    expect(instances).toHaveLength(2);
  });
});
