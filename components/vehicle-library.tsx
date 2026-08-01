'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { UploadCloud, Car } from 'lucide-react'
import { DEMO_VEHICLES, type DemoVehicle } from '@/lib/wheelmagic'
import { cn } from '@/lib/utils'

interface Props {
  activeVehicleId: string
  onSelect: (id: string) => void
  onUpload: (file: File) => void
}

export function VehicleLibrary({ activeVehicleId, onSelect, onUpload }: Props) {
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragging(false)
      const file = e.dataTransfer.files?.[0]
      if (file && file.type.startsWith('image/')) onUpload(file)
    },
    [onUpload],
  )

  return (
    <aside className="glass wm-scroll flex w-full flex-col gap-4 overflow-y-auto rounded-2xl p-4 lg:w-[320px] lg:shrink-0">
      <SectionTitle icon={<Car className="h-4 w-4" />} title="Vehicle Library" hint="6 assets" />

      {/* Upload zone */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed p-5 text-center transition-all',
          dragging
            ? 'border-primary bg-primary/10 text-primary'
            : 'border-border/70 text-muted-foreground hover:border-primary/50 hover:text-foreground',
        )}
      >
        <UploadCloud className="h-6 w-6" />
        <div className="text-xs font-medium">Drop a vehicle image</div>
        <div className="font-mono text-[10px] text-muted-foreground">
          photo or prepared PNG · auto-detects wheels
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) onUpload(f)
          }}
        />
      </div>

      {/* Demo grid */}
      <div className="grid grid-cols-2 gap-3">
        {DEMO_VEHICLES.map((v) => (
          <VehicleCard
            key={v.id}
            vehicle={v}
            active={activeVehicleId === v.id}
            onSelect={() => onSelect(v.id)}
          />
        ))}
      </div>
    </aside>
  )
}

function VehicleCard({
  vehicle,
  active,
  onSelect,
}: {
  vehicle: DemoVehicle
  active: boolean
  onSelect: () => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const cv = canvasRef.current
    if (!cv) return
    const ctx = cv.getContext('2d')
    if (!ctx) return
    // checker under thumbnail
    vehicle.draw(ctx, cv.width, cv.height)
  }, [vehicle])

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-xl border bg-secondary/40 p-2 text-left transition-all duration-200',
        active
          ? 'glow-orange border-primary'
          : 'border-border/60 hover:border-primary/40 hover:bg-secondary/70',
      )}
    >
      <div className="checker mb-2 overflow-hidden rounded-lg">
        <canvas
          ref={canvasRef}
          width={192}
          height={108}
          className="h-auto w-full"
        />
      </div>
      <div className="truncate text-[11px] font-semibold leading-tight">
        {vehicle.name}
      </div>
      <div className="font-mono text-[9px] uppercase tracking-wide text-muted-foreground">
        {vehicle.type} · {vehicle.wheelbase}
      </div>
      {active && (
        <span className="absolute right-2 top-2 h-2 w-2 animate-wm-pulse rounded-full bg-primary" />
      )}
    </button>
  )
}

export function SectionTitle({
  icon,
  title,
  hint,
}: {
  icon: React.ReactNode
  title: string
  hint?: string
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="text-primary">{icon}</span>
        <h2 className="font-mono text-xs font-semibold uppercase tracking-[0.18em]">
          {title}
        </h2>
      </div>
      {hint && (
        <span className="font-mono text-[10px] text-muted-foreground">{hint}</span>
      )}
    </div>
  )
}
