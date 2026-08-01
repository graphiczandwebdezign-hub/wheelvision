// ============================================================================
// WheelMagic Engine — pure functions for the 2D rim replacement pipeline.
// Everything is Canvas 2D. No WebGL, no external assets, works fully offline.
// ============================================================================

export const CANVAS_W = 1920
export const CANVAS_H = 1080

export interface WheelPoint {
  x: number
  y: number
  radius: number
}

export interface WheelMetadata {
  front: WheelPoint
  rear: WheelPoint
}

export interface DemoVehicle {
  id: string
  name: string
  type: string
  wheelbase: string
  /** Draws the prepared vehicle silhouette WITH transparent circular wheel holes. */
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void
}

export interface DemoRim {
  id: string
  name: string
  inches: number
  style: string
  /** Draws a top-down rim face centered in a square canvas of side `size`. */
  draw: (ctx: CanvasRenderingContext2D, size: number) => void
}

// ---------------------------------------------------------------------------
// Geometry helpers — wheels live at 25%/75% width, 70% height.
// ---------------------------------------------------------------------------
export function wheelGeometry(w: number, h: number) {
  const radius = Math.round(h * 0.16)
  const y = Math.round(h * 0.72)
  return {
    front: { x: Math.round(w * 0.28), y, radius },
    rear: { x: Math.round(w * 0.72), y, radius },
  }
}

// ---------------------------------------------------------------------------
// Vehicle body drawing. We draw a solid silhouette then punch transparent
// wheel holes with destination-out compositing so the alpha detector has
// real transparent circular regions to find.
// ---------------------------------------------------------------------------
type BodyPainter = (
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  g: ReturnType<typeof wheelGeometry>,
) => void

function paintTyres(
  ctx: CanvasRenderingContext2D,
  g: ReturnType<typeof wheelGeometry>,
) {
  ctx.fillStyle = '#111111'
  for (const p of [g.front, g.rear]) {
    ctx.beginPath()
    ctx.arc(p.x, p.y, p.radius * 1.32, 0, Math.PI * 2)
    ctx.fill()
  }
}

function punchWheelHoles(
  ctx: CanvasRenderingContext2D,
  g: ReturnType<typeof wheelGeometry>,
) {
  ctx.save()
  ctx.globalCompositeOperation = 'destination-out'
  for (const p of [g.front, g.rear]) {
    ctx.beginPath()
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

function roundedShape(
  ctx: CanvasRenderingContext2D,
  pts: [number, number][],
) {
  ctx.beginPath()
  ctx.moveTo(pts[0][0], pts[0][1])
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1])
  ctx.closePath()
}

const sedanBody: BodyPainter = (ctx, w, h, g) => {
  const bodyGrad = ctx.createLinearGradient(0, h * 0.35, 0, h * 0.82)
  bodyGrad.addColorStop(0, '#242424')
  bodyGrad.addColorStop(1, '#141414')
  ctx.fillStyle = bodyGrad
  roundedShape(ctx, [
    [w * 0.06, h * 0.72],
    [w * 0.08, h * 0.55],
    [w * 0.28, h * 0.52],
    [w * 0.38, h * 0.34],
    [w * 0.64, h * 0.32],
    [w * 0.74, h * 0.5],
    [w * 0.94, h * 0.55],
    [w * 0.95, h * 0.72],
  ])
  ctx.fill()
  // glass
  ctx.fillStyle = '#0a0a0a'
  roundedShape(ctx, [
    [w * 0.4, h * 0.37],
    [w * 0.62, h * 0.36],
    [w * 0.7, h * 0.5],
    [w * 0.4, h * 0.5],
  ])
  ctx.fill()
  paintTyres(ctx, g)
}

const suvBody: BodyPainter = (ctx, w, h, g) => {
  const bodyGrad = ctx.createLinearGradient(0, h * 0.28, 0, h * 0.82)
  bodyGrad.addColorStop(0, '#282828')
  bodyGrad.addColorStop(1, '#141414')
  ctx.fillStyle = bodyGrad
  roundedShape(ctx, [
    [w * 0.07, h * 0.74],
    [w * 0.08, h * 0.5],
    [w * 0.16, h * 0.34],
    [w * 0.7, h * 0.32],
    [w * 0.86, h * 0.42],
    [w * 0.93, h * 0.52],
    [w * 0.94, h * 0.74],
  ])
  ctx.fill()
  ctx.fillStyle = '#0a0a0a'
  roundedShape(ctx, [
    [w * 0.2, h * 0.37],
    [w * 0.66, h * 0.36],
    [w * 0.66, h * 0.48],
    [w * 0.2, h * 0.48],
  ])
  ctx.fill()
  paintTyres(ctx, g)
}

