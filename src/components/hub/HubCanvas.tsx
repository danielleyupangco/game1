import { useEffect, useRef } from 'react'

/**
 * The hub's centrepiece: a glowing brain outline filled with a drifting
 * network of nodes.
 *
 * Canvas rather than SVG because the fill is a field of a couple of hundred
 * animated points, not a picture — and because `isPointInPath` lets the node
 * placement and the drawn outline share one definition of the shape, so points
 * can never drift outside the line. Honours prefers-reduced-motion with a
 * single static frame.
 */

type Node = { x: number; y: number; vx: number; vy: number; r: number }

/** Brain silhouette in a 0..1 unit square: two lobes, a top notch, a stem. */
function brainPath(width: number, height: number): Path2D {
  const path = new Path2D()
  const X = (v: number) => v * width
  const Y = (v: number) => v * height

  path.moveTo(X(0.11), Y(0.58))
  path.bezierCurveTo(X(0.01), Y(0.45), X(0.06), Y(0.24), X(0.22), Y(0.17))
  path.bezierCurveTo(X(0.31), Y(0.07), X(0.44), Y(0.06), X(0.5), Y(0.13))
  path.bezierCurveTo(X(0.56), Y(0.06), X(0.69), Y(0.07), X(0.78), Y(0.17))
  path.bezierCurveTo(X(0.94), Y(0.24), X(0.99), Y(0.45), X(0.89), Y(0.58))
  path.bezierCurveTo(X(0.85), Y(0.69), X(0.75), Y(0.75), X(0.64), Y(0.73))
  path.bezierCurveTo(X(0.62), Y(0.8), X(0.6), Y(0.86), X(0.585), Y(0.93))
  path.lineTo(X(0.5), Y(0.93))
  path.bezierCurveTo(X(0.505), Y(0.84), X(0.48), Y(0.77), X(0.4), Y(0.73))
  path.bezierCurveTo(X(0.28), Y(0.76), X(0.16), Y(0.69), X(0.11), Y(0.58))
  path.closePath()
  return path
}

/** A few interior curves, so it reads as folded tissue rather than an outline. */
function foldPaths(width: number, height: number): Path2D[] {
  const X = (v: number) => v * width
  const Y = (v: number) => v * height
  const make = (points: number[][]) => {
    const path = new Path2D()
    path.moveTo(X(points[0][0]), Y(points[0][1]))
    for (let i = 1; i < points.length - 2; i += 3) {
      path.bezierCurveTo(
        X(points[i][0]), Y(points[i][1]),
        X(points[i + 1][0]), Y(points[i + 1][1]),
        X(points[i + 2][0]), Y(points[i + 2][1]),
      )
    }
    return path
  }
  return [
    make([[0.5, 0.13], [0.5, 0.32], [0.5, 0.5], [0.5, 0.68]]),
    make([[0.2, 0.28], [0.32, 0.3], [0.3, 0.44], [0.4, 0.5]]),
    make([[0.8, 0.28], [0.68, 0.3], [0.7, 0.44], [0.6, 0.5]]),
    make([[0.15, 0.5], [0.26, 0.54], [0.28, 0.62], [0.4, 0.64]]),
    make([[0.85, 0.5], [0.74, 0.54], [0.72, 0.62], [0.6, 0.64]]),
  ]
}

export function HubCanvas({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let width = 0
    let height = 0
    let nodes: Node[] = []
    let outline: Path2D | null = null
    let folds: Path2D[] = []
    let frame = 0
    let raf = 0

    let seedValue = 20260831
    const random = () => {
      seedValue = (seedValue * 1103515245 + 12345) % 2147483648
      return seedValue / 2147483648
    }

    const inside = (x: number, y: number) => (outline ? ctx.isPointInPath(outline, x, y) : false)

    function build() {
      const rect = canvas!.getBoundingClientRect()
      if (rect.width < 2 || rect.height < 2) return
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      width = rect.width
      height = rect.height
      canvas!.width = Math.round(width * dpr)
      canvas!.height = Math.round(height * dpr)
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0)

      outline = brainPath(width, height)
      folds = foldPaths(width, height)

      seedValue = 20260831
      const target = Math.round(Math.min(170, Math.max(55, (width * height) / 1250)))
      nodes = []
      let guard = 0
      while (nodes.length < target && guard++ < 40000) {
        const x = random() * width
        const y = random() * height
        if (!inside(x, y)) continue
        nodes.push({
          x, y,
          vx: (random() - 0.5) * 0.1,
          vy: (random() - 0.5) * 0.1,
          r: 0.7 + random() * 1.5,
        })
      }
    }

    function draw() {
      if (!outline || width === 0) return
      ctx!.clearRect(0, 0, width, height)

      // Interior wash, so the shape reads even where nodes are sparse.
      ctx!.save()
      ctx!.clip(outline)
      const wash = ctx!.createRadialGradient(width * 0.5, height * 0.42, 0, width * 0.5, height * 0.42, width * 0.55)
      wash.addColorStop(0, 'rgba(45, 212, 191, 0.10)')
      wash.addColorStop(1, 'rgba(45, 212, 191, 0.01)')
      ctx!.fillStyle = wash
      ctx!.fillRect(0, 0, width, height)
      ctx!.restore()

      // Node network.
      const link = Math.min(width, height) * 0.2
      ctx!.lineWidth = 1
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x
          const dy = nodes[i].y - nodes[j].y
          const distance = Math.hypot(dx, dy)
          if (distance > link) continue
          ctx!.strokeStyle = `rgba(45, 212, 191, ${(1 - distance / link) * 0.3})`
          ctx!.beginPath()
          ctx!.moveTo(nodes[i].x, nodes[i].y)
          ctx!.lineTo(nodes[j].x, nodes[j].y)
          ctx!.stroke()
        }
      }

      // Folds, then the outline itself — both glowing.
      ctx!.shadowColor = 'rgba(45, 212, 191, 0.8)'
      ctx!.shadowBlur = 10
      ctx!.strokeStyle = 'rgba(45, 212, 191, 0.42)'
      ctx!.lineWidth = 1.4
      for (const fold of folds) ctx!.stroke(fold)

      ctx!.shadowBlur = 18
      ctx!.strokeStyle = 'rgba(94, 234, 212, 0.95)'
      ctx!.lineWidth = 2
      ctx!.stroke(outline)

      // Nodes on top.
      ctx!.shadowBlur = 8
      for (const node of nodes) {
        const pulse = reduced ? 1 : 0.72 + 0.28 * Math.sin(frame / 45 + node.x * 0.02)
        ctx!.beginPath()
        ctx!.arc(node.x, node.y, node.r, 0, Math.PI * 2)
        ctx!.fillStyle = `rgba(167, 243, 232, ${0.65 * pulse})`
        ctx!.fill()
      }
      ctx!.shadowBlur = 0
    }

    function step() {
      frame++
      for (const node of nodes) {
        node.x += node.vx
        node.y += node.vy
        if (!inside(node.x, node.y)) {
          node.vx *= -1
          node.vy *= -1
          node.x += node.vx * 2
          node.y += node.vy * 2
        }
      }
      draw()
      raf = requestAnimationFrame(step)
    }

    build()
    if (reduced) draw()
    else raf = requestAnimationFrame(step)

    const observer = new ResizeObserver(() => {
      build()
      if (reduced) draw()
    })
    observer.observe(canvas)

    return () => {
      cancelAnimationFrame(raf)
      observer.disconnect()
    }
  }, [])

  return <canvas ref={ref} className={className} aria-hidden="true" />
}
