'use client';

import { useMemo } from 'react';
import { useVehicles } from '@/features/catalog/hooks/use-vehicles';
import { usePreviewStore } from '@/features/preview/state/preview-store';

/** Hex-like pattern → render as a real swatch; otherwise an initial chip. */
function swatchColor(colour: string): string | null {
  if (/^#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/.test(colour)) {
    return colour;
  }
  return null;
}

/**
 * Colour step — shows the colour list of the *selected* vehicle only
 * (colours are vehicle-specific; the store clears the colour whenever the
 * vehicle changes). Colours come from the vehicle summaries already cached
 * by the selector cascade — no redundant detail fetch. Solid, name-keyboard-
 * accessible buttons; the canvas tints through the same store field.
 */
export function ColourSelector() {
  const vehicleId = usePreviewStore((state) => state.vehicleId);
  const colour = usePreviewStore((state) => state.colour);
  const selectColour = usePreviewStore((state) => state.selectColour);
  const vehiclesQuery = useVehicles({ page: 1, pageSize: 100 });

  const colours = useMemo(() => {
    const vehicles = vehiclesQuery.data?.data ?? [];
    return vehicles.find((vehicle) => vehicle.id === vehicleId)?.colours ?? [];
  }, [vehiclesQuery.data, vehicleId]);

  if (vehicleId === null) {
    return (
      <p className="rounded-lg bg-slate-800/60 px-3 py-2 text-sm text-slate-400">
        Choose a vehicle to see available colours.
      </p>
    );
  }

  if (vehiclesQuery.isPending) {
    return <p className="text-sm text-slate-500">Loading colours…</p>;
  }

  if (colours.length === 0) {
    return (
      <p className="rounded-lg bg-slate-800/60 px-3 py-2 text-sm text-slate-400">
        No colour options are published for this vehicle.
      </p>
    );
  }

  return (
    <ul className="flex flex-wrap gap-2" aria-label="Vehicle colours">
      {colours.map((option) => {
        const selected = colour === option;
        const hex = swatchColor(option);
        return (
          <li key={option}>
            <button
              type="button"
              aria-pressed={selected}
              onClick={() => selectColour(selected ? null : option)}
              className={`flex min-h-11 items-center gap-2 rounded-xl border px-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${
                selected
                  ? 'border-cyan-400/70 bg-cyan-500/10 text-slate-50'
                  : 'border-slate-700 bg-slate-900/70 text-slate-200 hover:border-slate-500'
              }`}
            >
              {hex ? (
                <span
                  aria-hidden="true"
                  className="h-4 w-4 rounded-full border border-slate-600"
                  style={{ backgroundColor: hex }}
                />
              ) : (
                <span
                  aria-hidden="true"
                  className="flex h-4 w-4 items-center justify-center rounded-full border border-slate-600 text-[10px] text-slate-400"
                >
                  {option.charAt(0).toUpperCase()}
                </span>
              )}
              <span>{option}</span>
              {selected ? (
                <span aria-hidden="true" className="text-cyan-400">
                  ✓
                </span>
              ) : null}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
