import { useEffect, useRef } from 'react'

// Pixel starry sky for the menu: stars sit on a sphere around the camera, the sphere turns
// slowly, and the frame is drawn at 1/PIXEL resolution and scaled up without smoothing,
// so every star is a crisp square block. Earth's limb sits at the bottom.

const PIXEL = 3 // CSS pixels per canvas pixel
const TURN_SECONDS = 300 // one full turn of the sky
const PITCH = 0.42 // camera tilt (rad): stars travel in arcs, not straight lines
const STAR_COUNT = 1400
const BAND_COUNT = 2200 // Milky Way
const REDRAW_EVENT = 'smdg-redraw'

interface Star {
  x: number
  y: number
  z: number
  size: 1 | 2
  color: string
  base: number
  rate: number
  phase: number
}

function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Rough share of star colours by temperature: white, blue-white, yellow, orange, red.
const PALETTE: Array<[number, string]> = [
  [0.5, '#ffffff'],
  [0.75, '#cfe0ff'],
  [0.9, '#fff1c2'],
  [0.97, '#ffc98f'],
  [1, '#ff9b7a'],
]

function pickColor(r: number): string {
  for (const [limit, color] of PALETTE) if (r <= limit) return color
  return '#ffffff'
}

function buildStars(): Star[] {
  const rand = mulberry32(20261115)
  const stars: Star[] = []
  for (let i = 0; i < STAR_COUNT; i++) {
    const z = 2 * rand() - 1
    const theta = 2 * Math.PI * rand()
    const r = Math.sqrt(1 - z * z)
    const bright = rand() ** 3
    stars.push({
      x: r * Math.cos(theta),
      y: z,
      z: r * Math.sin(theta),
      size: bright > 0.6 ? 2 : 1,
      color: pickColor(rand()),
      base: 0.25 + 0.75 * bright,
      rate: 0.6 + rand() * 2.2,
      phase: rand() * Math.PI * 2,
    })
  }
  // Milky Way: dim stars crowded around a tilted great circle.
  const n = normalize([0.35, 0.8, 0.48])
  const u = normalize(cross(n, [0, 0, 1]))
  const v = cross(n, u)
  for (let i = 0; i < BAND_COUNT; i++) {
    const a = 2 * Math.PI * rand()
    const spread = gaussian(rand) * 0.11
    const p = normalize([
      Math.cos(a) * u[0] + Math.sin(a) * v[0] + spread * n[0],
      Math.cos(a) * u[1] + Math.sin(a) * v[1] + spread * n[1],
      Math.cos(a) * u[2] + Math.sin(a) * v[2] + spread * n[2],
    ])
    stars.push({
      x: p[0],
      y: p[1],
      z: p[2],
      size: 1,
      color: rand() > 0.3 ? '#bcd0ff' : '#e8dcff',
      base: 0.12 + 0.3 * rand(),
      rate: 0.4 + rand(),
      phase: rand() * Math.PI * 2,
    })
  }
  return stars
}

type Vec = [number, number, number]
function normalize([x, y, z]: Vec): Vec {
  const l = Math.hypot(x, y, z) || 1
  return [x / l, y / l, z / l]
}
function cross(a: Vec, b: Vec): Vec {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
}
function gaussian(rand: () => number): number {
  return Math.sqrt(-2 * Math.log(rand() || 1e-9)) * Math.cos(2 * Math.PI * rand())
}

