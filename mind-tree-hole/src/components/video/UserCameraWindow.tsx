import { useEffect, useRef } from 'react'
import { useAppStore } from '../../stores/appStore'

export default function UserCameraWindow() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const cameraEnabled = useAppStore((s) => s.cameraEnabled)
  const showUserCamera = useAppStore((s) => s.showUserCamera)
  const streamRef = useRef<MediaStream | null>(null)

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
          ref={videoRef}
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
    </div>
  )
}
