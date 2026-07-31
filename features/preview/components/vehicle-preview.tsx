'use client';

import { useMemo } from 'react';
import { getVehicleById } from '@/services/vehicles/vehicle-data';
import type { VehicleMetadata } from '@/types/vehicle';

export function VehiclePreview() {
  const vehicle = getVehicleById('toyota-hilux-2025');
  const metadata = vehicle.metadata as VehicleMetadata;

  const wheelPositions = useMemo(
    () => [
      { key: 'front', x: metadata.frontWheel.x, y: metadata.frontWheel.y, radius: 120 },
      { key: 'rear', x: metadata.rearWheel.x, y: metadata.rearWheel.y, radius: 120 },
    ],
    [metadata.frontWheel.x, metadata.frontWheel.y, metadata.rearWheel.x, metadata.rearWheel.y],
  );

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-cyan-400">Preview renderer</p>
          <h2 className="text-2xl font-semibold">{vehicle.name}</h2>
        </div>
        <div className="rounded-full border border-slate-700 px-3 py-1 text-sm text-slate-300">
          Metadata-driven
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 p-4">
        <svg
          viewBox="0 0 3600 2400"
          className="w-full max-w-full rounded-xl bg-slate-950"
          role="img"
          aria-label="Vehicle preview"
        >
          <rect x="0" y="0" width="3600" height="2400" fill="#020617" />
          <image
            href={metadata.bodyImage}
            x="0"
            y="0"
            width="3600"
            height="2400"
            preserveAspectRatio="xMidYMid meet"
          />
          <image
            href={metadata.maskImage}
            x="0"
            y="0"
            width="3600"
            height="2400"
            preserveAspectRatio="xMidYMid meet"
            opacity="0.7"
          />
          <image
            href={metadata.shadowImage}
            x="0"
            y="0"
            width="3600"
            height="2400"
            preserveAspectRatio="xMidYMid meet"
            opacity="0.55"
          />
          {wheelPositions.map((wheel) => (
            <g key={wheel.key}>
              <circle
                cx={wheel.x}
                cy={wheel.y}
                r={wheel.radius}
                fill="rgba(15,23,42,0.85)"
                stroke="#fde68a"
                strokeWidth="10"
              />
              <circle
                cx={wheel.x}
                cy={wheel.y}
                r={wheel.radius - 36}
                fill="rgba(248,250,252,0.1)"
                stroke="#94a3b8"
                strokeWidth="6"
              />
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}
