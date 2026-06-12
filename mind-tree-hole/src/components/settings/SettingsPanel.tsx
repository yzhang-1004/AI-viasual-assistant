import { useState } from 'react'
import { useAppStore } from '../../stores/appStore'
import { getApiKey, setApiKey, clearApiKey, hasApiKey } from '../../config/dashscope'

export default function SettingsPanel() {
  const showSettings = useAppStore((s) => s.showSettings)
  const setShowSettings = useAppStore((s) => s.setShowSettings)
  const [keyInput, setKeyInput] = useState('')
  const [savedKey, setSavedKey] = useState(getApiKey)
  const [showKey, setShowKey] = useState(false)

  if (!showSettings) return null

  const handleSave = () => {
    if (keyInput.trim()) {
      setApiKey(keyInput.trim())
      setSavedKey(keyInput.trim())
      setKeyInput('')
    }
  }

  const handleClear = () => {
    clearApiKey()
    setSavedKey('')
    setKeyInput('')
  }

  const maskedKey = savedKey
    ? savedKey.slice(0, 8) + '••••••••' + savedKey.slice(-4)
    : ''

  return (
    <div
      className="absolute inset-0 z-50 settings-overlay flex items-center justify-center p-6"
      onClick={(e) => { if (e.target === e.currentTarget) setShowSettings(false) }}
    >
      <div className="w-full max-w-sm bg-[#1a1008] rounded-2xl p-6 border border-white/10 shadow-2xl animate-fade-in">
        {/* 标题 */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-white/80 text-lg font-medium">设置</h2>
          <button
            onClick={() => setShowSettings(false)}
            className="text-white/30 hover:text-white/60 transition-colors"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* API Key 设置 */}
        <div className="space-y-4">
          <div>
            <label className="text-white/50 text-xs mb-2 block">灵积 DashScope API Key</label>

            {savedKey ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2">
                  <input
                    type={showKey ? 'text' : 'password'}
                    value={showKey ? savedKey : maskedKey}
                    readOnly
                    className="flex-1 bg-transparent text-white/60 text-sm outline-none"
                  />
                  <button
                    onClick={() => setShowKey(!showKey)}
                    className="text-white/30 hover:text-white/60 text-xs"
                  >
                    {showKey ? '隐藏' : '显示'}
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-green-400/60 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-green-400 rounded-full" />
                    已配置
                  </span>
                  <button
                    onClick={handleClear}
                    className="text-[10px] text-red-400/50 hover:text-red-400/80 ml-auto"
                  >
                    清除
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <input
                  type="password"
                  value={keyInput}
                  onChange={(e) => setKeyInput(e.target.value)}
                  placeholder="sk-xxxxxxxxxxxxxxxx"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white/80 text-sm placeholder-white/20 outline-none focus:border-amber-400/40 transition-colors"
                />
                <button
                  onClick={handleSave}
                  disabled={!keyInput.trim()}
                  className="w-full py-2 rounded-lg bg-amber-500/20 border border-amber-400/30 text-amber-300 text-sm font-medium hover:bg-amber-500/30 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  保存 Key
                </button>
              </div>
            )}
          </div>

          {/* 获取 Key 链接 */}
          <div className="pt-4 border-t border-white/5">
            <a
              href="https://bailian.console.aliyun.com/#/api-key"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-amber-400/50 hover:text-amber-400/80 transition-colors"
            >
              前往阿里云百炼获取 API Key →
            </a>
            <p className="text-[10px] text-white/20 mt-1">
              Key 仅保存在浏览器本地存储中
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