const truckBody: BodyPainter = (ctx, w, h, g) => {
  const bodyGrad = ctx.createLinearGradient(0, h * 0.3, 0, h * 0.82)
  bodyGrad.addColorStop(0, '#262626')
  bodyGrad.addColorStop(1, '#131313')
  ctx.fillStyle = bodyGrad
  // cab
  roundedShape(ctx, [
    [w * 0.06, h * 0.74],
    [w * 0.07, h * 0.44],
    [w * 0.14, h * 0.32],
    [w * 0.34, h * 0.3],
    [w * 0.4, h * 0.46],
    [w * 0.42, h * 0.74],
  ])
  ctx.fill()
  // bed
  roundedShape(ctx, [
    [w * 0.42, h * 0.74],
    [w * 0.42, h * 0.5],
    [w * 0.94, h * 0.5],
    [w * 0.94, h * 0.74],
  ])
  ctx.fill()
  ctx.fillStyle = '#0a0a0a'
  roundedShape(ctx, [
    [w * 0.16, h * 0.35],
    [w * 0.32, h * 0.34],
    [w * 0.36, h * 0.45],
    [w * 0.16, h * 0.45],
  ])
  ctx.fill()
  paintTyres(ctx, g)
}

const coupeBody: BodyPainter = (ctx, w, h, g) => {
  const bodyGrad = ctx.createLinearGradient(0, h * 0.42, 0, h * 0.8)
  bodyGrad.addColorStop(0, '#2a2a2a')
  bodyGrad.addColorStop(1, '#131313')
  ctx.fillStyle = bodyGrad
  roundedShape(ctx, [
    [w * 0.05, h * 0.7],
    [w * 0.1, h * 0.58],
    [w * 0.34, h * 0.46],
    [w * 0.56, h * 0.44],
    [w * 0.74, h * 0.52],
    [w * 0.96, h * 0.6],
    [w * 0.96, h * 0.7],
  ])
  ctx.fill()
  ctx.fillStyle = '#0a0a0a'
  roundedShape(ctx, [
    [w * 0.36, h * 0.48],
    [w * 0.56, h * 0.47],
    [w * 0.68, h * 0.54],
    [w * 0.4, h * 0.55],
  ])
  ctx.fill()
  paintTyres(ctx, g)
}

const hatchBody: BodyPainter = (ctx, w, h, g) => {
  const bodyGrad = ctx.createLinearGradient(0, h * 0.34, 0, h * 0.82)
  bodyGrad.addColorStop(0, '#262626')
  bodyGrad.addColorStop(1, '#141414')
  ctx.fillStyle = bodyGrad
  roundedShape(ctx, [
    [w * 0.08, h * 0.74],
    [w * 0.09, h * 0.5],
    [w * 0.24, h * 0.36],
    [w * 0.58, h * 0.34],
    [w * 0.78, h * 0.44],
    [w * 0.82, h * 0.74],
  ])
  ctx.fill()
  ctx.fillStyle = '#0a0a0a'
  roundedShape(ctx, [
    [w * 0.28, h * 0.39],
    [w * 0.56, h * 0.38],
    [w * 0.6, h * 0.48],
    [w * 0.28, h * 0.48],
  ])
  ctx.fill()
  paintTyres(ctx, g)
}

const bikeBody: BodyPainter = (ctx, w, h, g) => {
  // thin frame connecting two large, widely-spaced wheels
  ctx.strokeStyle = '#2a2a2a'
  ctx.lineWidth = Math.max(10, h * 0.02)
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(g.front.x, g.front.y)
  ctx.lineTo(w * 0.46, h * 0.46)
  ctx.lineTo(g.rear.x, g.rear.y)
  ctx.lineTo(w * 0.58, h * 0.44)
  ctx.lineTo(w * 0.42, h * 0.44)
  ctx.stroke()
  // seat + tank
  ctx.fillStyle = '#242424'
  roundedShape(ctx, [
    [w * 0.4, h * 0.42],
    [w * 0.62, h * 0.42],
    [w * 0.6, h * 0.5],
    [w * 0.42, h * 0.5],
  ])
  ctx.fill()
  paintTyres(ctx, g)
}

