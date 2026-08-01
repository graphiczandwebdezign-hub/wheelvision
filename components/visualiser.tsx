'use client'

import type { RefObject } from 'react'
import { Eye, EyeOff, Activity, Gauge } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { CANVAS_H, CANVAS_W, type WheelMetadata } from '@/lib/wheelmagic'
import { cn } from '@/lib/utils'

interface Props {
  vehicleName: string
  metadata: WheelMetadata | null
  showDetection: boolean
  onToggleDetection: (v: boolean) => void
  showFront: boolean
  showRear: boolean
  onToggleFront: (v: boolean) => void
  onToggleRear: (v: boolean) => void
  detecting: boolean
  fps: number
  mainCanvasRef: RefObject<HTMLCanvasElement | null>
  overlayCanvasRef: RefObject<HTMLCanvasElement | null>
}

export function Visualiser({
  vehicleName,
  metadata,
  showDetection,
  onToggleDetection,
  showFront,
  showRear,
  onToggleFront,
  onToggleRear,
  detecting,
  fps,
  mainCanvasRef,
  overlayCanvasRef,
}: Props) {
  const wheelCount = (showFront ? 1 : 0) + (showRear ? 1 : 0)

  return (
    <section className="glass flex min-w-0 flex-1 flex-col gap-3 rounded-2xl p-4">
      {/* Top bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-balance text-lg font-semibold">{vehicleName}</h1>
          <Badge
            variant="outline"
            className="border-border/70 font-mono text-[10px] text-muted-foreground"
          >
            {CANVAS_W}×{CANVAS_H}
          </Badge>
        </div>
        <label className="glass flex cursor-pointer items-center gap-2 rounded-lg px-3 py-1.5">
          {showDetection ? (
            <Eye className="h-4 w-4 text-primary" />
          ) : (
            <EyeOff className="h-4 w-4 text-muted-foreground" />
          )}
          <span className="font-mono text-[11px] uppercase tracking-wide">
            Detection
          </span>
          <Switch checked={showDetection} onCheckedChange={onToggleDetection} />
        </label>
      </div>

      {/* Canvas stage */}
      <div className="relative flex-1">
        <div
          className="checker relative mx-auto flex aspect-video w-full items-center justify-center overflow-hidden rounded-xl border border-border/70"
          style={{
            boxShadow:
              '0 30px 80px -20px rgba(0,0,0,0.8), inset 0 0 120px rgba(0,0,0,0.35)',
          }}
        >
          <canvas
            ref={mainCanvasRef}
            width={CANVAS_W}
            height={CANVAS_H}
            className="absolute inset-0 h-full w-full"
          />
          <canvas
            ref={overlayCanvasRef}
            width={CANVAS_W}
            height={CANVAS_H}
            className="pointer-events-none absolute inset-0 h-full w-full"
          />

          {/* scanning line during detection */}
          {detecting && (
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              <div className="absolute left-0 top-0 h-full w-1 animate-[scan_1.1s_ease-in-out_infinite] bg-primary/80 shadow-[0_0_24px_6px_rgba(255,90,31,0.6)]" />
              <div className="absolute left-4 top-4 flex items-center gap-2 rounded-md bg-background/80 px-2 py-1 font-mono text-[11px] text-primary">
                <Activity className="h-3.5 w-3.5 animate-wm-pulse" />
                DETECTING WHEELS…
              </div>
            </div>
          )}
        </div>
        <style>{`@keyframes scan{0%{left:0}50%{left:calc(100% - 4px)}100%{left:0}}`}</style>
      </div>

      {/* Bottom bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 bg-secondary/40 px-4 py-2.5">
        <div className="flex items-center gap-4">
          <WheelToggle label="Front" checked={showFront} onChange={onToggleFront} />
          <WheelToggle label="Rear" checked={showRear} onChange={onToggleRear} />
        </div>
        <div className="flex items-center gap-4">
          <span
            className={cn(
              'flex items-center gap-1.5 font-mono text-[11px]',
              metadata ? 'text-emerald-400' : 'text-muted-foreground',
            )}
          >
            <span
              className={cn(
                'h-1.5 w-1.5 rounded-full',
                metadata ? 'bg-emerald-400' : 'bg-muted-foreground',
              )}
            />
            {metadata ? `\u2713 ${wheelCount} wheels detected` : 'no detection'}
          </span>
          <span className="flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
            <Gauge className="h-3.5 w-3.5" />
            {fps} FPS
          </span>
        </div>
      </div>
    </section>
  )
}

function WheelToggle({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2">
      <Switch checked={checked} onCheckedChange={onChange} size="sm" />
      <span className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
    </label>
  )
}
