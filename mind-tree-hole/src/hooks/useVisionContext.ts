import { useEffect, useRef } from 'react'
import { useAppStore } from '../stores/appStore'

interface UseVisionContextOptions {
  /** video 元素的 ref */
  videoRef: React.RefObject<HTMLVideoElement | null>
  /** 摄像头开启时才工作 */
  enabled: boolean
  /** 截帧间隔 ms，默认 3000（人脸检测耗时较高） */
  intervalMs?: number
}

const MODEL_URL = 'https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@master/weights'

/**
 * 视觉上下文感知 Hook
 * 端侧分析摄像头画面：亮度 + 人脸检测 + 表情 → 生成文本注入 System Prompt
 */
export function useVisionContext({ videoRef, enabled, intervalMs = 3000 }: UseVisionContextOptions) {
  const faceApiRef = useRef<any>(null)
  const lastContextRef = useRef('')
  const modelsLoadedRef = useRef(false)
  const loadingRef = useRef(false)

  useEffect(() => {
    if (!enabled) {
      useAppStore.getState().setVisionContext('')
      lastContextRef.current = ''
      return
    }

    let cancelled = false

    // 动态加载 face-api.js + 模型（仅一次）
    const loadModels = async (): Promise<any> => {
      if (faceApiRef.current) return faceApiRef.current
      if (loadingRef.current) {
        // 等待正在进行的加载
        while (loadingRef.current && !cancelled) {
          await new Promise((r) => setTimeout(r, 200))
        }
        return faceApiRef.current
      }
      loadingRef.current = true
      try {
        const faceapi = await import('face-api.js')
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
        ])
        modelsLoadedRef.current = true
        faceApiRef.current = faceapi
        return faceapi
      } finally {
        loadingRef.current = false
      }
    }

    // 隐藏 canvas（不插入 DOM）
    const canvas = document.createElement('canvas')
    canvas.width = 160
    canvas.height = 120
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!

    // 计算加权亮度均值（ITU-R BT.601）
    const calcLuminance = (imageData: ImageData): number => {
      const data = imageData.data
      let sum = 0
      let count = 0
      // 每 4 个像素取 1 个，降低计算量
      for (let i = 0; i < data.length; i += 16) {
        sum += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
        count++
      }
      return count > 0 ? sum / count : 128
    }

    // 主循环
    let timer: ReturnType<typeof setInterval>
    const analyze = async () => {
      if (cancelled) return
      const video = videoRef.current
      if (!video || video.readyState < 2) return

      // 1. 截帧
      ctx.drawImage(video, 0, 0, 160, 120)
      const imageData = ctx.getImageData(0, 0, 160, 120)

      // 2. 亮度分析
      const luminance = calcLuminance(imageData)
      let brightPart = ''
      if (luminance <= 50) brightPart = '环境光线很暗'
      else if (luminance <= 120) brightPart = '环境光线偏暗'
      else brightPart = '环境光线充足'

      // 3. 人脸检测（模型就绪后）
      let facePart = ''
      if (modelsLoadedRef.current && faceApiRef.current) {
        try {
          const faceapi = faceApiRef.current
          const detections = await faceapi
            .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 160, scoreThreshold: 0.5 }))
            .withFaceExpressions()

          if (detections.length === 0) {
            facePart = '用户未在画面中'
          } else {
            const { expressions } = detections[0]
            if (expressions.happy > 0.5) {
              facePart = '用户面带笑容'
            } else if (expressions.sad > 0.4) {
              facePart = '用户表情难过'
            } else if (expressions.surprised > 0.3) {
              facePart = '用户表情惊讶'
            } else if (expressions.angry > 0.3) {
              facePart = '用户表情有些愤怒'
            } else if (expressions.neutral > 0.8 && luminance < 80) {
              facePart = '用户面容疲惫'
            }
          }
        } catch {
          // 人脸检测偶发失败，忽略本次
        }
      }

      // 4. 组装文本
      const parts: string[] = []
      if (facePart === '用户未在画面中') {
        parts.push(facePart)
      } else {
        if (brightPart) parts.push(brightPart)
        if (facePart) parts.push(facePart)
      }

      const newContext = parts.length > 0 ? `[视觉上下文：${parts.join('，')}]` : ''

      // 5. 仅变化时更新 store
      if (newContext !== lastContextRef.current) {
        lastContextRef.current = newContext
        useAppStore.getState().setVisionContext(newContext)
      }
    }

    // 启动：先加载模型，再开始分析
    loadModels().then(() => {
      if (!cancelled) {
        analyze()
        timer = setInterval(analyze, intervalMs)
      }
    })

    return () => {
      cancelled = true
      if (timer) clearInterval(timer)
      useAppStore.getState().setVisionContext('')
      lastContextRef.current = ''
    }
  }, [enabled, intervalMs])
}
