import { useEffect, useRef } from 'react'
import { useAppStore } from '../../stores/appStore'

export default function AIReplyText() {
  const aiReplyText = useAppStore((s) => s.aiReplyText)
  const aiState = useAppStore((s) => s.aiState)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [aiReplyText])

  const isVisible = aiState === 'speaking' || aiState === 'thinking'

  if (!isVisible && !aiReplyText) return null

  return (
    <div
      className={`
        absolute bottom-32 left-1/2 -translate-x-1/2 w-[85%] max-w-md
        transition-all duration-500
        ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
      `}
    >
      <div
        ref={containerRef}
        className="
          bg-black/30 backdrop-blur-md rounded-2xl px-5 py-3
          text-center text-white/80 text-sm leading-relaxed
          max-h-24 overflow-y-auto hide-scrollbar
          border border-white/5
        "
      >
        {aiReplyText || (
          <span className="text-white/30 italic">
            {aiState === 'thinking' ? '思考中...' : ''}
          </span>
        )}
        {aiState === 'thinking' && (
          <span className="inline-flex gap-1 ml-1">
            <span className="w-1.5 h-1.5 bg-amber-400/60 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
            <span className="w-1.5 h-1.5 bg-amber-400/60 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
            <span className="w-1.5 h-1.5 bg-amber-400/60 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
          </span>
        )}
      </div>
    </div>
  )
}