function makeVehicle(
  id: string,
  name: string,
  type: string,
  wheelbase: string,
  painter: BodyPainter,
): DemoVehicle {
  return {
    id,
    name,
    type,
    wheelbase,
    draw(ctx, w, h) {
      ctx.clearRect(0, 0, w, h)
      const g = wheelGeometry(w, h)
      // subtle ground shadow
      ctx.save()
      ctx.filter = 'blur(12px)'
      ctx.fillStyle = 'rgba(0,0,0,0.55)'
      ctx.beginPath()
      ctx.ellipse(w * 0.5, h * 0.86, w * 0.4, h * 0.03, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
      painter(ctx, w, h, g)
      // Punch REAL transparent circular holes where wheels belong.
      punchWheelHoles(ctx, g)
    },
  }
}

export const DEMO_VEHICLES: DemoVehicle[] = [
  makeVehicle('sedan', 'Midnight Sedan', 'Sedan', '2.85m', sedanBody),
  makeVehicle('suv', 'Ridge SUV', 'SUV', '2.95m', suvBody),
  makeVehicle('truck', 'Hauler Truck', 'Truck', '3.65m', truckBody),
  makeVehicle('coupe', 'Apex Coupe', 'Coupe', '2.70m', coupeBody),
  makeVehicle('hatch', 'Urban Hatch', 'Hatchback', '2.60m', hatchBody),
  makeVehicle('bike', 'Scrambler Bike', 'Motorcycle', '1.50m', bikeBody),
]

// ---------------------------------------------------------------------------
// Rim drawing — programmatic top-down rim faces with radial gradients & spokes.
// Center is drawn; outer square remains transparent so it composites cleanly.
// ---------------------------------------------------------------------------
type RimPainter = (ctx: CanvasRenderingContext2D, size: number) => void

function rimBase(ctx: CanvasRenderingContext2D, size: number, tint: string) {
  const c = size / 2
  const r = size * 0.47
  // tyre / lip ring
  ctx.beginPath()
  ctx.arc(c, c, r, 0, Math.PI * 2)
  const lip = ctx.createRadialGradient(c, c, r * 0.72, c, c, r)
  lip.addColorStop(0, '#050505')
  lip.addColorStop(0.8, '#1a1a1a')
  lip.addColorStop(1, '#050505')
  ctx.fillStyle = lip
  ctx.fill()
  // barrel
  ctx.beginPath()
  ctx.arc(c, c, r * 0.82, 0, Math.PI * 2)
  const barrel = ctx.createRadialGradient(
    c - r * 0.25,
    c - r * 0.25,
    r * 0.1,
    c,
    c,
    r * 0.82,
  )
  barrel.addColorStop(0, tint)
  barrel.addColorStop(0.55, '#8a8f96')
  barrel.addColorStop(1, '#2e3236')
  ctx.fillStyle = barrel
  ctx.fill()
}

function rimHub(ctx: CanvasRenderingContext2D, size: number) {
  const c = size / 2
  const r = size * 0.47
  ctx.beginPath()
  ctx.arc(c, c, r * 0.2, 0, Math.PI * 2)
  const hub = ctx.createRadialGradient(c, c, 1, c, c, r * 0.2)
  hub.addColorStop(0, '#d9dde2')
  hub.addColorStop(1, '#3a3d41')
  ctx.fillStyle = hub
  ctx.fill()
  // lug bolts
  ctx.fillStyle = '#1c1e20'
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 - Math.PI / 2
    ctx.beginPath()
    ctx.arc(
      c + Math.cos(a) * r * 0.11,
      c + Math.sin(a) * r * 0.11,
      r * 0.028,
      0,
      Math.PI * 2,
    )
    ctx.fill()
  }
}

function spokes(
  ctx: CanvasRenderingContext2D,
  size: number,
  count: number,
  width: number,
  tint: string,
  split = false,
) {
  const c = size / 2
  const r = size * 0.47
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2
    ctx.save()
    ctx.translate(c, c)
    ctx.rotate(a)
    const grad = ctx.createLinearGradient(0, 0, 0, r * 0.78)
    grad.addColorStop(0, '#e7ebef')
    grad.addColorStop(1, tint)
    ctx.fillStyle = grad
    if (split) {
      const off = r * 0.06
      for (const s of [-off, off]) {
        ctx.beginPath()
        ctx.moveTo(s - width * 0.3, r * 0.18)
        ctx.lineTo(s + width * 0.3, r * 0.18)
        ctx.lineTo(s + width, r * 0.76)
        ctx.lineTo(s - width, r * 0.76)
        ctx.closePath()
        ctx.fill()
      }
    } else {
      ctx.beginPath()
      ctx.moveTo(-width * 0.35, r * 0.18)
      ctx.lineTo(width * 0.35, r * 0.18)
      ctx.lineTo(width, r * 0.78)
      ctx.lineTo(-width, r * 0.78)
      ctx.closePath()
      ctx.fill()
    }
    ctx.restore()
  }
}

