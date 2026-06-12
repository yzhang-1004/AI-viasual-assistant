import { useEffect, useRef } from 'react'
import { useAppStore } from '../../stores/appStore'

export default function BreathingCircle() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const mode = useAppStore((s) => s.mode)
  const animRef = useRef<number>(0)

  const isMeditation = mode === 'meditation'

  useEffect(() => {
    if (!isMeditation) return

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

    const startTime = performance.now()

    const draw = (timestamp: number) => {
      const elapsed = (timestamp - startTime) / 1000
      const cycleDuration = 19 // 4-7-8 呼吸法
      const cycleProgress = (elapsed % cycleDuration) / cycleDuration

      let scale: number
      let label: string
      let labelAlpha: number

      if (cycleProgress < 4 / 19) {
        // 吸气 4s
        const p = cycleProgress / (4 / 19)
        scale = 0.8 + p * 0.5
        label = '吸气...'
        labelAlpha = 1
      } else if (cycleProgress < 11 / 19) {
        // 屏息 7s
        scale = 1.3
        label = '屏息'
        labelAlpha = 0.7
      } else {
        // 呼气 8s
        const p = (cycleProgress - 11 / 19) / (8 / 19)
        scale = 1.3 - p * 0.5
        label = '呼气...'
        labelAlpha = 1
      }

      const cx = canvas.width / 2
      const cy = canvas.height / 2
      const r = Math.min(cx, cy) * 0.6 * scale

      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // 外圈
      ctx.beginPath()
      ctx.arc(cx, cy, r, 0, Math.PI * 2)
      ctx.strokeStyle = 'rgba(74, 222, 128, 0.3)'
      ctx.lineWidth = 2
      ctx.stroke()

      // 内圈
      ctx.beginPath()
      ctx.arc(cx, cy, r * 0.85, 0, Math.PI * 2)
      const gradient = ctx.createRadialGradient(cx, cy, r * 0.5, cx, cy, r * 0.85)
      gradient.addColorStop(0, 'rgba(74, 222, 128, 0.15)')
      gradient.addColorStop(1, 'rgba(74, 222, 128, 0)')
      ctx.fillStyle = gradient
      ctx.fill()

      // 标签文字
      ctx.font = '16px "PingFang SC", "Microsoft YaHei", sans-serif'
      ctx.fillStyle = `rgba(255, 255, 255, ${labelAlpha * 0.7})`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(label, cx, cy)

      animRef.current = requestAnimationFrame(draw)
    }

    animRef.current = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(animRef.current)
      window.removeEventListener('resize', resize)
    }
  }, [isMeditation])

  if (!isMeditation) return null

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
    />
  )
}
