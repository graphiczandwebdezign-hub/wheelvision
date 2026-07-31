'use client';

import {
  createContext,
  createElement,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { TyreDetail, VehicleDetail, WheelDetail } from '@/types/catalog';
import { AssetLoader, type AssetLoadProgress } from '@/features/preview/engine/asset-loader';
import { composeScene, type SceneAssets } from '@/features/preview/engine/scene-composer';
import type { Scene } from '@/features/preview/engine/layer-types';
import {
  createRenderContext,
  type DiagnosticsConfig,
  type RenderContext,
} from '@/features/preview/engine/render-context';

/**
 * RendererProvider — the orchestration boundary of the engine.
 *
 * Owns everything stateful: building the immutable RenderContext from
 * catalog DTOs, driving the AssetLoader for the assets the metadata
 * references, tracking load progress, and memoizing the composed scene so
 * the canvas only ever re-renders when something actually changed.
 * It performs no drawing itself and contains no vehicle-specific logic.
 */

export interface RendererProviderProps {
  readonly vehicle: VehicleDetail;
  readonly wheel?: WheelDetail | null;
  readonly tyre?: TyreDetail | null;
  readonly wheelFinish?: string | null;
  readonly selectedWheelSizeId?: string | null;
  readonly selectedTyreProfileId?: string | null;
  readonly diagnostics?: Partial<DiagnosticsConfig>;
  /** Injectable for tests; a shared cached loader is used otherwise. */
  readonly loader?: AssetLoader;
  readonly children?: ReactNode;
}

export interface RendererState {
  readonly context: RenderContext;
  readonly scene: Scene;
  readonly progress: AssetLoadProgress;
  readonly loading: boolean;
  readonly assetErrors: readonly string[];
}

const RendererReactContext = createContext<RendererState | null>(null);

export function useRenderer(): RendererState {
  const state = useContext(RendererReactContext);
  if (!state) {
    throw new Error('useRenderer must be used inside <RendererProvider>');
  }
  return state;
}

let sharedLoader: AssetLoader | null = null;

/** Process-wide loader so repeated previews share the warm asset cache. */
function getSharedLoader(): AssetLoader {
  if (sharedLoader === null) {
    sharedLoader = new AssetLoader();
  }
  return sharedLoader;
}

export function RendererProvider({
  vehicle,
  wheel = null,
  tyre = null,
  wheelFinish = null,
  selectedWheelSizeId = null,
  selectedTyreProfileId = null,
  diagnostics,
  loader,
  children,
}: RendererProviderProps) {
  const activeLoader = useMemo(() => loader ?? getSharedLoader(), [loader]);

  const renderMetadata = vehicle.renderMetadata;

  const wheelSize = useMemo(
    () => wheel?.sizes.find((size) => size.id === selectedWheelSizeId) ?? wheel?.sizes[0] ?? null,
    [wheel, selectedWheelSizeId],
  );

  const tyreProfile = useMemo(
    () =>
      tyre?.profiles.find((profile) => profile.id === selectedTyreProfileId) ??
      tyre?.profiles[0] ??
      null,
    [tyre, selectedTyreProfileId],
  );

  const context = useMemo(() => {
    if (!renderMetadata) {
      return null;
    }
    const displayParts = [
      vehicle.year,
      vehicle.manufacturer,
      vehicle.model,
      vehicle.variant,
    ].filter((part): part is string | number => part !== null && part !== undefined);
    return createRenderContext({
      vehicle: { id: vehicle.id, displayName: displayParts.join(' ') },
      renderMetadata,
      wheel: wheel ? { id: wheel.id, brand: wheel.brand, model: wheel.model } : null,
      wheelFinish,
      wheelSize,
      tyre: tyre ? { id: tyre.id, brand: tyre.brand, pattern: tyre.pattern } : null,
      tyreProfile,
      diagnostics,
    });
  }, [renderMetadata, vehicle, wheel, wheelFinish, wheelSize, tyre, tyreProfile, diagnostics]);

  const [assets, setAssets] = useState<SceneAssets>({});
  const [progress, setProgress] = useState<AssetLoadProgress>({ settled: 0, total: 0 });
  const [assetErrors, setAssetErrors] = useState<readonly string[]>([]);

  useEffect(() => {
    if (!renderMetadata) {
      setAssets({});
      setProgress({ settled: 0, total: 0 });
      setAssetErrors([]);
      return;
    }

    let cancelled = false;
    const wanted = [
      ['body', renderMetadata.bodyImage],
      ['shadow', renderMetadata.shadowImage],
      ['mask', renderMetadata.maskImage],
    ] as const;

    setProgress({ settled: 0, total: wanted.length });
    setAssetErrors([]);

    void Promise.all(
      wanted.map(([slot, url]) =>
        activeLoader.load(url).then((result) => {
          if (!cancelled) {
            setProgress((current) => ({ ...current, settled: current.settled + 1 }));
          }
          return { slot, result };
        }),
      ),
    ).then((results) => {
      if (cancelled) {
        return;
      }
      const next = Object.fromEntries(
        results.map(({ slot, result }) => [slot, result.asset]),
      ) as SceneAssets;
      setAssets(next);
      setAssetErrors(
        results
          .filter(({ result }) => result.error)
          .map(({ result }) => `${result.url}: ${result.error}`),
      );
    });

    return () => {
      cancelled = true;
    };
  }, [activeLoader, renderMetadata]);

  const scene = useMemo(() => (context ? composeScene(context, assets) : null), [context, assets]);

  const loading = progress.total > 0 && progress.settled < progress.total;

  const state = useMemo<RendererState | null>(() => {
    if (!context || !scene) {
      return null;
    }
    return { context, scene, progress, loading, assetErrors };
  }, [context, scene, progress, loading, assetErrors]);

  if (!state) {
    return null;
  }

  return createElement(RendererReactContext.Provider, { value: state }, children);
}