function makeRimPainter(
  count: number,
  width: number,
  tint: string,
  split: boolean,
): RimPainter {
  return (ctx, size) => {
    ctx.clearRect(0, 0, size, size)
    rimBase(ctx, size, tint)
    spokes(ctx, size, count, width, tint, split)
    rimHub(ctx, size)
    // glossy highlight sweep
    const c = size / 2
    const r = size * 0.47
    ctx.save()
    ctx.globalCompositeOperation = 'screen'
    const glow = ctx.createLinearGradient(0, 0, size, size)
    glow.addColorStop(0, 'rgba(255,255,255,0.22)')
    glow.addColorStop(0.5, 'rgba(255,255,255,0)')
    ctx.fillStyle = glow
    ctx.beginPath()
    ctx.arc(c, c, r * 0.82, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }
}

function makeRim(
  id: string,
  name: string,
  inches: number,
  style: string,
  painter: RimPainter,
): DemoRim {
  return { id, name, inches, style, draw: painter }
}

export const DEMO_RIMS: DemoRim[] = [
  makeRim('fuel-rebel', 'Fuel Rebel', 22, '8-Spoke', makeRimPainter(8, 22, '#6b7075', false)),
  makeRim('method-mr305', 'Method MR305', 20, '6-Split', makeRimPainter(6, 18, '#5a5f64', true)),
  makeRim('rotiform-rse', 'Rotiform RSE', 19, 'Multi-Spoke', makeRimPainter(12, 10, '#787d82', false)),
  makeRim('vossen-cv3', 'Vossen CV3', 22, '5-Spoke', makeRimPainter(5, 26, '#9aa0a6', false)),
  makeRim('bbs-chr', 'BBS CH-R', 20, '10-Spoke', makeRimPainter(10, 13, '#c9a86a', false)),
  makeRim('fuel-vapor', 'Fuel Vapor', 22, 'Mesh', makeRimPainter(16, 8, '#3f4347', false)),
  makeRim('american-force', 'American Force', 22, 'Directional', makeRimPainter(7, 20, '#b8bdc2', true)),
  makeRim('oz-rally', 'OZ Rally', 18, 'Classic 5', makeRimPainter(5, 20, '#d0682f', false)),
]

// ---------------------------------------------------------------------------
// Offscreen canvas factory + image builders. Return HTMLCanvasElements so we
// can both display them and read pixels for detection.
// ---------------------------------------------------------------------------
export function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const cv = document.createElement('canvas')
  cv.width = w
  cv.height = h
  return cv
}

export function buildVehicleCanvas(v: DemoVehicle): HTMLCanvasElement {
  const cv = makeCanvas(CANVAS_W, CANVAS_H)
  const ctx = cv.getContext('2d')
  if (ctx) v.draw(ctx, CANVAS_W, CANVAS_H)
  return cv
}

export function buildRimCanvas(r: DemoRim, size = 400): HTMLCanvasElement {
  const cv = makeCanvas(size, size)
  const ctx = cv.getContext('2d')
  if (ctx) r.draw(ctx, size)
  return cv
}

// ===========================================================================
// DETECTION PIPELINE (simulated OpenCV.js) — real pixel work on alpha channel.
// ===========================================================================
export interface DetectionStep {
  label: string
  detail: string
}

export interface DetectionResult {
  metadata: WheelMetadata
  steps: DetectionStep[]
  circularity: number
  /** 'alpha' = prepared silhouette (transparent holes), 'photo' = real image. */
  mode: 'alpha' | 'photo'
}

interface Blob {
  minX: number
  minY: number
  maxX: number
  maxY: number
  count: number
  cx: number
  cy: number
}

/**
 * detectWheels — dispatcher. Inspects the image's transparency: prepared
 * silhouettes carry large transparent regions (the punched wheel holes), while
 * real photographs are fully opaque. Alpha images use the fast flood-fill
 * pipeline; opaque photos fall through to a real Hough circle transform.
 */
export function detectWheels(
  imageData: ImageData,
  targetW: number,
  targetH: number,
): DetectionResult {
  const { data, width, height } = imageData
  let transparent = 0
  for (let i = 0; i < width * height; i++) {
    if (data[i * 4 + 3] < 10) transparent++
  }
  const transparentRatio = transparent / (width * height)
  // A prepared silhouette has meaningful interior transparency; a JPEG/photo
  // has ~none. Below the threshold we treat it as a real photograph.
  if (transparentRatio < 0.02) {
    return detectWheelsPhoto(imageData, targetW, targetH)
  }
  return detectWheelsAlpha(imageData, targetW, targetH)
}

/**
 * detectWheelsAlpha — the prepared-silhouette pipeline:
 *  1. Alpha Extracted   -> read alpha channel of the prepared PNG
 *  2. Mask Cleaned      -> threshold alpha < 10 into a binary transparent mask
 *  3. Contours Found    -> flood-fill connected transparent regions (blobs)
 *  4. Circularity       -> keep the 2 largest circular blobs, fit bounding circle
 */
