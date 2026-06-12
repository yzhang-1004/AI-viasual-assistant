import { useAppStore } from '../../stores/appStore'
import { useConversation } from '../../hooks/useConversation'

export default function MicButton() {
  const callStatus = useAppStore((s) => s.callStatus)
  const { toggleCall } = useConversation()

  const isActive = callStatus !== 'idle'
  const isListening = callStatus === 'listening'

  return (
    <div className="flex flex-col items-center gap-2">
      {/* 声波纹动画 */}
      {isListening && (
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
        onClick={toggleCall}
        className={`
          relative w-16 h-16 rounded-full flex items-center justify-center
          transition-all duration-300 ease-out
          ${isActive
            ? 'bg-amber-500/20 border-2 border-amber-400/60 shadow-[0_0_30px_rgba(245,158,75,0.4)]'
            : 'bg-white/10 border-2 border-white/20 hover:border-amber-400/40 hover:bg-amber-500/10'
          }
        `}
      >
        {isActive && (
          <div className="absolute inset-1 rounded-full bg-amber-400/10 animate-pulse" />
        )}

        <svg
          viewBox="0 0 24 24"
          className={`w-7 h-7 transition-colors duration-300 ${isActive ? 'text-amber-300' : 'text-white/60'}`}
          fill="currentColor"
        >
          {isActive ? (
            <>
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
              <path d="M11 17h2v4h-2z" />
            </>
          ) : (
            <path d="M17.3 11c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.49 6-3.31 6-6.72h-1.7z" />
          )}
        </svg>
      </button>

      <span className="text-xs text-white/40">
        {isActive ? '点击结束' : '点击开始'}
      </span>
    </div>
  )
}
