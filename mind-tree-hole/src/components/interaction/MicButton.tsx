import { useAppStore } from '../../stores/appStore'
import { useConversation } from '../../hooks/useConversation'

export default function MicButton() {
  const callStatus = useAppStore((s) => s.callStatus)
  const aiState = useAppStore((s) => s.aiState)
  const { toggleCall, interruptAI } = useConversation()

  const isActive = callStatus !== 'idle'
  const isListening = callStatus === 'listening'
  const isSpeaking = aiState === 'speaking'

  const handleClick = () => {
    if (isSpeaking) {
      interruptAI()
    } else {
      toggleCall()
    }
  }

  const buttonLabel = isSpeaking ? '点击打断' : isActive ? '点击结束' : '点击开始'

  return (
    <div className="flex flex-col items-center gap-2">
      {/* 声波纹动画 — 仅倾听时显示 */}
      {isListening && !isSpeaking && (
        <div className="flex items-center gap-[2px] h-8 mb-1">
          {[0, 1, 2, 3, 4].map((i) => (
            <span
              key={i}
              className="wave-bar"
              style={{ animationDelay: `${i * 0.15}s`, height: `${12 + Math.random() * 12}px` }}
            />
          ))}
        </div>
      )}

      <button
        onClick={handleClick}
        className={`
          relative w-16 h-16 rounded-full flex items-center justify-center
          transition-all duration-300 ease-out
          ${isSpeaking
            ? 'bg-red-500/20 border-2 border-red-400/60 shadow-[0_0_30px_rgba(239,68,68,0.4)]'
            : isActive
              ? 'bg-amber-500/20 border-2 border-amber-400/60 shadow-[0_0_30px_rgba(245,158,75,0.4)]'
              : 'bg-white/10 border-2 border-white/20 hover:border-amber-400/40 hover:bg-amber-500/10'
          }
        `}
      >
        {/* 脉冲光圈 — 打断态 */}
        {isSpeaking && (
          <div className="absolute inset-1 rounded-full bg-red-400/10 animate-pulse" />
        )}
        {/* 脉冲光圈 — 倾听态 */}
        {isActive && !isSpeaking && (
          <div className="absolute inset-1 rounded-full bg-amber-400/10 animate-pulse" />
        )}

        <svg
          viewBox="0 0 24 24"
          className={`w-7 h-7 transition-colors duration-300 ${isSpeaking ? 'text-red-300' : isActive ? 'text-amber-300' : 'text-white/60'}`}
          fill="currentColor"
        >
          {isSpeaking ? (
            /* 打断图标 — 方块 */
            <rect x="6" y="6" width="12" height="12" rx="2" />
          ) : isActive ? (
            /* 通话中 — 麦克风实心 */
            <>
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
              <path d="M11 17h2v4h-2z" />
            </>
          ) : (
            /* 未通话 — 麦克风空心 */
            <path d="M17.3 11c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.49 6-3.31 6-6.72h-1.7z" />
          )}
        </svg>
      </button>

      <span className={`text-xs transition-colors duration-300 ${isSpeaking ? 'text-red-400/80' : 'text-white/40'}`}>
        {buttonLabel}
      </span>
    </div>
  )
}