export function detectWheelsAlpha(
  imageData: ImageData,
  targetW: number,
  targetH: number,
): DetectionResult {
  const { data, width, height } = imageData

  // --- Step 1 + 2: Alpha threshold into a binary mask (1 = transparent) ---
  const mask = new Uint8Array(width * height)
  let transparentPixels = 0
  for (let i = 0; i < width * height; i++) {
    if (data[i * 4 + 3] < 10) {
      mask[i] = 1
      transparentPixels++
    }
  }

  // --- Step 3: connected-component flood fill to find blobs ---
  const visited = new Uint8Array(width * height)
  const blobs: Blob[] = []
  const stack: number[] = []

  for (let start = 0; start < width * height; start++) {
    if (mask[start] === 0 || visited[start] === 1) continue
    // ignore the surrounding fully-transparent frame: skip border-touching floods
    stack.length = 0
    stack.push(start)
    visited[start] = 1
    let minX = width
    let minY = height
    let maxX = 0
    let maxY = 0
    let count = 0
    let sumX = 0
    let sumY = 0
    let touchesBorder = false

    while (stack.length) {
      const idx = stack.pop() as number
      const x = idx % width
      const y = (idx / width) | 0
      count++
      sumX += x
      sumY += y
      if (x < minX) minX = x
      if (y < minY) minY = y
      if (x > maxX) maxX = x
      if (y > maxY) maxY = y
      if (x === 0 || y === 0 || x === width - 1 || y === height - 1) {
        touchesBorder = true
      }
      // 4-neighbours
      const neighbours = [idx - 1, idx + 1, idx - width, idx + width]
      const nx = [x - 1, x + 1, x, x]
      const ny = [y, y, y - 1, y + 1]
      for (let k = 0; k < 4; k++) {
        if (nx[k] < 0 || nx[k] >= width || ny[k] < 0 || ny[k] >= height) continue
        const n = neighbours[k]
        if (mask[n] === 1 && visited[n] === 0) {
          visited[n] = 1
          stack.push(n)
        }
      }
    }

    if (!touchesBorder && count > 40) {
      blobs.push({
        minX,
        minY,
        maxX,
        maxY,
        count,
        cx: sumX / count,
        cy: sumY / count,
      })
    }
  }

  // --- Step 4: keep the 2 largest, order left->right = front, rear ---
  blobs.sort((a, b) => b.count - a.count)
  const top = blobs.slice(0, 2).sort((a, b) => a.cx - b.cx)

  const scaleX = targetW / width
  const scaleY = targetH / height

  const toPoint = (b: Blob | undefined, fallback: WheelPoint): WheelPoint => {
    if (!b) return fallback
    const rr = ((b.maxX - b.minX) / 2 + (b.maxY - b.minY) / 2) / 2
    return {
      x: Math.round(b.cx * scaleX),
      y: Math.round(b.cy * scaleY),
      radius: Math.round(rr * ((scaleX + scaleY) / 2)),
    }
  }

  const g = wheelGeometry(targetW, targetH)
  const metadata: WheelMetadata = {
    front: toPoint(top[0], g.front),
    rear: toPoint(top[1], g.rear),
  }

  // circularity estimate: area / (pi r^2) of the largest blob
  let circularity = 0.98
  if (top[0]) {
    const rr = ((top[0].maxX - top[0].minX) / 2 + (top[0].maxY - top[0].minY) / 2) / 2
    circularity = Math.min(0.999, top[0].count / (Math.PI * rr * rr))
  }

  const steps: DetectionStep[] = [
    { label: 'Alpha Extracted', detail: `${transparentPixels.toLocaleString()} transparent px` },
    { label: 'Mask Cleaned', detail: `threshold α < 10 · ${width}×${height}` },
    { label: `${top.length} Contours Found`, detail: `${blobs.length} candidate blobs` },
    { label: `Circularity ${circularity.toFixed(2)}`, detail: 'circles accepted' },
  ]

  return { metadata, steps, circularity, mode: 'alpha' }
}

// ---------------------------------------------------------------------------
// PHOTO PIPELINE — real Hough Circle Transform on an opaque vehicle photo.
// Detects wheels straight from image edges with no transparency required.
//   1. Grayscale       -> luminance conversion
//   2. Sobel Edges      -> gradient magnitude + direction, threshold to edges
//   3. Hough Voting     -> each edge votes for centers along its gradient line
//                          across a plausible wheel-radius band
//   4. Peak + Pairing   -> NMS peaks, then choose the best coplanar wheel pair
// ---------------------------------------------------------------------------
interface Candidate {
  x: number
  y: number
  r: number
  score: number
}

