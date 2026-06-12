'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Camera, CameraOff, Mic, MicOff, Send, Volume2, VolumeX,
  Eye, Trash2, Loader2, Sparkles, Settings, X,
  MessageCircle, Radio, ChevronDown
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'

// ─── 类型定义 ───
interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  mode?: 'vision' | 'text' | 'voice'
  timestamp: Date
}

interface CostStats {
  vision: number
  text: number
  asr: number
  tts: number
  framesSent: number
  framesSkipped: number
}

// ──────────────────── 工具函数 ────────────────────

function compressImage(video: HTMLVideoElement, maxWidth = 512, quality = 0.6): string | null {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  const scale = maxWidth / video.videoWidth
  canvas.width = maxWidth
  canvas.height = video.videoHeight * scale
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL('image/jpeg', quality).split(',')[1]
}

function calculateFrameDifference(a: ImageData, b: ImageData): number {
  let diff = 0
  const step = 16
  for (let i = 0; i < a.data.length; i += 4 * step) {
    diff += Math.abs(a.data[i] - b.data[i])
    diff += Math.abs(a.data[i + 1] - b.data[i + 1])
    diff += Math.abs(a.data[i + 2] - b.data[i + 2])
  }
  return diff / (a.data.length / (4 * step)) / 255 / 3
}

function detectVoiceActivity(analyser: AnalyserNode, threshold: number): boolean {
  const data = new Uint8Array(analyser.frequencyBinCount)
  analyser.getByteFrequencyData(data)
  const avg = data.reduce((a, b) => a + b, 0) / data.length
  return avg > threshold
}

async function convertWebmToWav(blob: Blob): Promise<string> {
  const audioCtx = new AudioContext({ sampleRate: 16000 })
  const arrayBuf = await blob.arrayBuffer()
  const audioBuffer = await audioCtx.decodeAudioData(arrayBuf)
  const channelData = audioBuffer.getChannelData(0)
  const length = channelData.length
  const wavBuffer = new ArrayBuffer(44 + length * 2)
  const view = new DataView(wavBuffer)

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i))
  }

  writeString(0, 'RIFF')
  view.setUint32(4, 36 + length * 2, true)
  writeString(8, 'WAVE')
  writeString(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, 16000, true)
  view.setUint32(28, 32000, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  writeString(36, 'data')
  view.setUint32(40, length * 2, true)

  for (let i = 0; i < length; i++) {
    const s = Math.max(-1, Math.min(1, channelData[i]))
    view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true)
  }

  const wavBlob = new Blob([wavBuffer], { type: 'audio/wav' })
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve((reader.result as string).split(',')[1])
    reader.readAsDataURL(wavBlob)
  })
}

// ──────────────────── 主页面 ────────────────────

