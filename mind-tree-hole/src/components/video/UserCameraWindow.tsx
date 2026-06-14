import { forwardRef, useEffect, useRef, useCallback } from 'react'
import { useAppStore } from '../../stores/appStore'

const UserCameraWindow = forwardRef<HTMLVideoElement>((_, ref) => {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const cameraEnabled = useAppStore((s) => s.cameraEnabled)
  const showUserCamera = useAppStore((s) => s.showUserCamera)
  const userText = useAppStore((s) => s.userText)
  const streamRef = useRef<MediaStream | null>(null)

  // 合并内部 ref 与外部 forwardRef
  const setVideoRef = useCallback(
    (node: HTMLVideoElement | null) => {
      videoRef.current = node
      if (typeof ref === 'function') {
        ref(node)
      } else if (ref) {
        ;(ref as React.MutableRefObject<HTMLVideoElement | null>).current = node
      }
    },
    [ref],
  )

  useEffect(() => {
    if (!cameraEnabled) {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
        streamRef.current = null
      }
      return
    }

    navigator.mediaDevices
      .getUserMedia({ video: { width: 320, height: 240, facingMode: 'user' } })
      .then((stream) => {
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
        }
      })
      .catch((err) => {
        console.warn('摄像头访问失败:', err)
        useAppStore.getState().toggleCamera()
      })

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
        streamRef.current = null
      }
    }
  }, [cameraEnabled])

  if (!showUserCamera || !cameraEnabled) return null

  return (
    <div className="absolute top-6 left-4 z-20">
      <div className="w-28 h-36 rounded-2xl overflow-hidden border-2 border-white/10 shadow-lg bg-black/40 backdrop-blur-sm">
        <video
          ref={setVideoRef}
          autoPlay
          muted
          playsInline
          className="w-full h-full object-cover"
        />
      </div>
      {/* 标签 */}
      <div className="mt-1 text-center">
        <span className="text-[10px] text-white/30">你</span>
      </div>
      {/* 用户说话文字 */}
      {userText && (
        <div className="mt-1 max-w-[112px] text-center">
          <span className="text-[11px] text-white/50 leading-tight animate-pulse line-clamp-2">
            {userText}
          </span>
        </div>
      )}
    </div>
  )
})
UserCameraWindow.displayName = 'UserCameraWindow'
export default UserCameraWindow