export function detectWheelsPhoto(
  imageData: ImageData,
  targetW: number,
  targetH: number,
): DetectionResult {
  const { data, width, height } = imageData
  const n = width * height

  // --- Step 1: grayscale luminance ---
  const gray = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    const o = i * 4
    gray[i] = 0.299 * data[o] + 0.587 * data[o + 1] + 0.114 * data[o + 2]
  }

  // --- Step 2: Sobel gradients -> edge points with unit gradient direction ---
  const edgeX: number[] = []
  const edgeY: number[] = []
  const dirX: number[] = []
  const dirY: number[] = []
  let magSum = 0
  const mags: number[] = []
  const px: number[] = []
  const py: number[] = []
  const ux: number[] = []
  const uy: number[] = []
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x
      const tl = gray[i - width - 1]
      const tc = gray[i - width]
      const tr = gray[i - width + 1]
      const ml = gray[i - 1]
      const mr = gray[i + 1]
      const bl = gray[i + width - 1]
      const bc = gray[i + width]
      const br = gray[i + width + 1]
      const gx = tr + 2 * mr + br - tl - 2 * ml - bl
      const gy = bl + 2 * bc + br - tl - 2 * tc - tr
      const mag = Math.sqrt(gx * gx + gy * gy)
      mags.push(mag)
      px.push(x)
      py.push(y)
      ux.push(gx / (mag || 1))
      uy.push(gy / (mag || 1))
      magSum += mag
    }
  }
  // adaptive edge threshold: keep the strongest gradients only
  const meanMag = magSum / mags.length
  const edgeThresh = meanMag * 1.9
  for (let k = 0; k < mags.length; k++) {
    if (mags[k] >= edgeThresh) {
      edgeX.push(px[k])
      edgeY.push(py[k])
      dirX.push(ux[k])
      dirY.push(uy[k])
    }
  }

  // --- Step 3: gradient-based Hough voting into a center accumulator ---
  const acc = new Float32Array(n)
  const rMin = Math.max(6, Math.round(width * 0.05))
  const rMax = Math.round(width * 0.2)
  const rStep = Math.max(1, Math.round((rMax - rMin) / 26))
  const yBias = height * 0.55 // wheels sit in the lower half of a sideview
  for (let e = 0; e < edgeX.length; e++) {
    const ex = edgeX[e]
    const ey = edgeY[e]
    const gxu = dirX[e]
    const gyu = dirY[e]
    for (let r = rMin; r <= rMax; r += rStep) {
      // vote both along and against the gradient (dark tyre vs bright rim)
      for (const s of [1, -1]) {
        const cx = Math.round(ex + s * gxu * r)
        const cy = Math.round(ey + s * gyu * r)
        if (cx < 0 || cy < 0 || cx >= width || cy >= height) continue
        // favour centers in the lower half where wheels live
        const bias = cy >= yBias ? 1 : 0.45
        acc[cy * width + cx] += bias
      }
    }
  }

  // --- Step 4a: non-max suppression to extract distinct center peaks ---
  const candidates: Candidate[] = []
  const supp = Math.round(rMin * 0.8)
  const accCopy = Float32Array.from(acc)
  let maxVote = 0
  for (let i = 0; i < n; i++) if (accCopy[i] > maxVote) maxVote = accCopy[i]
  const voteFloor = maxVote * 0.35
  for (let pass = 0; pass < 8; pass++) {
    let bestIdx = -1
    let bestVal = voteFloor
    for (let i = 0; i < n; i++) {
      if (accCopy[i] > bestVal) {
        bestVal = accCopy[i]
        bestIdx = i
      }
    }
    if (bestIdx < 0) break
    const cx = bestIdx % width
    const cy = (bestIdx / width) | 0
    // estimate best radius: circle with the most edge support (normalised)
    let bestR = rMin
    let bestSupport = 0
    for (let r = rMin; r <= rMax; r += rStep) {
      let hits = 0
      const tol = Math.max(2, r * 0.12)
      for (let e = 0; e < edgeX.length; e++) {
        const dx = edgeX[e] - cx
        const dy = edgeY[e] - cy
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (Math.abs(dist - r) <= tol) hits++
      }
      const norm = hits / (2 * Math.PI * r)
      if (norm > bestSupport) {
        bestSupport = norm
        bestR = r
      }
    }
    candidates.push({ x: cx, y: cy, r: bestR, score: bestVal })
    // suppress a neighbourhood so the next peak is a different wheel
    for (let yy = Math.max(0, cy - supp); yy < Math.min(height, cy + supp); yy++) {
      for (let xx = Math.max(0, cx - supp); xx < Math.min(width, cx + supp); xx++) {
        accCopy[yy * width + xx] = 0
      }
    }
  }

  // --- Step 4b: pick the best coplanar, similarly-sized wheel pair ---
  let pair: [Candidate, Candidate] | null = null
  let pairScore = -Infinity
  for (let a = 0; a < candidates.length; a++) {
    for (let b = a + 1; b < candidates.length; b++) {
      const A = candidates[a]
      const B = candidates[b]
      const dx = Math.abs(A.x - B.x)
      const dy = Math.abs(A.y - B.y)
      const rAvg = (A.r + B.r) / 2
      if (dx < rAvg * 1.4) continue // must be separated horizontally
      const yPenalty = dy / (height * 0.25) // reward similar vertical position
      const rPenalty = Math.abs(A.r - B.r) / rAvg
      const s = A.score + B.score - yPenalty * maxVote - rPenalty * maxVote * 0.6
      if (s > pairScore) {
        pairScore = s
        pair = A.x <= B.x ? [A, B] : [B, A]
      }
    }
  }

  // --- Step 4c: unify the pair's radius. Real vehicle wheels are the same
  //   size, so re-estimate a single shared radius that maximises combined
  //   edge support at BOTH centers. This corrects a wheel-arch/shadow edge
  //   pulling one circle too large.
  if (pair) {
    const [A, B] = pair
    let bestR = (A.r + B.r) / 2
    let bestCombined = -1
    const supportAt = (cx: number, cy: number, r: number) => {
      let hits = 0
      const tol = Math.max(2, r * 0.1)
      for (let e = 0; e < edgeX.length; e++) {
        const dx = edgeX[e] - cx
        const dy = edgeY[e] - cy
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (Math.abs(dist - r) <= tol) hits++
      }
      return hits / (2 * Math.PI * r)
    }
    for (let r = rMin; r <= rMax; r += rStep) {
      const combined = supportAt(A.x, A.y, r) + supportAt(B.x, B.y, r)
      if (combined > bestCombined) {
        bestCombined = combined
        bestR = r
      }
    }
    A.r = bestR
    B.r = bestR
  }

  const fallback = wheelGeometry(targetW, targetH)
  const scaleX = targetW / width
  const scaleY = targetH / height
  const toPoint = (c: Candidate | undefined, fb: WheelPoint): WheelPoint => {
    if (!c) return fb
    return {
      x: Math.round(c.x * scaleX),
      y: Math.round(c.y * scaleY),
      radius: Math.round(c.r * ((scaleX + scaleY) / 2)),
    }
  }

  let front: WheelPoint
  let rear: WheelPoint
  let found = 0
  if (pair) {
    front = toPoint(pair[0], fallback.front)
    rear = toPoint(pair[1], fallback.rear)
    found = 2
  } else if (candidates.length > 0) {
    const only = candidates[0]
    front = toPoint(only, fallback.front)
    // mirror across image center for the missing wheel
    rear = {
      x: Math.round((width - only.x) * scaleX),
      y: front.y,
      radius: front.radius,
    }
    found = 1
  } else {
    front = fallback.front
    rear = fallback.rear
  }

  const metadata: WheelMetadata = { front, rear }
  const circularity = candidates[0]
    ? Math.min(0.999, 0.8 + candidates[0].score / (maxVote || 1) * 0.19)
    : 0.9

  const steps: DetectionStep[] = [
    { label: 'Grayscale', detail: `${n.toLocaleString()} px · luminance` },
    { label: 'Sobel Edges', detail: `${edgeX.length.toLocaleString()} edge px · τ=${edgeThresh.toFixed(0)}` },
    { label: 'Hough Voting', detail: `r ∈ [${rMin},${rMax}]px · peak ${maxVote.toFixed(0)}` },
    { label: `${found} Wheels Detected`, detail: `${candidates.length} circle candidates` },
  ]

  return { metadata, steps, circularity, mode: 'photo' }
}

