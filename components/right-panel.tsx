'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Check,
  Copy,
  Download,
  FileJson,
  ListChecks,
  Ruler,
  Sparkles,
  UploadCloud,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Slider } from '@/components/ui/slider'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  DEMO_RIMS,
  downloadDataUrl,
  type DemoRim,
  type DetectionStep,
  type WheelMetadata,
} from '@/lib/wheelmagic'
import { SectionTitle } from '@/components/vehicle-library'
import { cn } from '@/lib/utils'

interface Props {
  activeRimId: string
  onSelectRim: (id: string) => void
  onRimUpload: (file: File) => void
  sizeInches: number
  onSizeChange: (inches: number) => void
  scale: number
  metadata: WheelMetadata | null
  steps: DetectionStep[]
  getMainCanvas: () => HTMLCanvasElement | null
}

const SIZE_STOPS = [17, 18, 20, 22]

export function RightPanel({
  activeRimId,
  onSelectRim,
  onRimUpload,
  sizeInches,
  onSizeChange,
  scale,
  metadata,
  steps,
  getMainCanvas,
}: Props) {
  return (
    <aside className="glass wm-scroll flex w-full flex-col gap-4 overflow-y-auto rounded-2xl p-4 lg:w-[360px] lg:shrink-0">
      <Tabs defaultValue="rims" className="flex flex-1 flex-col gap-4">
        <TabsList className="grid w-full grid-cols-2 bg-secondary/60">
          <TabsTrigger value="rims">Rims</TabsTrigger>
          <TabsTrigger value="controls">Controls</TabsTrigger>
        </TabsList>

        <TabsContent value="rims" className="flex flex-col gap-4">
          <RimsTab
            activeRimId={activeRimId}
            onSelectRim={onSelectRim}
            onRimUpload={onRimUpload}
          />
        </TabsContent>

        <TabsContent value="controls" className="flex flex-col gap-5">
          <ControlsTab
            sizeInches={sizeInches}
            onSizeChange={onSizeChange}
            scale={scale}
            metadata={metadata}
            steps={steps}
            getMainCanvas={getMainCanvas}
          />
        </TabsContent>
      </Tabs>
    </aside>
  )
}

// ---------------------------------------------------------------------------
function RimsTab({
  activeRimId,
  onSelectRim,
  onRimUpload,
}: {
  activeRimId: string
  onSelectRim: (id: string) => void
  onRimUpload: (file: File) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  return (
    <>
      <SectionTitle
        icon={<Sparkles className="h-4 w-4" />}
        title="Rim Catalogue"
        hint="8 rims"
      />
      <div className="grid grid-cols-2 gap-3">
        {DEMO_RIMS.map((r) => (
          <RimCard
            key={r.id}
            rim={r}
            active={activeRimId === r.id}
            onSelect={() => onSelectRim(r.id)}
          />
        ))}
      </div>

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
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          const f = e.dataTransfer.files?.[0]
          if (f && f.type.startsWith('image/')) onRimUpload(f)
        }}
        className={cn(
          'flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed p-4 text-center transition-all',
          dragging
            ? 'border-primary bg-primary/10 text-primary'
            : 'border-border/70 text-muted-foreground hover:border-primary/50 hover:text-foreground',
        )}
      >
        <UploadCloud className="h-5 w-5" />
        <span className="text-xs font-medium">Upload custom rim PNG</span>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) onRimUpload(f)
          }}
        />
      </div>
    </>
  )
}

function RimCard({
  rim,
  active,
  onSelect,
}: {
  rim: DemoRim
  active: boolean
  onSelect: () => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const cv = canvasRef.current
    if (!cv) return
    const ctx = cv.getContext('2d')
    if (!ctx) return
    rim.draw(ctx, cv.width)
  }, [rim])

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'group relative flex flex-col items-center gap-2 rounded-xl border p-2.5 transition-all duration-200',
        active
          ? 'glow-orange border-primary bg-primary/5'
          : 'border-border/60 bg-secondary/40 hover:border-primary/40 hover:bg-secondary/70',
      )}
    >
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={120}
          height={120}
          className={cn(
            'h-16 w-16 transition-transform duration-300',
            active ? 'scale-105' : 'group-hover:scale-105',
          )}
        />
      </div>
      <div className="w-full truncate text-center text-[10px] font-semibold leading-tight">
        {rim.name}
      </div>
      <div className="flex items-center gap-1">
        <Badge
          variant="outline"
          className="border-primary/40 px-1 py-0 font-mono text-[8px] text-primary"
        >
          {rim.inches}&quot;
        </Badge>
        <Badge
          variant="outline"
          className="border-border/70 px-1 py-0 font-mono text-[8px] text-muted-foreground"
        >
          {rim.style}
        </Badge>
      </div>
    </button>
  )
}

