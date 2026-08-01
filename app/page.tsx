'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import {
  DEMO_RIMS,
  DEMO_VEHICLES,
  buildRimCanvas,
  buildVehicleCanvas,
  detectWheels,
  drawDetectionOverlay,
  inchesToScale,
  makeCanvas,
  renderComposition,
  CANVAS_W,
  CANVAS_H,
  type DetectionStep,
  type WheelMetadata,
} from '@/lib/wheelmagic'
import { VehicleLibrary } from '@/components/vehicle-library'
import { Visualiser } from '@/components/visualiser'
import { RightPanel } from '@/components/right-panel'

export default function Page() {
  // ---- core state ----
  const [activeVehicleId, setActiveVehicleId] = useState('suv')
  const [activeRimId, setActiveRimId] = useState('fuel-rebel')
  const [metadata, setMetadata] = useState<WheelMetadata | null>(null)
  const [scale, setScale] = useState(1) // 22" master = 100%
  const [sizeInches, setSizeInches] = useState(22)
  const [showDetection, setShowDetection] = useState(true)
  const [showFront, setShowFront] = useState(true)
  const [showRear, setShowRear] = useState(true)
  const [steps, setSteps] = useState<DetectionStep[]>([])
  const [detecting, setDetecting] = useState(false)
  const [fps, setFps] = useState(60)
  const [photoMode, setPhotoMode] = useState(false)

  // ---- canvas asset stores ----
  const vehicleCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const rimCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const uploadedVehicle = useRef<HTMLCanvasElement | null>(null)
  const uploadedRim = useRef<HTMLCanvasElement | null>(null)

  // ---- visible canvas refs (set by Visualiser) ----
  const mainCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null)

  const activeVehicle = useMemo(
    () => DEMO_VEHICLES.find((v) => v.id === activeVehicleId) ?? null,
    [activeVehicleId],
  )
  const activeRim = useMemo(
    () => DEMO_RIMS.find((r) => r.id === activeRimId) ?? null,
    [activeRimId],
  )

  const rerender = useCallback(() => {
    if (!mainCanvasRef.current) return
    renderComposition(
      mainCanvasRef.current,
      vehicleCanvasRef.current,
      rimCanvasRef.current,
      metadata,
      { scale, showFront, showRear, overlayMode: photoMode ? 'on-top' : 'behind' },
    )
  }, [metadata, scale, showFront, showRear, photoMode])

  // ---- run the detection pipeline on a vehicle canvas ----
  const runDetection = useCallback((vehicleCanvas: HTMLCanvasElement) => {
    setDetecting(true)
    setSteps([])
    // downscale for fast pixel scanning, then map back up
    const sw = 480
    const sh = Math.round((vehicleCanvas.height / vehicleCanvas.width) * sw)
    const small = makeCanvas(sw, sh)
    const sctx = small.getContext('2d')
    if (!sctx) return
    sctx.drawImage(vehicleCanvas, 0, 0, sw, sh)
    const imageData = sctx.getImageData(0, 0, sw, sh)
    const result = detectWheels(imageData, vehicleCanvas.width, vehicleCanvas.height)

    // stream the pipeline steps for a live "processing" feel
    result.steps.forEach((step, i) => {
      setTimeout(() => {
        setSteps((prev) => [...prev, step])
        if (i === result.steps.length - 1) {
          setPhotoMode(result.mode === 'photo')
          setMetadata(result.metadata)
          setDetecting(false)
        }
      }, 220 * (i + 1))
    })
  }, [])

  // ---- select a demo vehicle ----
  const selectVehicle = useCallback(
    (id: string) => {
      setActiveVehicleId(id)
      const v = DEMO_VEHICLES.find((veh) => veh.id === id)
      if (!v) return
      const cv = buildVehicleCanvas(v)
      vehicleCanvasRef.current = cv
      uploadedVehicle.current = null
      runDetection(cv)
    },
    [runDetection],
  )

  // ---- select a demo rim ----
  const selectRim = useCallback((id: string) => {
    setActiveRimId(id)
    const r = DEMO_RIMS.find((rim) => rim.id === id)
    if (!r) return
    rimCanvasRef.current = buildRimCanvas(r)
    uploadedRim.current = null
  }, [])

  // ---- uploads ----
  const handleVehicleUpload = useCallback(
    (file: File) => {
      const reader = new FileReader()
      reader.onload = () => {
        const img = new Image()
        img.crossOrigin = 'anonymous'
        img.onload = () => {
          const cv = makeCanvas(CANVAS_W, CANVAS_H)
          const ctx = cv.getContext('2d')
          if (!ctx) return
          // Fill an OPAQUE backdrop first so the letterbox bars are not
          // transparent — this keeps real photos routed to the photo pipeline
          // (a fully opaque image) instead of the alpha silhouette pipeline.
          ctx.fillStyle = '#0d0d0d'
          ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)
          // fit contain, undistorted
          const ratio = Math.min(CANVAS_W / img.width, CANVAS_H / img.height)
          const dw = img.width * ratio
          const dh = img.height * ratio
          ctx.drawImage(img, (CANVAS_W - dw) / 2, (CANVAS_H - dh) / 2, dw, dh)
          vehicleCanvasRef.current = cv
          uploadedVehicle.current = cv
          setActiveVehicleId('__upload__')
          runDetection(cv)
        }
        img.src = reader.result as string
      }
      reader.readAsDataURL(file)
    },
    [runDetection],
  )

  const handleRimUpload = useCallback((file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        const cv = makeCanvas(400, 400)
        const ctx = cv.getContext('2d')
        if (!ctx) return
        ctx.drawImage(img, 0, 0, 400, 400)
        rimCanvasRef.current = cv
        uploadedRim.current = cv
        setActiveRimId('__upload__')
      }
      img.src = reader.result as string
    }
    reader.readAsDataURL(file)
  }, [])

  // ---- size slider ----
  const handleSizeChange = useCallback((inches: number) => {
    setSizeInches(inches)
    setScale(inchesToScale(inches))
  }, [])

  // ---- initial mount: Ridge SUV + Fuel Rebel + 100% ----
  useEffect(() => {
    const v = DEMO_VEHICLES.find((veh) => veh.id === 'suv')
    const r = DEMO_RIMS.find((rim) => rim.id === 'fuel-rebel')
    if (v) {
      const cv = buildVehicleCanvas(v)
      vehicleCanvasRef.current = cv
      runDetection(cv)
    }
    if (r) rimCanvasRef.current = buildRimCanvas(r)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ---- re-render whenever composition inputs change ----
  useEffect(() => {
    rerender()
  }, [rerender, metadata, activeRimId, activeVehicleId])

  // ---- overlay animation loop + fps meter ----
  useEffect(() => {
    let raf = 0
    let last = performance.now()
    let frames = 0
    let acc = 0
    const loop = (t: number) => {
      const dt = t - last
      last = t
      frames++
      acc += dt
      if (acc >= 500) {
        setFps(Math.round((frames * 1000) / acc))
        frames = 0
        acc = 0
      }
      if (overlayCanvasRef.current) {
        if (showDetection) {
          drawDetectionOverlay(overlayCanvasRef.current, metadata, {
            showFront,
            showRear,
            pulse: t / 300,
          })
        } else {
          const octx = overlayCanvasRef.current.getContext('2d')
          octx?.clearRect(
            0,
            0,
            overlayCanvasRef.current.width,
            overlayCanvasRef.current.height,
          )
        }
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [metadata, showDetection, showFront, showRear])

  const vehicleName =
    activeVehicleId === '__upload__'
      ? 'Custom Upload'
      : activeVehicle?.name ?? 'No Vehicle'

  return (
    <div className="grid-bg min-h-screen bg-background text-foreground">
      {/* ambient orange glow */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            'radial-gradient(60% 50% at 50% 0%, rgba(255,90,31,0.10), transparent 70%)',
        }}
      />
      <div className="relative z-10 flex min-h-screen flex-col">
        <TopNav />
        <main className="flex flex-1 flex-col gap-4 p-4 lg:flex-row">
          <VehicleLibrary
            activeVehicleId={activeVehicleId}
            onSelect={selectVehicle}
            onUpload={handleVehicleUpload}
          />
          <Visualiser
            vehicleName={vehicleName}
            metadata={metadata}
            showDetection={showDetection}
            onToggleDetection={setShowDetection}
            showFront={showFront}
            showRear={showRear}
            onToggleFront={setShowFront}
            onToggleRear={setShowRear}
            detecting={detecting}
            fps={fps}
            mainCanvasRef={mainCanvasRef}
            overlayCanvasRef={overlayCanvasRef}
          />
          <RightPanel
            activeRimId={activeRimId}
            onSelectRim={selectRim}
            onRimUpload={handleRimUpload}
            sizeInches={sizeInches}
            onSizeChange={handleSizeChange}
            scale={scale}
            metadata={metadata}
            steps={steps}
            getMainCanvas={() => mainCanvasRef.current}
          />
        </main>
      </div>
    </div>
  )
}

function TopNav() {
  return (
    <header className="glass-strong sticky top-0 z-20 flex items-center justify-between gap-4 border-b border-border/60 px-5 py-3">
      <div className="flex items-center gap-3">
        <div className="glow-orange flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15">
          <WheelMark />
        </div>
        <div className="leading-tight">
          <div className="font-mono text-lg font-bold tracking-tight text-glow">
            WHEEL<span className="text-primary">MAGIC</span>
          </div>
          <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
            2D Rim Replacement Engine
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Badge
          variant="outline"
          className="glass border-primary/40 font-mono text-[11px] text-primary"
        >
          v1.0 Prototype
        </Badge>
        <a
          href="https://github.com"
          target="_blank"
          rel="noreferrer"
          className="glass flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground"
          aria-label="View on GitHub"
        >
          <GithubMark />
        </a>
      </div>
    </header>
  )
}

function GithubMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
      <path d="M12 .5C5.37.5 0 5.87 0 12.5c0 5.3 3.44 9.8 8.21 11.39.6.11.82-.26.82-.58 0-.29-.01-1.04-.02-2.05-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.73.08-.73 1.2.08 1.84 1.24 1.84 1.24 1.07 1.83 2.81 1.3 3.5.99.11-.78.42-1.3.76-1.6-2.67-.3-5.47-1.34-5.47-5.96 0-1.32.47-2.39 1.24-3.23-.12-.31-.54-1.53.12-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.29-1.55 3.3-1.23 3.3-1.23.66 1.65.24 2.87.12 3.18.77.84 1.24 1.91 1.24 3.23 0 4.63-2.81 5.65-5.49 5.95.43.37.81 1.1.81 2.22 0 1.6-.01 2.89-.01 3.29 0 .32.22.7.83.58A12.01 12.01 0 0 0 24 12.5C24 5.87 18.63.5 12 .5z" />
    </svg>
  )
}

function WheelMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 text-primary" aria-hidden>
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="12" r="2.4" fill="currentColor" />
      <g stroke="currentColor" strokeWidth="1.6">
        <line x1="12" y1="4" x2="12" y2="9" />
        <line x1="12" y1="15" x2="12" y2="20" />
        <line x1="4" y1="12" x2="9" y2="12" />
        <line x1="15" y1="12" x2="20" y2="12" />
      </g>
    </svg>
  )
}
