import { useMemo, useCallback } from 'react'
import { useAppStore } from '../../stores/appStore'

const CARDS = [
  { title: '今日肯定语', text: '你不需要每天都发光。有些日子，只是撑过去，就已经赢了。' },
  { title: '今日肯定语', text: '你已经比昨天多走了一步。这一步，没人能替你走。' },
  { title: '今日肯定语', text: '累了就歇一会儿。树不会因为冬天掉光叶子就不是树了。' },
  { title: '微小行动', text: '喝完这杯水。就当给自己今天的情绪，点了个逗号。' },
  { title: '微小行动', text: '站起来伸个懒腰。让脊椎一节一节地说"谢谢你"。' },
  { title: '微小行动', text: '把手放在胸口，感受心跳。那个声音在说：你在，这很好。' },
  { title: '感恩提醒', text: '今天有一个人、一件事或一个瞬间，让你觉得没那么孤单。哪怕只有一秒。' },
  { title: '感恩提醒', text: '窗外那棵树，已经在这里站了好多年。它见过很多个今天的你。' },
  { title: '慰藉一句', text: '没有什么事情是必须今天解决的。天黑了，先睡觉。' },
  { title: '慰藉一句', text: '你不是在原地打转。你是在螺旋上升——从上面看，你一直在走。' },
  { title: '慰藉一句', text: '不用急着变好。先允许自己就是这样。' },
  { title: '今日肯定语', text: '你照顾了那么多人。今天也试着，把自己当其中一个照顾一下。' },
]

export default function DailyPowerCard() {
  const mode = useAppStore((s) => s.mode)

  const card = useMemo(() => CARDS[Math.floor(Math.random() * CARDS.length)], [])

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
    const words = card.text
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
  }, [card.title, card.text])

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
            {card.text}
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