function drawEarth(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const radius = Math.max(w * 1.4, 220)
  const cx = w / 2
  const cy = h + radius - Math.max(18, h * 0.13)
  const rings: Array<[number, string]> = [
    [5, 'rgba(70, 140, 255, 0.10)'],
    [3, 'rgba(90, 170, 255, 0.22)'],
    [1.5, 'rgba(140, 215, 255, 0.55)'],
  ]
  for (const [extra, color] of rings) {
    ctx.beginPath()
    ctx.arc(cx, cy, radius + extra, 0, Math.PI * 2)
    ctx.fillStyle = color
    ctx.fill()
  }
  ctx.beginPath()
  ctx.arc(cx, cy, radius, 0, Math.PI * 2)
  ctx.fillStyle = '#06142b'
  ctx.fill()
  // Night side city lights: a few fixed specks along the limb.
  const rand = mulberry32(42)
  ctx.fillStyle = 'rgba(255, 214, 140, 0.55)'
  for (let i = 0; i < 70; i++) {
    const a = -Math.PI / 2 + (rand() - 0.5) * 1.1
    const d = radius - 2 - rand() * 14
    ctx.fillRect(Math.round(cx + Math.cos(a) * d), Math.round(cy + Math.sin(a) * d), 1, 1)
  }
}

export function Starfield({ moving }: { moving: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const movingRef = useRef(moving)
  const yawRef = useRef(0)

  useEffect(() => {
    movingRef.current = moving
  }, [moving])

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    const stars = buildStars()
    let w = 0
    let h = 0
    let frame = 0
    let last = performance.now()
    const cosP = Math.cos(PITCH)
    const sinP = Math.sin(PITCH)

    const resize = () => {
      w = Math.max(1, Math.ceil(canvas.clientWidth / PIXEL))
      h = Math.max(1, Math.ceil(canvas.clientHeight / PIXEL))
      canvas.width = w
      canvas.height = h
    }

    const draw = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000)
      last = now
      const animate = movingRef.current
      if (animate) yawRef.current += (dt * 2 * Math.PI) / TURN_SECONDS
      const yaw = yawRef.current
      const cosY = Math.cos(yaw)
      const sinY = Math.sin(yaw)
      const t = now / 1000

      const sky = ctx.createLinearGradient(0, 0, 0, h)
      sky.addColorStop(0, '#02040b')
      sky.addColorStop(0.7, '#050b1c')
      sky.addColorStop(1, '#0a1838')
      ctx.globalAlpha = 1
      ctx.fillStyle = sky
      ctx.fillRect(0, 0, w, h)

      const f = Math.max(w, h) * 0.75
      const cx = w / 2
      const cy = h * 0.45
      for (const s of stars) {
        const x1 = s.x * cosY + s.z * sinY
        const z1 = -s.x * sinY + s.z * cosY
        const y2 = s.y * cosP - z1 * sinP
        const z2 = s.y * sinP + z1 * cosP
        if (z2 <= 0.05) continue
        const sx = Math.round(cx + (f * x1) / z2)
        const sy = Math.round(cy - (f * y2) / z2)
        if (sx < 0 || sy < 0 || sx >= w || sy >= h) continue
        const twinkle = animate ? 0.72 + 0.28 * Math.sin(t * s.rate + s.phase) : 1
        ctx.globalAlpha = s.base * twinkle
        ctx.fillStyle = s.color
        ctx.fillRect(sx, sy, s.size, s.size)
      }
      ctx.globalAlpha = 1
      drawEarth(ctx, w, h)

      frame = animate ? requestAnimationFrame(draw) : 0
    }

    const redraw = () => {
      cancelAnimationFrame(frame)
      last = performance.now()
      frame = requestAnimationFrame(draw)
    }

    resize()
    redraw()
    const observer = new ResizeObserver(() => {
      resize()
      redraw()
    })
    observer.observe(canvas)
    // Fired when the motion setting changes: draw a fresh frame and restart the loop if on.
    canvas.addEventListener(REDRAW_EVENT, redraw)
    const onVisibility = () => {
      if (!document.hidden) redraw()
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      canvas.removeEventListener(REDRAW_EVENT, redraw)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  useEffect(() => {
    canvasRef.current?.dispatchEvent(new Event(REDRAW_EVENT))
  }, [moving])

  return <canvas ref={canvasRef} className="mm-sky" aria-hidden="true" />
}
