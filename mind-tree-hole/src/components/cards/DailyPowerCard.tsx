import { useRef, useCallback } from 'react'
import { useAppStore } from '../../stores/appStore'

const SAMPLE_CARDS = [
  { title: '今日肯定语', text: '你已经做得很好了，记得给自己一个拥抱。' },
  { title: '微小行动', text: '今天试试对镜子里的自己微笑 3 秒钟。' },
  { title: '感恩提醒', text: '此刻，想想今天发生的 3 件好事。' },
]

export default function DailyPowerCard() {
  const cardRef = useRef<HTMLDivElement>(null)
  const mode = useAppStore((s) => s.mode)
  const aiReplyText = useAppStore((s) => s.aiReplyText)

  const card = SAMPLE_CARDS[Math.floor(Date.now() / 86400000) % SAMPLE_CARDS.length]
  const displayText = aiReplyText || card.text

  const handleSave = useCallback(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 800
    canvas.height = 500
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // 背景渐变
    const bgGrad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height)
    bgGrad.addColorStop(0, '#1a120b')
    bgGrad.addColorStop(1, '#1c0f0a')
    ctx.fillStyle = bgGrad
    ctx.beginPath()
    ctx.roundRect(0, 0, canvas.width, canvas.height, 40)
    ctx.fill()

    // 边框光影
    ctx.strokeStyle = 'rgba(245, 158, 75, 0.15)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.roundRect(2, 2, canvas.width - 4, canvas.height - 4, 38)
    ctx.stroke()

    // 装饰光点
    const glowGrad = ctx.createRadialGradient(canvas.width - 60, 50, 0, canvas.width - 60, 50, 80)
    glowGrad.addColorStop(0, 'rgba(245, 158, 75, 0.15)')
    glowGrad.addColorStop(1, 'rgba(245, 158, 75, 0)')
    ctx.fillStyle = glowGrad
    ctx.beginPath()
    ctx.arc(canvas.width - 60, 50, 80, 0, Math.PI * 2)
    ctx.fill()

    // 标题
    ctx.fillStyle = 'rgba(252, 211, 77, 0.8)'
    ctx.font = '500 18px "PingFang SC", "Microsoft YaHei", sans-serif'
    ctx.fillText(card.title, 50, 80)

    // 正文（自动换行）
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)'
    ctx.font = '300 32px "PingFang SC", "Microsoft YaHei", sans-serif'
    const words = displayText
    const maxWidth = canvas.width - 100
    let lineY = 150
    let currentLine = ''
    for (let i = 0; i < words.length; i++) {
      const testLine = currentLine + words[i]
      if (ctx.measureText(testLine).width > maxWidth && currentLine) {
        ctx.fillText(currentLine, 50, lineY)
        currentLine = words[i]
        lineY += 50
      } else {
        currentLine = testLine
      }
    }
    if (currentLine) ctx.fillText(currentLine, 50, lineY)

    // 底部分隔线
    const lineY2 = canvas.height - 70
    ctx.strokeStyle = 'rgba(245, 158, 75, 0.1)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(50, lineY2)
    ctx.lineTo(canvas.width - 50, lineY2)
    ctx.stroke()

    // 底部文字
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)'
    ctx.font = '400 14px "PingFang SC", "Microsoft YaHei", sans-serif'
    ctx.fillText('心灵树洞', 50, lineY2 + 35)

    // 下载
    canvas.toBlob((blob) => {
      if (!blob) return
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `每日力量-${card.title}.png`
      a.click()
      URL.revokeObjectURL(url)
    }, 'image/png')
  }, [card.title, displayText])

  if (mode !== 'daily-power') return null

  return (
    <div className="absolute inset-0 flex items-center justify-center z-10 px-8">
      <div className="w-full max-w-sm animate-fade-in">
        <div
          className="
            relative rounded-3xl p-8
            bg-gradient-to-br from-amber-500/10 to-orange-600/5
            border border-amber-400/20
            backdrop-blur-md
            shadow-[0_0_60px_rgba(245,158,75,0.1)]
          "
        >
          {/* 装饰光点 */}
          <div className="absolute top-4 right-4 w-12 h-12 rounded-full bg-amber-400/10 blur-xl" />

          <h3 className="text-amber-300/80 text-sm font-medium mb-4 tracking-wider">
            {card.title}
          </h3>

          <p className="text-white/80 text-lg leading-relaxed font-light">
            {displayText}
          </p>

          {/* 底部装饰线 */}
          <div className="mt-6 pt-4 border-t border-amber-400/10 flex items-center justify-between">
            <span className="text-[10px] text-white/20 tracking-widest uppercase">
              心灵树洞
            </span>
            <button
              onClick={handleSave}
              className="text-[10px] text-amber-400/50 hover:text-amber-400/80 transition-colors cursor-pointer"
              title="保存到手机"
            >
              保存卡片
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
