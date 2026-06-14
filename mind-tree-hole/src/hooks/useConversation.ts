import { useCallback, useRef } from 'react'
import { useAppStore, useConversationStore } from '../stores/appStore'
import { streamLLM } from '../services/llm'
import { speakText, stopSpeaking, createSpeechRecognition, isSpeechRecognitionSupported } from '../services/speech'
import { createStreamingTTS } from '../services/tts'
import type { StreamingTTSHandle } from '../services/tts'
import { buildSystemPrompt, getL0Response } from '../utils/prompts'
import type { BrowserSpeechRecognition } from '../services/speech'

/** 移除所有 emoji，防止 TTS 逐字朗读表情符号 */
const EMOJI_REGEX = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{200D}\u{20E3}\u{238C}\u{23CF}\u{23E9}-\u{23F3}\u{23F8}-\u{23FA}\u{2B50}\u{2B55}\u{3030}\u{303D}\u{3297}\u{3299}]/gu
const stripEmoji = (text: string) => text.replace(EMOJI_REGEX, '')

// 重新导出类型以便其他模块使用
export type { BrowserSpeechRecognition }

export function useConversation() {
  const mode = useAppStore((s) => s.mode)
  const setCallStatus = useAppStore((s) => s.setCallStatus)
  const setAiState = useAppStore((s) => s.setAiState)
  const setAiReplyText = useAppStore((s) => s.setAiReplyText)
  const appendAiReplyText = useAppStore((s) => s.appendAiReplyText)
  const visionContext = useAppStore((s) => s.visionContext)
  const addRound = useConversationStore((s) => s.addRound)
  const getContextMessages = useConversationStore((s) => s.getContextMessages)

  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const ttsHandleRef = useRef<StreamingTTSHandle | null>(null)
  const isProcessingRef = useRef(false)
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastUserTextRef = useRef('')
  const isTtsSpeakingRef = useRef(false) // TTS 朗读期间暂停语音识别，防止语音回路

  /**
   * TTS 朗读前暂停语音识别
   */
  const pauseRecognitionForTTS = () => {
    isTtsSpeakingRef.current = true
    if (recognitionRef.current) {
      try { recognitionRef.current.stop() } catch { /* 忽略 */ }
    }
  }

  /**
   * TTS 朗读结束后恢复语音识别
   */
  const resumeRecognitionAfterTTS = () => {
    isTtsSpeakingRef.current = false
    if (recognitionRef.current && useAppStore.getState().callStatus !== 'idle') {
      // 延迟一点再启动，避免 TTS 结束瞬间的音箱回声
      setTimeout(() => {
        try { recognitionRef.current?.start() } catch { /* 忽略 */ }
      }, 300)
    }
  }

  /**
   * 处理用户输入文本
   */
  const processUserInput = useCallback(async (userText: string) => {
    const trimmed = userText.trim()
    if (!trimmed || isProcessingRef.current) return

    isProcessingRef.current = true
    lastUserTextRef.current = trimmed

    // L0: 规则引擎快速响应
    const l0Response = getL0Response(trimmed)
    if (l0Response) {
      setAiState('speaking')
      setAiReplyText(l0Response)
      addRound({
        id: Date.now().toString(),
        userText: trimmed,
        aiReply: l0Response,
        timestamp: Date.now(),
      })
      // TTS 朗读前暂停语音识别，防止语音回路
      pauseRecognitionForTTS()
      await speakText(stripEmoji(l0Response))
      resumeRecognitionAfterTTS()
      setAiState('listening')
      isProcessingRef.current = false
      return
    }

    // L2: 云端 LLM
    setAiState('thinking')
    setAiReplyText('')

    // 创建 CosyVoice 流式 TTS（降级时会回退到浏览器 TTS）
    let ttsFailed = false
    const tts = createStreamingTTS({
      onEnd: () => {
        resumeRecognitionAfterTTS()
        setAiState('listening')
        isProcessingRef.current = false
        ttsHandleRef.current = null
      },
      onError: (err: Error) => {
        ttsFailed = true
        console.warn('CosyVoice 不可用，降级到浏览器 TTS:', err.message)
        ttsHandleRef.current = null
      },
    })
    ttsHandleRef.current = tts

    const systemPrompt = buildSystemPrompt(mode, visionContext)
    const history = getContextMessages()
    const messages = [
      { role: 'system' as const, content: systemPrompt },
      ...history,
      { role: 'user' as const, content: trimmed },
    ]

    try {
      const controller = await streamLLM(messages, {
        onToken: (token: string) => {
          setAiState('speaking')
          appendAiReplyText(token)
          // 流式喂入 TTS（过滤 emoji 防止朗读表情符号）
          if (!ttsFailed) {
            tts.feed(stripEmoji(token))
          }
          // TTS 可能立即开始播放，暂停语音识别
          if (!isTtsSpeakingRef.current) {
            pauseRecognitionForTTS()
          }
        },
        onDone: async (fullText: string) => {
          addRound({
            id: Date.now().toString(),
            userText: trimmed,
            aiReply: fullText,
            timestamp: Date.now(),
          })

          if (ttsFailed) {
            // 降级：使用浏览器 TTS 朗读全文（过滤 emoji）
            pauseRecognitionForTTS()
            await speakText(stripEmoji(fullText))
            resumeRecognitionAfterTTS()
            setAiState('listening')
            isProcessingRef.current = false
            ttsHandleRef.current = null
          } else {
            // CosyVoice 流式：通知结束，onEnd 回调会处理恢复
            tts.flush()
          }
        },
        onError: (error: Error) => {
          console.error('LLM 错误:', error)
          ttsHandleRef.current?.abort()
          ttsHandleRef.current = null
          setAiReplyText(`抱歉，出了点问题：${error.message}`)
          setAiState('idle')
          isProcessingRef.current = false
        },
      })

      abortRef.current = controller
    } catch (err) {
      console.error('对话处理异常:', err)
      ttsHandleRef.current?.abort()
      ttsHandleRef.current = null
      setAiState('idle')
      isProcessingRef.current = false
    }
  }, [mode, visionContext, getContextMessages, addRound, setAiState, setAiReplyText, appendAiReplyText])

  /**
   * 打断当前 AI 回复
   */
  const interruptAI = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort()
      abortRef.current = null
    }
    ttsHandleRef.current?.abort()
    ttsHandleRef.current = null
    stopSpeaking()
    setAiState('listening')
    isProcessingRef.current = false
  }, [setAiState])

  /**
   * 启动语音监听
   */
  const startListening = useCallback(() => {
    if (!isSpeechRecognitionSupported()) {
      console.warn('浏览器不支持语音识别')
      return
    }

    const recognition = createSpeechRecognition('zh-CN')
    if (!recognition) return

    recognitionRef.current = recognition

    // 识别结果回调
    recognition.onresult = (event) => {
      // TTS 朗读期间忽略所有识别结果，防止语音回路
      if (isTtsSpeakingRef.current) return

      let interim = ''
      let final = ''

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        if (result.isFinal) {
          final += result[0]?.transcript || ''
        } else {
          interim += result[0]?.transcript || ''
        }
      }

      // 有最终结果时触发 LLM
      if (final.trim()) {
        // 重置静音计时器
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current)
          silenceTimerRef.current = null
        }

        // 打断当前 AI
        if (isProcessingRef.current) {
          interruptAI()
        }

        processUserInput(final)
      }

      // 用临时结果更新静音计时器（"预测性预填"逻辑）
      if (interim.trim()) {
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current)
        }
        // 0.8秒静音后触发
        silenceTimerRef.current = setTimeout(() => {
          if (interim.trim() && !isProcessingRef.current) {
            processUserInput(interim)
          }
        }, 800)
      }
    }

    // 识别结束自动重启
    recognition.onend = () => {
      // TTS 朗读期间不自动重启
      if (isTtsSpeakingRef.current) return
      // 如果仍在通话状态，自动重启识别
      if (useAppStore.getState().callStatus !== 'idle') {
        try { recognition.start() } catch { /* 忽略 */ }
      }
    }

    // 错误处理
    recognition.onerror = (event) => {
      console.warn('语音识别错误:', event.error)
      if (event.error === 'not-allowed') {
        setCallStatus('idle')
        setAiState('idle')
      }
    }

    try {
      recognition.start()
      setCallStatus('listening')
      setAiState('listening')
    } catch {
      console.warn('语音识别启动失败')
    }
  }, [processUserInput, interruptAI, setCallStatus, setAiState])

  /**
   * 停止语音监听
   */
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop() } catch { /* 忽略 */ }
      recognitionRef.current = null
    }
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current)
      silenceTimerRef.current = null
    }
    interruptAI()
    setCallStatus('idle')
    setAiState('idle')
    setAiReplyText('')
  }, [interruptAI, setCallStatus, setAiState, setAiReplyText])

  /**
   * 切换通话状态
   */
  const toggleCall = useCallback(() => {
    const currentStatus = useAppStore.getState().callStatus
    if (currentStatus === 'idle') {
      startListening()
    } else {
      stopListening()
    }
  }, [startListening, stopListening])

  /**
   * 文本输入模式（备选）
   */
  const sendText = useCallback((text: string) => {
    if (isProcessingRef.current) {
      interruptAI()
    }
    processUserInput(text)
  }, [processUserInput, interruptAI])

  return {
    toggleCall,
    sendText,
    interruptAI,
    startListening,
    stopListening,
  }
}
