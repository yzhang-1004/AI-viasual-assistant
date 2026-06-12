import { useAppStore } from '../../stores/appStore'

const SAMPLE_CARDS = [
  { title: '今日肯定语', text: '你已经做得很好了，记得给自己一个拥抱。' },
  { title: '微小行动', text: '今天试试对镜子里的自己微笑 3 秒钟。' },
  { title: '感恩提醒', text: '此刻，想想今天发生的 3 件好事。' },
]

export default function DailyPowerCard() {
  const mode = useAppStore((s) => s.mode)
  const aiReplyText = useAppStore((s) => s.aiReplyText)

  if (mode !== 'daily-power') return null

  const card = SAMPLE_CARDS[Math.floor(Date.now() / 86400000) % SAMPLE_CARDS.length]

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
            {aiReplyText || card.text}
          </p>

          {/* 底部装饰线 */}
          <div className="mt-6 pt-4 border-t border-amber-400/10 flex items-center justify-between">
            <span className="text-[10px] text-white/20 tracking-widest uppercase">
              心灵树洞
            </span>
            <button
              className="text-[10px] text-amber-400/50 hover:text-amber-400/80 transition-colors"
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