// ---------------------------------------------------------------------------
function ControlsTab({
  sizeInches,
  onSizeChange,
  scale,
  metadata,
  steps,
  getMainCanvas,
}: {
  sizeInches: number
  onSizeChange: (inches: number) => void
  scale: number
  metadata: WheelMetadata | null
  steps: DetectionStep[]
  getMainCanvas: () => HTMLCanvasElement | null
}) {
  const [copied, setCopied] = useState(false)

  const metaJson = metadata
    ? JSON.stringify(
        {
          front: metadata.front,
          rear: metadata.rear,
        },
        null,
        2,
      )
    : '{\n  "front": null,\n  "rear": null\n}'

  const copyMeta = useCallback(() => {
    navigator.clipboard?.writeText(metaJson)
    setCopied(true)
    setTimeout(() => setCopied(false), 1400)
  }, [metaJson])

  const downloadPng = useCallback(() => {
    const cv = getMainCanvas()
    if (!cv) return
    downloadDataUrl(cv.toDataURL('image/png'), 'wheelmagic-render.png')
  }, [getMainCanvas])

  const downloadMeta = useCallback(() => {
    const blob = `data:application/json;charset=utf-8,${encodeURIComponent(metaJson)}`
    downloadDataUrl(blob, 'wheelmagic-metadata.json')
  }, [metaJson])

  return (
    <>
      {/* Size slider */}
      <div className="flex flex-col gap-3">
        <SectionTitle icon={<Ruler className="h-4 w-4" />} title="Rim Size" />
        <Slider
          value={[sizeInches]}
          min={17}
          max={22}
          step={1}
          onValueChange={(v) => onSizeChange((v as number[])[0])}
        />
        <div className="flex justify-between px-0.5">
          {SIZE_STOPS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onSizeChange(s)}
              className={cn(
                'font-mono text-[10px] transition-colors',
                sizeInches === s
                  ? 'font-bold text-primary'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {s}&quot;
            </button>
          ))}
        </div>
        <div className="rounded-lg border border-border/60 bg-secondary/40 px-3 py-2 font-mono text-xs">
          Scale:{' '}
          <span className="font-bold text-primary">
            {Math.round(scale * 100)}%
          </span>{' '}
          <span className="text-muted-foreground">
            ({sizeInches} inch master)
          </span>
        </div>
      </div>

      <Separator className="bg-border/60" />

      {/* Metadata JSON viewer */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <SectionTitle icon={<FileJson className="h-4 w-4" />} title="Metadata" />
          <button
            type="button"
            onClick={copyMeta}
            className="flex items-center gap-1 rounded-md border border-border/60 px-2 py-1 font-mono text-[10px] text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
          >
            {copied ? (
              <>
                <Check className="h-3 w-3" /> Copied
              </>
            ) : (
              <>
                <Copy className="h-3 w-3" /> Copy
              </>
            )}
          </button>
        </div>
        <pre className="wm-scroll max-h-44 overflow-auto rounded-lg border border-border/60 bg-[#0b0b0b] p-3 font-mono text-[11px] leading-relaxed text-emerald-300/90">
          {metaJson}
        </pre>
      </div>

      <Separator className="bg-border/60" />

      {/* Detection log */}
      <div className="flex flex-col gap-2">
        <SectionTitle icon={<ListChecks className="h-4 w-4" />} title="Detection Log" />
        <div className="flex flex-col gap-1.5">
          {steps.length === 0 && (
            <div className="font-mono text-[11px] text-muted-foreground">
              awaiting pipeline…
            </div>
          )}
          {steps.map((step, i) => (
            <div
              key={i}
              className="flex items-center gap-2 rounded-md border border-border/50 bg-secondary/30 px-2.5 py-1.5"
            >
              <Check className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
              <span className="font-mono text-[11px] font-medium">
                {step.label}
              </span>
              <span className="ml-auto truncate font-mono text-[10px] text-muted-foreground">
                {step.detail}
              </span>
            </div>
          ))}
        </div>
      </div>

      <Separator className="bg-border/60" />

      {/* Downloads */}
      <div className="flex flex-col gap-2">
        <Button
          onClick={downloadPng}
          className="glow-orange h-11 w-full gap-2 bg-primary font-semibold text-primary-foreground hover:bg-primary/90"
        >
          <Download className="h-4 w-4" />
          Download PNG
        </Button>
        <Button
          onClick={downloadMeta}
          variant="outline"
          className="h-10 w-full gap-2 border-border/70 bg-transparent font-mono text-xs hover:border-primary/50 hover:text-primary"
        >
          <FileJson className="h-4 w-4" />
          Download Metadata
        </Button>
      </div>
    </>
  )
}
