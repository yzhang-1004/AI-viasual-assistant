import { useAppStore } from '../../stores/appStore'
import MicButton from '../interaction/MicButton'
import TextInput from '../interaction/TextInput'
import { useConversation } from '../../hooks/useConversation'

export default function BottomControlBar() {
  const cameraEnabled = useAppStore((s) => s.cameraEnabled)
  const toggleCamera = useAppStore((s) => s.toggleCamera)
  const showUserCamera = useAppStore((s) => s.showUserCamera)
  const toggleUserCamera = useAppStore((s) => s.toggleUserCamera)
  const setShowSettings = useAppStore((s) => s.setShowSettings)
  const callStatus = useAppStore((s) => s.callStatus)
  const { stopListening } = useConversation()

  const handleLeave = () => {
    stopListening()
  }

  return (
    <div className="absolute bottom-0 left-0 right-0 z-20 pb-6">
      <div className="flex items-center justify-center gap-8 px-6">
        {/* 左侧按钮组 */}
        <div className="flex items-center gap-4">
          {/* 文字输入 */}
          <TextInput />

          {/* 摄像头开关 */}
          <button
            onClick={toggleCamera}
            className={`
              w-10 h-10 rounded-full flex items-center justify-center
              transition-all duration-200
              ${cameraEnabled
                ? 'bg-white/10 border border-white/20 text-white/70'
                : 'bg-red-500/10 border border-red-400/30 text-red-400/60'
              }
            `}
            title={cameraEnabled ? '关闭摄像头' : '开启摄像头'}
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
              {cameraEnabled ? (
                <>
                  <path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14v-4z" />
                  <rect x="3" y="6" width="12" height="12" rx="2" />
                </>
              ) : (
                <>
                  <path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14v-4z" />
                  <rect x="3" y="6" width="12" height="12" rx="2" />
                  <line x1="2" y1="3" x2="22" y2="21" />
                </>
              )}
            </svg>
          </button>

          {/* 小窗显示/隐藏 */}
          <button
            onClick={toggleUserCamera}
            className={`
              w-10 h-10 rounded-full flex items-center justify-center
              transition-all duration-200
              ${showUserCamera
                ? 'bg-white/10 border border-white/20 text-white/70'
                : 'bg-white/5 border border-white/10 text-white/30'
              }
            `}
            title={showUserCamera ? '隐藏小窗' : '显示小窗'}
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="3" width="20" height="14" rx="2" />
              <rect x="16" y="8" width="5" height="4" rx="1" />
            </svg>
          </button>
        </div>

        {/* 中间麦克风 */}
        <MicButton />

        {/* 右侧按钮组 */}
        <div className="flex items-center gap-4">
          {/* 设置 */}
          <button
            onClick={() => setShowSettings(true)}
            className="w-10 h-10 rounded-full flex items-center justify-center bg-white/5 border border-white/10 text-white/50 hover:text-white/70 transition-all duration-200"
            title="设置"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
            </svg>
          </button>

          {/* 离开 */}
          <button
            onClick={handleLeave}
            className={`
              w-10 h-10 rounded-full flex items-center justify-center
              transition-all duration-200
              ${callStatus !== 'idle'
                ? 'bg-red-500/20 border border-red-400/40 text-red-400'
                : 'bg-white/5 border border-white/10 text-white/30'
              }
            `}
            title="挂断离开"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
              <path d="M6.62 10.79a15.053 15.053 0 006.59 6.59l2.2-2.2a1 1 0 011.01-.24c1.12.37 2.33.57 3.58.57a1 1 0 011 1V20a1 1 0 01-1 1A17 17 0 013 4a1 1 0 011-1h3.5a1 1 0 011 1c0 1.25.2 2.46.57 3.58a1 1 0 01-.25 1.01l-2.2 2.2z" transform="rotate(135 12 12)" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
