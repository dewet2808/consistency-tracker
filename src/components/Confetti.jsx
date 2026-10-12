import { useEffect, useRef } from 'react'
import './Confetti.css'

const COLORS = ['#6c63ff', '#ff6584', '#43e97b', '#f7971e', '#38f9d7', '#fa709a', '#fee140', '#4facfe']

export default function Confetti({ trigger }) {
  const canvasRef = useRef(null)
  const rafRef    = useRef(null)

  useEffect(() => {
    if (!trigger) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    canvas.width  = window.innerWidth
    canvas.height = window.innerHeight

    const particles = Array.from({ length: 140 }, () => ({
      x:     Math.random() * canvas.width,
      y:     -20 - Math.random() * 120,
      w:     7 + Math.random() * 7,
      h:     3 + Math.random() * 4,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      rot:   Math.random() * Math.PI * 2,
      rotV:  (Math.random() - 0.5) * 0.14,
      vx:    (Math.random() - 0.5) * 3.5,
      vy:    2.5 + Math.random() * 3.5,
      alpha: 1,
    }))

    let frame = 0

    function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      frame++
      let alive = false

      for (const p of particles) {
        p.x   += p.vx
        p.y   += p.vy
        p.vy  += 0.06
        p.rot += p.rotV
        if (frame > 80) p.alpha = Math.max(0, p.alpha - 0.018)
        if (p.alpha > 0) alive = true

        ctx.save()
        ctx.globalAlpha = p.alpha
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rot)
        ctx.fillStyle = p.color
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h)
        ctx.restore()
      }

      if (alive) rafRef.current = requestAnimationFrame(animate)
    }

    animate()
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [trigger])

  return <canvas ref={canvasRef} className="confetti-canvas" />
}
