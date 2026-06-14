import { useRef } from 'react'
import { useAppStore } from '../../stores/appStore'
import { useVisionContext } from '../../hooks/useVisionContext'
import BreathingGlow from '../ai-avatar/BreathingGlow'
import FireflyParticles from '../ai-avatar/FireflyParticles'
import BreathingCircle from '../interaction/BreathingCircle'
import AIReplyText from '../interaction/AIReplyText'
import ModeSwitchBar from './ModeSwitchBar'
import BottomControlBar from './BottomControlBar'
import UserCameraWindow from '../video/UserCameraWindow'
import DailyPowerCard from '../cards/DailyPowerCard'
import SettingsPanel from '../settings/SettingsPanel'

export default function FullScreenCall() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const aiState = useAppStore((s) => s.aiState)
  const mode = useAppStore((s) => s.mode)
  const cameraEnabled = useAppStore((s) => s.cameraEnabled)

  // 视觉上下文感知（亮度 + 人脸 + 表情）
  useVisionContext({ videoRef, enabled: cameraEnabled })

  const statusLabel = (() => {
    if (mode === 'meditation') return '冥想中'
    switch (aiState) {
      case 'listening': return '倾听中'
      case 'thinking': return '思考中'
      case 'speaking': return '说话中'
      default: return '点击麦克风开始'
    }
  })()

  const statusColor = (() => {
    if (mode === 'meditation') return 'text-green-300/60'
    switch (aiState) {
      case 'listening': return 'text-amber-300/60'
      case 'thinking': return 'text-purple-300/60'
      case 'speaking': return 'text-amber-200/70'
      default: return 'text-white/20'
    }
  })()

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* 萤火虫粒子背景 */}
      <FireflyParticles />

      {/* 呼吸光晕 */}
      <BreathingGlow />

      {/* 冥想呼吸圈 */}
      <BreathingCircle />

      {/* 每日力量卡片 */}
      <DailyPowerCard />

      {/* 模式切换栏 */}
      <ModeSwitchBar />

      {/* 用户摄像小窗 */}
      <UserCameraWindow ref={videoRef} />

      {/* AI 状态标签 */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[140px] z-10 text-center">
        <span className={`text-xs tracking-widest ${statusColor} transition-colors duration-500`}>
          {statusLabel}
        </span>
      </div>

      {/* AI 回复文字 */}
      <AIReplyText />

      {/* 底部操控栏 */}
      <BottomControlBar />

      {/* 设置面板 */}
      <SettingsPanel />
    </div>
  )
}