// ===========================================================================
// RENDER PIPELINE — composite vehicle + rims onto the visible canvas.
// ===========================================================================
export interface RenderOptions {
  scale: number
  showFront: boolean
  showRear: boolean
  /**
   * 'behind' (default) paints rims behind a prepared silhouette so its
   * transparent holes reveal them. 'on-top' paints rims over a real photo,
   * clipped to the detected wheel circle, replacing the original wheel face.
   */
  overlayMode?: 'behind' | 'on-top'
}

const SIZE_MARKS: Record<number, number> = { 17: 0.77, 18: 0.82, 20: 0.91, 22: 1.0 }

/** Map an inch value to a scale percentage using the defined marks. */
export function inchesToScale(inches: number): number {
  const keys = Object.keys(SIZE_MARKS).map(Number).sort((a, b) => a - b)
  if (SIZE_MARKS[inches] !== undefined) return SIZE_MARKS[inches]
  // linear interpolate between nearest marks
  let lo = keys[0]
  let hi = keys[keys.length - 1]
  for (let i = 0; i < keys.length - 1; i++) {
    if (inches >= keys[i] && inches <= keys[i + 1]) {
      lo = keys[i]
      hi = keys[i + 1]
      break
    }
  }
  const t = (inches - lo) / (hi - lo || 1)
  return SIZE_MARKS[lo] + t * (SIZE_MARKS[hi] - SIZE_MARKS[lo])
}

/**
 * renderComposition — draws the prepared vehicle, then paints each rim into
 * its detected wheel hole, clipped to a circle and scaled by the size slider.
 */