export default function Home() {
  // 状态
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isCameraOn, setIsCameraOn] = useState(false)
  const [isMicOn, setIsMicOn] = useState(false)
  const [isTtsOn, setIsTtsOn] = useState(true)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isAiSeeing, setIsAiSeeing] = useState(false)
  const [currentImage, setCurrentImage] = useState<string | null>(null)
  const [costStats, setCostStats] = useState<CostStats>({
    vision: 0, text: 0, asr: 0, tts: 0, framesSent: 0, framesSkipped: 0,
  })
  const [vadThreshold, setVadThreshold] = useState(15)
  const [frameInterval, setFrameInterval] = useState(2000)
  const [showSettings, setShowSettings] = useState(false)
  const [asrText, setAsrText] = useState('')
  const [isProcessingVoice, setIsProcessingVoice] = useState(false)
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({})

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const prevFrameRef = useRef<ImageData | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const analyserRef = useRef<AnalyserNode | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const vadIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const frameIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const ttsAudioRef = useRef<HTMLAudioElement | null>(null)
  const isRecordingRef = useRef(false)

  // 卡片折叠切换（设计细节 #4）
  const toggleCollapse = (key: string) => {
    setCollapsedSections(prev => ({ ...prev, [key]: !prev[key] }))
  }

  // 自动滚动
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ─── 摄像头控制 ───
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }
      })
      streamRef.current = stream
      if (videoRef.current) videoRef.current.srcObject = stream
      setIsCameraOn(true)
    } catch (err) {
      console.error('Camera error:', err)
    }
  }, [])

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setIsCameraOn(false)
    setIsAiSeeing(false)
    setCurrentImage(null)
  }, [])

  // 帧采样
  useEffect(() => {
    if (!isCameraOn) {
      if (frameIntervalRef.current) clearInterval(frameIntervalRef.current)
      return
    }
    const captureFrame = () => {
      if (!videoRef.current || !canvasRef.current) return
      const video = videoRef.current
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      if (!ctx) return
      canvas.width = 160
      canvas.height = 120
      ctx.drawImage(video, 0, 0, 160, 120)
      const currentFrame = ctx.getImageData(0, 0, 160, 120)
      if (prevFrameRef.current) {
        const diff = calculateFrameDifference(prevFrameRef.current, currentFrame)
        if (diff < 0.05) {
          setCostStats(s => ({ ...s, framesSkipped: s.framesSkipped + 1 }))
          prevFrameRef.current = currentFrame
          return
        }
      }
      prevFrameRef.current = currentFrame
      const base64 = compressImage(video)
      if (base64) {
        setCurrentImage(base64)
        setIsAiSeeing(true)
        setCostStats(s => ({ ...s, framesSent: s.framesSent + 1 }))
      }
    }
    frameIntervalRef.current = setInterval(captureFrame, frameInterval)
    return () => { if (frameIntervalRef.current) clearInterval(frameIntervalRef.current) }
  }, [isCameraOn, frameInterval])

  // ─── TTS 语音播放 ───
  const playTTS = useCallback(async (text: string) => {
    try {
      if (ttsAudioRef.current) {
        ttsAudioRef.current.pause()
        ttsAudioRef.current = null
      }

      setIsSpeaking(true)
      setCostStats(s => ({ ...s, tts: s.tts + 1 }))

      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice: 'longxiaochun', speed: 1.0 }),
      })

      if (!res.ok) throw new Error('TTS failed')

      const audioBlob = await res.blob()
      const url = URL.createObjectURL(audioBlob)
      const audio = new Audio(url)
      ttsAudioRef.current = audio

      audio.onended = () => {
        setIsSpeaking(false)
        URL.revokeObjectURL(url)
      }
      audio.onerror = () => setIsSpeaking(false)

      await audio.play()
    } catch (err) {
      console.error('TTS error:', err)
      setIsSpeaking(false)
    }
  }, [])

  const stopTTS = useCallback(() => {
    if (ttsAudioRef.current) {
      ttsAudioRef.current.pause()
      ttsAudioRef.current = null
    }
    setIsSpeaking(false)
  }, [])

  // ─── 麦克风 & VAD ───
  const stopRecordingAndProcess = useCallback(async () => {
    isRecordingRef.current = false
    if (vadIntervalRef.current) clearInterval(vadIntervalRef.current)

    const recorder = mediaRecorderRef.current
    if (recorder && recorder.state === 'recording') recorder.stop()
    await new Promise(r => setTimeout(r, 300))

    const chunks = [...audioChunksRef.current]
    audioChunksRef.current = []
    recorder?.stream.getTracks().forEach(t => t.stop())
    setIsMicOn(false)

    if (chunks.length === 0) return

    setIsProcessingVoice(true)
    try {
      const blob = new Blob(chunks, { type: 'audio/webm' })
      const wavBase64 = await convertWebmToWav(blob)

      const asrRes = await fetch('/api/asr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audioBase64: wavBase64 }),
      })
      const asrData = await asrRes.json()
      setCostStats(s => ({ ...s, asr: s.asr + 1 }))

      if (asrData.success && asrData.text && asrData.text !== '（未识别到语音内容）') {
        setAsrText(asrData.text)
        await sendMessage(asrData.text, 'voice')
      }
    } catch (err) {
      console.error('Voice processing error:', err)
    } finally {
      setIsProcessingVoice(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 16000 }
      })
      audioCtxRef.current = new AudioContext()
      const source = audioCtxRef.current.createMediaStreamSource(stream)
      analyserRef.current = audioCtxRef.current.createAnalyser()
      analyserRef.current.fftSize = 512
      source.connect(analyserRef.current)

      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      mediaRecorderRef.current = recorder
      audioChunksRef.current = []
      isRecordingRef.current = true

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data)
      }
      recorder.start(100)
      setIsMicOn(true)

      // VAD 循环：静默 2 秒自动停止
      let silenceStart = 0
      vadIntervalRef.current = setInterval(() => {
        if (!analyserRef.current || !isRecordingRef.current) return
        const hasVoice = detectVoiceActivity(analyserRef.current, vadThreshold)
        if (hasVoice) {
          silenceStart = 0
        } else {
          if (silenceStart === 0) silenceStart = Date.now()
          if (Date.now() - silenceStart > 2000 && audioChunksRef.current.length > 0) {
            stopRecordingAndProcess()
          }
        }
      }, 200)
    } catch (err) {
      console.error('Mic error:', err)
    }
  }, [vadThreshold, stopRecordingAndProcess])

  const stopMic = useCallback(() => {
    if (isRecordingRef.current) stopRecordingAndProcess()
  }, [stopRecordingAndProcess])

  // ─── 发送消息（★ 语音闭环） ───
  const sendMessage = useCallback(async (text?: string, source?: 'voice' | 'text') => {
    const msgText = text || input.trim()
    if (!msgText || isLoading) return

    setInput('')
    setAsrText('')
    setIsLoading(true)

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: msgText,
      mode: source || 'text',
      timestamp: new Date(),
    }
    setMessages(prev => [...prev, userMsg])

    try {
      const history = messages.slice(-8).map(m => ({
        role: m.role,
        content: m.content,
      }))

      const res = await fetch('/api/vision-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: msgText,
          imageBase64: currentImage,
          hasImage: isCameraOn && !!currentImage,
          history,
        }),
      })
      const data = await res.json()

      if (data.success) {
        const aiMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.response,
          mode: data.mode,
          timestamp: new Date(),
        }
        setMessages(prev => [...prev, aiMsg])
        setCostStats(s => ({
          ...s,
          [data.mode === 'vision' ? 'vision' : 'text']: s[data.mode === 'vision' ? 'vision' : 'text'] + 1,
        }))

        // ★★★ 语音闭环：AI 回复后自动 TTS ★★★
        if (isTtsOn && data.response) {
          playTTS(data.response)
        }
      }
    } catch (err) {
      console.error('Send error:', err)
    } finally {
      setIsLoading(false)
    }
  }, [input, isLoading, messages, currentImage, isCameraOn, isTtsOn, playTTS])

  const clearChat = useCallback(() => {
    setMessages([])
    stopTTS()
  }, [stopTTS])

  useEffect(() => {
    return () => {
      stopCamera()
      if (vadIntervalRef.current) clearInterval(vadIntervalRef.current)
      stopTTS()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 推导当前 AI 状态（用于驱动背景呼吸）
  const aiState: 'idle' | 'seeing' | 'hearing' | 'speaking' =
    isSpeaking || isLoading ? 'speaking' :
    isMicOn ? 'hearing' :
    isCameraOn ? 'seeing' :
    'idle'

  const totalCalls = costStats.vision + costStats.text + costStats.asr + costStats.tts
  const totalFrames = costStats.framesSent + costStats.framesSkipped
  const frameSaveRate = totalFrames > 0 ? Math.round(costStats.framesSkipped / totalFrames * 100) : 0

  // ──────────────────── 渲染 ────────────────────

  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden relative">
      {/* 星云背景 — 随状态律动 */}
      <div
        className={[
          'fixed inset-0 pointer-events-none transition-all duration-[2000ms] ease-in-out',
          aiState === 'seeing' ? 'opacity-100' : 'opacity-70',
        ].join(' ')}
      >
        <div className={`fixed top-[-25%] left-[-15%] w-[700px] h-[700px] rounded-full bg-cyan-500/[0.04] blur-[140px] pointer-events-none ${
          aiState === 'speaking' ? 'animate-nebula-breathe-speaking' :
          aiState !== 'idle' ? 'animate-nebula-breathe-thinking' :
          'animate-nebula-breathe'
        } animate-nebula-drift`} />
        <div className={`fixed bottom-[-20%] right-[-10%] w-[550px] h-[550px] rounded-full bg-purple-500/[0.05] blur-[130px] pointer-events-none ${
          aiState === 'speaking' ? 'animate-nebula-breathe-speaking' :
          aiState !== 'idle' ? 'animate-nebula-breathe-thinking' :
          'animate-nebula-breathe'
        } animate-nebula-drift`} style={{ animationDelay: '-8s' }} />
        <motion.div
          className="fixed top-[30%] right-[15%] w-[350px] h-[350px] rounded-full blur-[100px] pointer-events-none"
          animate={{
            backgroundColor: [
              'rgba(34, 211, 238, 0.03)',
              'rgba(147, 51, 234, 0.03)',
              'rgba(251, 191, 36, 0.03)',
              'rgba(34, 211, 238, 0.03)',
            ],
          }}
          transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
        />
      </div>

      {/* ══════ 顶部导航栏 ══════ */}
      <header className="relative z-10 border-b border-white/[0.04] bg-white/[0.01] backdrop-blur-2xl">
        <div className="max-w-7xl mx-auto px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Logo — 克制，仅微弱光晕 */}
            <div className="relative">
              <div className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-cyan-400/60" />
              </div>
            </div>
            <div>
              <h1 className="text-sm font-medium text-white/80 tracking-wide">AI 视觉助手</h1>
              <p className="text-[10px] text-white/20 -mt-0.5">Vision · Voice · Intelligence</p>
            </div>
          </div>

          {/* 状态指示 — 青/琥珀/紫 状态色 */}
          <div className="flex items-center gap-2.5">
            <AnimatePresence>
              {isCameraOn && (
                <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }}>
                  <Badge className="bg-cyan-500/[0.06] text-cyan-400/80 border-cyan-500/15 text-[10px] px-2 py-0.5">
                    <motion.div className="w-1.5 h-1.5 rounded-full bg-cyan-400 mr-1.5"
                      animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 2, repeat: Infinity }} />
                    视觉
                  </Badge>
                </motion.div>
              )}
              {isMicOn && (
                <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }}>
                  <Badge className="bg-amber-500/[0.06] text-amber-400/80 border-amber-500/15 text-[10px] px-2 py-0.5">
                    <motion.div className="w-1.5 h-1.5 rounded-full bg-amber-400 mr-1.5"
                      animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1, repeat: Infinity }} />
                    聆听中
                  </Badge>
                </motion.div>
              )}
              {isSpeaking && (
                <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }}>
                  <Badge className="bg-purple-500/[0.06] text-purple-400/80 border-purple-500/15 text-[10px] px-2 py-0.5">
                    <motion.div className="w-1.5 h-1.5 rounded-full bg-purple-400 mr-1.5"
                      animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 1.2, repeat: Infinity }} />
                    表达中
                  </Badge>
                </motion.div>
              )}
            </AnimatePresence>
            <div className="w-px h-4 bg-white/[0.06] mx-1" />
            <Button variant="ghost" size="icon" onClick={() => setShowSettings(!showSettings)}
              className="text-white/20 hover:text-white/50 hover:bg-white/[0.03] h-8 w-8">
              <Settings className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </header>

      {/* ══════ 主内容区 ══════ */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 py-4 flex gap-4 h-[calc(100vh-70px)]">

        {/* ═══ 左侧功能栏 ═══ */}
        <div className="w-[340px] flex-shrink-0 flex flex-col gap-3 overflow-y-auto">

          {/* ── 实时摄像头 ── */}
          <Card className={`state-transition relative overflow-hidden bg-white/[0.02] border-white/[0.05] backdrop-blur-2xl rounded-xl ${isCameraOn ? 'glow-cyan border-cyan-500/15' : ''}`}>
            <div
              className="px-3 py-2.5 flex items-center justify-between cursor-pointer hover:bg-white/[0.02] transition-colors"
              onClick={() => toggleCollapse('camera')}
            >
              <div className="flex items-center gap-2">
                <Camera className={`w-3.5 h-3.5 state-transition ${isCameraOn ? 'text-cyan-400/70' : 'text-white/20'}`} />
                <span className="text-xs text-white/40 font-medium">实时摄像头</span>
              </div>
              <motion.div
                animate={{ rotate: collapsedSections.camera ? 0 : 180 }}
                transition={{ duration: 0.25 }}
              >
                <ChevronDown className="w-3.5 h-3.5 text-white/15" />
              </motion.div>
            </div>
            <AnimatePresence>
              {!collapsedSections.camera && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: 'easeInOut' }}
                >
                  <div className={`aspect-[4/3] relative bg-black/30 mx-3 mb-2 rounded-lg overflow-hidden state-transition ${isCameraOn ? 'ring-1 ring-cyan-500/10' : ''}`}>
                    <video ref={videoRef} autoPlay playsInline muted
                      className={`w-full h-full object-cover ${isCameraOn ? 'opacity-100' : 'opacity-0'}`} />
                    <canvas ref={canvasRef} className="hidden" />

                    {/* 摄像头空状态 */}
                    {!isCameraOn && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                        <motion.div
                          animate={{ scale: [1, 1.03, 1] }}
                          transition={{ duration: 4, repeat: Infinity }}
                          className="w-14 h-14 rounded-full bg-white/[0.02] border border-white/[0.04] flex items-center justify-center"
                        >
                          <Camera className="w-6 h-6 text-white/15" />
                        </motion.div>
                        <p className="text-white/15 text-xs">开启摄像头获得视觉能力</p>
                      </div>
                    )}

                    {/* AI 正在观察 */}
                    <AnimatePresence>
                      {isAiSeeing && isCameraOn && (
                        <motion.div
                          initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }}
                          className="absolute top-2.5 left-2.5 flex items-center gap-1.5 bg-black/40 backdrop-blur-md rounded-full px-2.5 py-1"
                        >
                          <motion.div className="w-1.5 h-1.5 rounded-full bg-cyan-400"
                            animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 2, repeat: Infinity }} />
                          <span className="text-[10px] text-cyan-300/80 font-medium">观察中</span>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <div className="px-3 pb-3">
                    <Button
                      onClick={isCameraOn ? stopCamera : startCamera}
                      className={`w-full h-9 rounded-lg text-xs font-medium state-transition ${
                        isCameraOn
                          ? 'bg-white/[0.03] text-white/40 hover:text-white/60 border border-white/[0.06]'
                          : 'bg-white/[0.03] text-cyan-400/70 hover:bg-cyan-500/[0.06] border border-white/[0.05]'
                      }`}
                      variant="ghost" size="sm"
                    >
                      {isCameraOn ? <CameraOff className="w-3.5 h-3.5 mr-1.5" /> : <Camera className="w-3.5 h-3.5 mr-1.5" />}
                      {isCameraOn ? '关闭摄像头' : '开启摄像头'}
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </Card>

          {/* ── 快捷操作 ── */}
          <Card className={`state-transition bg-white/[0.02] border-white/[0.05] backdrop-blur-2xl rounded-xl ${isMicOn ? 'glow-amber border-amber-500/15' : ''}`}>
            <div
              className="px-3 py-2.5 flex items-center justify-between cursor-pointer hover:bg-white/[0.02] transition-colors"
              onClick={() => toggleCollapse('actions')}
            >
              <div className="flex items-center gap-2">
                <Sparkles className={`w-3.5 h-3.5 state-transition ${isMicOn ? 'text-amber-400/70' : 'text-white/20'}`} />
                <span className="text-xs text-white/40 font-medium">快捷操作</span>
              </div>
              <motion.div
                animate={{ rotate: collapsedSections.actions ? 0 : 180 }}
                transition={{ duration: 0.25 }}
              >
                <ChevronDown className="w-3.5 h-3.5 text-white/15" />
              </motion.div>
            </div>
            <AnimatePresence>
              {!collapsedSections.actions && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: 'easeInOut' }}
                >
                  <div className="px-3 pb-3 space-y-2">
                    {/* 麦克风按钮 — 琥珀色脉冲 */}
                    <div className="relative">
                      {isMicOn && (
                        <motion.div
                          className="absolute inset-0 rounded-lg border border-amber-400/20 pointer-events-none"
                          animate={{ scale: [1, 1.08], opacity: [0.4, 0] }}
                          transition={{ duration: 1.2, repeat: Infinity }}
                        />
                      )}
                      <Button
                        onClick={isMicOn ? stopMic : startRecording}
                        className={`w-full justify-start h-10 rounded-lg text-xs font-medium state-transition ${
                          isMicOn
                            ? 'bg-amber-500/[0.06] text-amber-400/80 hover:bg-amber-500/[0.10] border border-amber-500/15'
                            : 'bg-white/[0.02] text-white/35 hover:bg-white/[0.05] hover:text-white/55 border border-white/[0.05]'
                        }`}
                        variant="ghost" size="sm"
                      >
                        {isMicOn ? <MicOff className="w-3.5 h-3.5 mr-2" /> : <Mic className="w-3.5 h-3.5 mr-2" />}
                        {isMicOn ? '停止录音' : '语音对话'}
                        {isProcessingVoice && <Loader2 className="w-3 h-3 ml-auto animate-spin text-amber-400/60" />}
                      </Button>
                    </div>

                    {/* 语音回复开关 */}
                    <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                      <div className="flex items-center gap-2">
                        {isSpeaking ? (
                          <Volume2 className="w-3.5 h-3.5 text-purple-400/60" />
                        ) : (
                          <VolumeX className="w-3.5 h-3.5 text-white/15" />
                        )}
                        <span className="text-xs text-white/35">语音回复</span>
                      </div>
                      <Switch checked={isTtsOn} onCheckedChange={setIsTtsOn} />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </Card>

          {/* ── AI 表达中 — 紫色波形 ── */}
          <AnimatePresence>
            {isSpeaking && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="glow-purple bg-purple-500/[0.03] border-purple-500/10 backdrop-blur-2xl rounded-xl p-3">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <motion.div
                          key={i}
                          className="w-0.5 bg-purple-400/50 rounded-full"
                          animate={{ height: [6, 16, 6] }}
                          transition={{ duration: 0.5 + Math.random() * 0.3, repeat: Infinity, delay: i * 0.12 }}
                        />
                      ))}
                    </div>
                    <div className="flex-1">
                      <p className="text-[11px] text-purple-300/60 font-medium">AI 正在表达</p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={stopTTS}
                      className="text-white/15 hover:text-white/40 hover:bg-white/[0.03] h-7 w-7">
                      <VolumeX className="w-3 h-3" />
                    </Button>
                  </div>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── 调用统计 ── */}
          <Card className="bg-white/[0.02] border-white/[0.05] backdrop-blur-2xl rounded-xl">
            <div
              className="px-3 py-2.5 flex items-center justify-between cursor-pointer hover:bg-white/[0.02] transition-colors"
              onClick={() => toggleCollapse('stats')}
            >
              <div className="flex items-center gap-2">
                <div className="w-3.5 h-3.5 flex items-center justify-center text-white/20">
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="3" y="12" width="4" height="9" rx="1" />
                    <rect x="10" y="7" width="4" height="14" rx="1" />
                    <rect x="17" y="3" width="4" height="18" rx="1" />
                  </svg>
                </div>
                <span className="text-xs text-white/40 font-medium">调用统计</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-white/15">{totalCalls} 次</span>
                <motion.div
                  animate={{ rotate: collapsedSections.stats ? 0 : 180 }}
                  transition={{ duration: 0.25 }}
                >
                  <ChevronDown className="w-3.5 h-3.5 text-white/15" />
                </motion.div>
              </div>
            </div>
            <AnimatePresence>
              {!collapsedSections.stats && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: 'easeInOut' }}
                >
                  <div className="px-3 pb-3">
                    <div className="grid grid-cols-2 gap-1">
                      {[
                        { label: '视觉', value: costStats.vision, color: 'text-cyan-400', bg: 'bg-cyan-500/[0.04]', dot: 'bg-cyan-400/60' },
                        { label: '文字', value: costStats.text, color: 'text-white/50', bg: 'bg-white/[0.02]', dot: 'bg-white/30' },
                        { label: '语音', value: costStats.asr, color: 'text-amber-400', bg: 'bg-amber-500/[0.04]', dot: 'bg-amber-400/60' },
                        { label: '表达', value: costStats.tts, color: 'text-purple-400', bg: 'bg-purple-500/[0.04]', dot: 'bg-purple-400/60' },
                      ].map(item => (
                        <div key={item.label} className={`flex items-center gap-1.5 px-2.5 py-2 rounded-md ${item.bg}`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${item.dot}`} />
                          <motion.span
                            key={item.value}
                            initial={{ y: -6, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            className={`text-sm font-medium ${item.color}`}
                          >
                            {item.value}
                          </motion.span>
                          <span className="text-[10px] text-white/20 ml-auto">{item.label}</span>
                        </div>
                      ))}
                    </div>

                    {totalCalls > 0 && (
                      <div className="mt-2 h-1 rounded-full bg-white/[0.03] overflow-hidden flex">
                        <div style={{ width: `${(costStats.vision / totalCalls) * 100}%` }} className="bg-cyan-500/30 transition-all duration-700" />
                        <div style={{ width: `${(costStats.text / totalCalls) * 100}%` }} className="bg-white/10 transition-all duration-700" />
                        <div style={{ width: `${(costStats.asr / totalCalls) * 100}%` }} className="bg-amber-500/30 transition-all duration-700" />
                        <div style={{ width: `${(costStats.tts / totalCalls) * 100}%` }} className="bg-purple-500/30 transition-all duration-700" />
                      </div>
                    )}

                    <div className="mt-2 flex items-center justify-between text-[10px] text-white/12">
                      <span>帧 {costStats.framesSent} / 跳 {costStats.framesSkipped}</span>
                      <span>省 {frameSaveRate}%</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </Card>
        </div>

        {/* ═══ 右侧对话区 ═══ */}
        <div className="flex-1 flex flex-col gap-3 min-w-0">
          <Card className="flex-1 min-h-0 bg-white/[0.02] border-white/[0.05] backdrop-blur-2xl rounded-xl flex flex-col overflow-hidden">
            {/* 对话头部 */}
            <div className="px-5 py-3 border-b border-white/[0.04] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-3.5 h-3.5 text-white/20" />
                <span className="text-xs text-white/40 font-medium">对话</span>
                <span className="text-[10px] text-white/12">{messages.length} 条</span>
              </div>
              <Button variant="ghost" size="sm" onClick={clearChat}
                className="text-white/15 hover:text-white/40 hover:bg-white/[0.03] h-7 text-[11px]">
                <Trash2 className="w-3 h-3 mr-1" /> 清空
              </Button>
            </div>

            {/* 消息列表 */}
            <ScrollArea className="flex-1 px-5 py-4">
              {messages.length === 0 ? (
                /* 空状态 — 克制品牌展示 */
                <div className="flex flex-col items-center justify-center h-full min-h-[400px] gap-5">
                  <motion.div
                    animate={{ scale: [1, 1.03, 1] }}
                    transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
                    className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/[0.05] flex items-center justify-center"
                  >
                    <Sparkles className="w-7 h-7 text-cyan-400/40" />
                  </motion.div>
                  <div className="text-center max-w-[280px]">
                    <p className="text-sm text-white/35 font-medium">你好，我是 AI 视觉助手</p>
                    <p className="text-xs text-white/15 mt-2 leading-relaxed">
                      我能<span className="text-cyan-400/60">看到</span>你摄像头中的画面，
                      <span className="text-amber-400/60">听懂</span>你的语音，
                      并用<span className="text-purple-400/60">自然语音</span>回复你
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5 justify-center">
                    {['你好！', '看看画面里有什么', '今天天气怎么样'].map(q => (
                      <Button key={q} variant="ghost" size="sm"
                        onClick={() => sendMessage(q)}
                        className="text-[11px] text-white/20 hover:text-cyan-400/60 hover:bg-cyan-500/[0.04] border border-white/[0.04] h-7 px-3 rounded-lg">
                        {q}
                      </Button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-4 pb-4">
                  {messages.map((msg) => (
                    <motion.div key={msg.id}
                      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: 'easeOut' }}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className="max-w-[72%]">
                        <div className={`flex items-center gap-1.5 mb-1.5 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                          {msg.role === 'assistant' && (
                            <div className="w-3.5 h-3.5 rounded-md bg-white/[0.04] border border-white/[0.04] flex items-center justify-center">
                              <Sparkles className="w-2 h-2 text-cyan-400/40" />
                            </div>
                          )}
                          <span className="text-[10px] text-white/15">
                            {msg.role === 'user' ? '你' : 'AI'}
                          </span>
                          {msg.mode === 'vision' && (
                            <span className="text-[9px] text-cyan-400/50">视觉</span>
                          )}
                          {msg.mode === 'voice' && (
                            <span className="text-[9px] text-amber-400/50">语音</span>
                          )}
                          <span className="text-[10px] text-white/8">
                            {msg.timestamp.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className={`px-3.5 py-2.5 rounded-xl text-sm leading-relaxed whitespace-pre-wrap ${
                          msg.role === 'user'
                            ? 'bg-white/[0.04] border border-white/[0.06] text-white/75'
                            : 'bg-white/[0.02] border border-white/[0.04] text-white/65'
                        }`}>
                          {msg.content}
                        </div>
                      </div>
                    </motion.div>
                  ))}

                  {/* AI 思考中 — 紫色弹跳点 */}
                  {isLoading && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                      <div className="bg-white/[0.02] border border-white/[0.04] rounded-xl px-4 py-3">
                        <div className="flex gap-1">
                          {[0, 1, 2].map(i => (
                            <motion.div key={i} className="w-1.5 h-1.5 rounded-full bg-purple-400/40"
                              animate={{ y: [0, -5, 0] }}
                              transition={{ duration: 0.7, repeat: Infinity, delay: i * 0.18 }} />
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                  <div ref={chatEndRef} />
                </div>
              )}
            </ScrollArea>

            {/* 输入区 */}
            <div className="px-5 py-3 border-t border-white/[0.04]">
              {asrText && (
                <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                  className="mb-2 p-2 rounded-lg bg-amber-500/[0.04] border border-amber-500/10">
                  <p className="text-[11px] text-white/35">
                    <span className="text-amber-400/60">语音识别：</span>{asrText}
                  </p>
                </motion.div>
              )}
              <form onSubmit={(e) => { e.preventDefault(); sendMessage() }}
                className="flex items-center gap-2">
                <div className="flex-1 relative">
                  <input
                    value={input} onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
                    placeholder={isCameraOn ? "输入消息，AI 会结合画面回答..." : "输入消息..."}
                    className="w-full bg-white/[0.03] border border-white/[0.06] rounded-lg px-4 py-2.5 text-sm text-white/70 placeholder:text-white/12 focus:outline-none focus:border-cyan-500/20 focus:ring-1 focus:ring-cyan-500/10 transition-all"
                    disabled={isLoading}
                  />
                  {isCameraOn && currentImage && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <Eye className="w-3.5 h-3.5 text-cyan-400/30" />
                    </div>
                  )}
                </div>
                <Button type="submit" disabled={!input.trim() || isLoading}
                  className="bg-white/[0.06] hover:bg-cyan-500/[0.12] border border-white/[0.08] hover:border-cyan-500/20 text-white/40 hover:text-cyan-400/70 rounded-lg px-4 h-10 disabled:opacity-20 disabled:hover:bg-white/[0.06] disabled:hover:text-white/40 disabled:hover:border-white/[0.08] state-transition">
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            </div>
          </Card>
        </div>
      </main>

      {/* ══════ 设置侧边栏 ══════ */}
      <AnimatePresence>
        {showSettings && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
              onClick={() => setShowSettings(false)} />
            <motion.div
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 220 }}
              className="fixed right-0 top-0 bottom-0 w-[300px] bg-background/95 backdrop-blur-2xl border-l border-white/[0.05] z-50 p-5 overflow-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-sm font-medium text-white/60">设置</h2>
                <Button variant="ghost" size="icon" onClick={() => setShowSettings(false)}
                  className="text-white/20 hover:text-white/50 h-7 w-7">
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div className="space-y-5">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs text-white/35">VAD 灵敏度</label>
                    <span className="text-[11px] text-cyan-400/60 font-mono">{vadThreshold}</span>
                  </div>
                  <Slider value={[vadThreshold]} onValueChange={(v) => setVadThreshold(Array.isArray(v) ? v[0] : v)}
                    min={5} max={40} step={1} />
                  <p className="text-[10px] text-white/12 mt-1.5">值越低越灵敏，建议 10-20</p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs text-white/35">帧采样间隔</label>
                    <span className="text-[11px] text-cyan-400/60 font-mono">{frameInterval}ms</span>
                  </div>
                  <Slider value={[frameInterval]} onValueChange={(v) => setFrameInterval(Array.isArray(v) ? v[0] : v)}
                    min={500} max={5000} step={100} />
                  <p className="text-[10px] text-white/12 mt-1.5">越低画面越实时，API 调用越多</p>
                </div>

                <Separator className="bg-white/[0.04]" />

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-white/35">语音回复</p>
                    <p className="text-[10px] text-white/12 mt-0.5">AI 回复时自动播放语音</p>
                  </div>
                  <Switch checked={isTtsOn} onCheckedChange={setIsTtsOn} />
                </div>

                <Separator className="bg-white/[0.04]" />

                <Button variant="ghost"
                  onClick={() => setCostStats({ vision: 0, text: 0, asr: 0, tts: 0, framesSent: 0, framesSkipped: 0 })}
                  className="w-full text-white/15 hover:text-white/40 hover:bg-white/[0.03] text-xs" size="sm">
                  <Trash2 className="w-3 h-3 mr-1" /> 重置统计
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
