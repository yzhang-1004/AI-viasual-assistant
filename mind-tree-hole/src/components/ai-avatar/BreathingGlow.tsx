import { useEffect, useRef } from 'react'
import { useAppStore } from '../../stores/appStore'
import type { AIState, AppMode } from '../../types'

export default function BreathingGlow() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const aiState = useAppStore((s) => s.aiState)
  const mode = useAppStore((s) => s.mode)
  const animRef = useRef<number>(0)
  const timeRef = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const getParams = (aiState: AIState, mode: AppMode) => {
      let baseRadius: number, frequency: number, amplitude: number
      let color: [number, number, number]
      let ripple = false

      switch (aiState) {
        case 'listening':
          baseRadius = 80; frequency = 0.5; amplitude = 15
          break
        case 'thinking':
          baseRadius = 80; frequency = 1.2; amplitude = 10
          break
        case 'speaking':
          baseRadius = 90; frequency = 2.0; amplitude = 20; ripple = true
          break
        default:
          baseRadius = 70; frequency = 0.3; amplitude = 8
      }

      switch (mode) {
        case 'guidance':
          color = [80, 180, 130]; break
        case 'meditation':
          color = [140, 200, 160]; break
        case 'daily-power':
          color = [255, 200, 120]; break
        default:
          color = [245, 158, 75]; break
      }

      return { baseRadius, frequency, amplitude, color, ripple }
    }

    let lastRippleTime = 0

    const draw = (timestamp: number) => {
      const dt = timeRef.current ? (timestamp - timeRef.current) / 1000 : 0.016
      timeRef.current = timestamp

      const { baseRadius, frequency, amplitude, color, ripple } = getParams(aiState, mode)
      const cx = canvas.width / 2
      const cy = canvas.height / 2

      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // 多层光晕
      for (let layer = 0; layer < 4; layer++) {
        const phase = layer * Math.PI / 3
        const r = baseRadius + amplitude * Math.sin(timestamp * frequency * 0.001 + phase)
        const alpha = 0.08 + layer * 0.06

        const gradient = ctx.createRadialGradient(cx, cy, r * 0.3, cx, cy, r)
        gradient.addColorStop(0, `rgba(${color[0]},${color[1]},${color[2]},${alpha * 3})`)
        gradient.addColorStop(0.5, `rgba(${color[0]},${color[1]},${color[2]},${alpha})`)
        gradient.addColorStop(1, `rgba(${color[0]},${color[1]},${color[2]},0)`)

        ctx.beginPath()
        ctx.arc(cx, cy, r, 0, Math.PI * 2)
        ctx.fillStyle = gradient
        ctx.fill()
      }

      // 涟漪
      if (ripple && timestamp - lastRippleTime > 600) {
        lastRippleTime = timestamp
      }
      if (ripple) {
        const rippleProgress = (timestamp - lastRippleTime) / 600
        if (rippleProgress < 1) {
          const rr = baseRadius * (1 + rippleProgress * 1.5)
          const ra = 0.3 * (1 - rippleProgress)
          ctx.beginPath()
          ctx.arc(cx, cy, rr, 0, Math.PI * 2)
          ctx.strokeStyle = `rgba(${color[0]},${color[1]},${color[2]},${ra})`
          ctx.lineWidth = 2
          ctx.stroke()
        }
      }

      animRef.current = requestAnimationFrame(draw)
    }

    animRef.current = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(animRef.current)
      window.removeEventListener('resize', resize)
    }
  }, [aiState, mode])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
    />
  )
}