export function renderComposition(
  mainCanvas: HTMLCanvasElement,
  vehicle: HTMLCanvasElement | null,
  rim: HTMLCanvasElement | null,
  metadata: WheelMetadata | null,
  opts: RenderOptions,
) {
  const ctx = mainCanvas.getContext('2d')
  if (!ctx) return
  const { width, height } = mainCanvas
  ctx.clearRect(0, 0, width, height)
  if (!vehicle) return

  const points: [WheelPoint, boolean][] = metadata
    ? [
        [metadata.front, opts.showFront],
        [metadata.rear, opts.showRear],
      ]
    : []

  const onTop = opts.overlayMode === 'on-top'

  if (onTop) {
    // PHOTO MODE: draw the photo first, then paint rims OVER each detected
    // wheel, clipped to the detected circle, replacing the original face.
    ctx.drawImage(vehicle, 0, 0, width, height)
    if (rim && metadata) {
      for (const [p, visible] of points) {
        if (!visible) continue
        const drawSize = p.radius * 2 * opts.scale
        ctx.save()
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.radius * opts.scale, 0, Math.PI * 2)
        ctx.clip()
        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = 'high'
        // soft dark backing to hide the original rim edges
        ctx.fillStyle = '#0a0a0a'
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.radius * opts.scale, 0, Math.PI * 2)
        ctx.fill()
        ctx.drawImage(rim, p.x - drawSize / 2, p.y - drawSize / 2, drawSize, drawSize)
        ctx.restore()
      }
    }
    return
  }

  // 1) SILHOUETTE MODE: paint rims BEHIND the vehicle so the transparent holes
  //    reveal them, and the opaque bodywork masks any overspill automatically.
  if (rim && metadata) {
    for (const [p, visible] of points) {
      if (!visible) continue
      const drawSize = p.radius * 2 * opts.scale * 0.92
      ctx.save()
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.radius * 0.98, 0, Math.PI * 2)
      ctx.clip()
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'
      // dark backing so smaller rims don't show empty transparency
      ctx.fillStyle = '#080808'
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
      ctx.fill()
      ctx.drawImage(rim, p.x - drawSize / 2, p.y - drawSize / 2, drawSize, drawSize)
      ctx.restore()
    }
  }

  // 2) Paint the prepared vehicle on top.
  ctx.drawImage(vehicle, 0, 0, width, height)
}

/** Draw the detection overlay (pulsing circles, crosshair, radius labels). */
export function drawDetectionOverlay(
  overlay: HTMLCanvasElement,
  metadata: WheelMetadata | null,
  opts: { showFront: boolean; showRear: boolean; pulse: number },
) {
  const ctx = overlay.getContext('2d')
  if (!ctx) return
  const { width, height } = overlay
  ctx.clearRect(0, 0, width, height)
  if (!metadata) return

  const accent = '#ff5a1f'
  const points: [WheelPoint, boolean, string][] = [
    [metadata.front, opts.showFront, 'FRONT'],
    [metadata.rear, opts.showRear, 'REAR'],
  ]

  for (const [p, visible, tag] of points) {
    if (!visible) continue
    const pulseR = p.radius + Math.sin(opts.pulse) * (p.radius * 0.06)
    // outer pulsing ring
    ctx.strokeStyle = accent
    ctx.lineWidth = 4
    ctx.globalAlpha = 0.85
    ctx.beginPath()
    ctx.arc(p.x, p.y, pulseR, 0, Math.PI * 2)
    ctx.stroke()
    // faint outer halo
    ctx.globalAlpha = 0.2
    ctx.beginPath()
    ctx.arc(p.x, p.y, pulseR + 14, 0, Math.PI * 2)
    ctx.stroke()
    ctx.globalAlpha = 1

    // crosshair
    ctx.beginPath()
    ctx.moveTo(p.x - p.radius * 1.25, p.y)
    ctx.lineTo(p.x + p.radius * 1.25, p.y)
    ctx.moveTo(p.x, p.y - p.radius * 1.25)
    ctx.lineTo(p.x, p.y + p.radius * 1.25)
    ctx.lineWidth = 1.5
    ctx.globalAlpha = 0.6
    ctx.stroke()
    ctx.globalAlpha = 1

    // radius + tag label
    ctx.fillStyle = accent
    ctx.font = '600 26px ui-monospace, monospace'
    ctx.textBaseline = 'middle'
    const label = `${tag}  r=${p.radius}px`
    const tx = p.x - ctx.measureText(label).width / 2
    const ty = p.y - p.radius - 34
    ctx.fillStyle = 'rgba(0,0,0,0.6)'
    ctx.fillRect(tx - 10, ty - 16, ctx.measureText(label).width + 20, 32)
    ctx.fillStyle = accent
    ctx.fillText(label, tx, ty)
  }
}

/** Trigger a browser download for a data URL. */
export function downloadDataUrl(dataUrl: string, filename: string) {
  const a = document.createElement('a')
  a.href = dataUrl
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}
