/**
 * 浏览器 Speech API 封装
 * MVP 阶段使用浏览器原生能力，后续替换为灵积 ASR/TTS
 */

// 浏览器 Speech API 类型声明（非标准，仅在 Chrome/Edge 支持）
export interface BrowserSpeechRecognition extends EventTarget {
  lang: string
  interimResults: boolean
  continuous: boolean
  maxAlternatives: number
  start(): void
  stop(): void
  abort(): void
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null
  onend: (() => void) | null
}

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList
  resultIndex: number
}

interface SpeechRecognitionResultList {
  length: number
  [index: number]: SpeechRecognitionResult
}

interface SpeechRecognitionResult {
  isFinal: boolean
  length: number
  [index: number]: SpeechRecognitionAlternative
}

interface SpeechRecognitionAlternative {
  transcript: string
  confidence: number
}

interface SpeechRecognitionErrorEvent {
  error: string
  message: string
}

type SpeechRecognitionConstructor = new () => BrowserSpeechRecognition

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor
    webkitSpeechRecognition?: SpeechRecognitionConstructor
  }
}

// 检查浏览器是否支持 SpeechRecognition
export function isSpeechRecognitionSupported(): boolean {
  return !!(window.SpeechRecognition || window.webkitSpeechRecognition)
}

// 检查浏览器是否支持 SpeechSynthesis
export function isSpeechSynthesisSupported(): boolean {
  return !!window.speechSynthesis
}

/**
 * 创建语音识别实例
 */
export function createSpeechRecognition(lang = 'zh-CN'): BrowserSpeechRecognition | null {
  const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition
  if (!Ctor) return null

  const recognition = new Ctor()
  recognition.lang = lang
  recognition.interimResults = true
  recognition.continuous = true
  recognition.maxAlternatives = 1

  return recognition
}

/**
 * 使用浏览器 TTS 朗读文本
 * 返回一个 Promise，朗读完成时 resolve
 */
export function speakText(text: string, options?: { rate?: number; pitch?: number; voice?: SpeechSynthesisVoice }): Promise<void> {
  return new Promise((resolve) => {
    if (!window.speechSynthesis) {
      resolve()
      return
    }

    // 取消当前正在播放的语音
    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'zh-CN'
    utterance.rate = options?.rate ?? 1.0
    utterance.pitch = options?.pitch ?? 1.0

    if (options?.voice) {
      utterance.voice = options.voice
    } else {
      // 尝试找一个中文语音
      const voices = window.speechSynthesis.getVoices()
      const zhVoice = voices.find(v => v.lang.startsWith('zh')) || voices[0]
      if (zhVoice) utterance.voice = zhVoice
    }

    utterance.onend = () => resolve()
    utterance.onerror = () => resolve()

    window.speechSynthesis.speak(utterance)
  })
}

/**
 * 停止浏览器 TTS
 */
export function stopSpeaking(): void {
  window.speechSynthesis?.cancel()
}

/**
 * 获取中文语音列表
 */
export function getChineseVoices(): SpeechSynthesisVoice[] {
  return window.speechSynthesis?.getVoices().filter(v => v.lang.startsWith('zh')) || []
}
