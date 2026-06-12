import { useState } from 'react'
import { useConversation } from '../../hooks/useConversation'
import { useAppStore } from '../../stores/appStore'

export default function TextInput() {
  const [text, setText] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const callStatus = useAppStore((s) => s.callStatus)
  const { sendText, startListening } = useConversation()

  const handleSend = () => {
    const trimmed = text.trim()
    if (!trimmed) return

    // 如果不在通话中，先启动语音识别模式的状态
    if (callStatus === 'idle') {
      startListening()
    }

    sendText(trimmed)
    setText('')
    setIsOpen(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="w-10 h-10 rounded-full flex items-center justify-center bg-white/5 border border-white/10 text-white/40 hover:text-white/70 transition-all duration-200"
        title="文字输入"
      >
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
        </svg>
      </button>
    )
  }

  return (
    <div className="absolute bottom-28 left-0 right-0 z-30 px-6 animate-fade-in">
      <div className="flex items-center gap-2 bg-black/50 backdrop-blur-lg rounded-2xl px-4 py-2 border border-white/10 max-w-md mx-auto">
        <input
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="在这里输入你想说的话..."
          className="flex-1 bg-transparent text-white/80 text-sm outline-none placeholder:text-white/20"
        />
        <button
          onClick={handleSend}
          disabled={!text.trim()}
          className="w-8 h-8 rounded-full flex items-center justify-center bg-amber-500/20 text-amber-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-amber-500/30 transition-colors"
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
        </button>
        <button
          onClick={() => setIsOpen(false)}
          className="w-6 h-6 rounded-full flex items-center justify-center text-white/30 hover:text-white/60"
        >
          <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="3">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  )
}
