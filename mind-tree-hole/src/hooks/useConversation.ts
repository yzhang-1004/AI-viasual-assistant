import { useCallback, useRef } from 'react'
import { useAppStore, useConversationStore } from '../stores/appStore'
import { streamLLM } from '../services/llm'
import { speakText, stopSpeaking, createSpeechRecognition, isSpeechRecognitionSupported } from '../services/speech'
import { buildSystemPrompt, getL0Response } from '../utils/prompts'
import type { BrowserSpeechRecognition } from '../services/speech'

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
  const isProcessingRef = useRef(false)
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastUserTextRef = useRef('')

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
      await speakText(l0Response)
      setAiState('listening')
      isProcessingRef.current = false
      return
    }

    // L2: 云端 LLM
    setAiState('thinking')
    setAiReplyText('')

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
        },
        onDone: async (fullText: string) => {
          addRound({
            id: Date.now().toString(),
            userText: trimmed,
            aiReply: fullText,
            timestamp: Date.now(),
          })

          // 朗读回复
          await speakText(fullText)

          setAiState('listening')
          isProcessingRef.current = false

          // 冥想模式：朗读完回到倾听状态
          if (mode === 'meditation') {
            setTimeout(() => setAiState('listening'), 500)
          }
        },
        onError: (error: Error) => {
          console.error('LLM 错误:', error)
          setAiReplyText(`抱歉，出了点问题：${error.message}`)
          setAiState('idle')
          isProcessingRef.current = false
        },
      })

      abortRef.current = controller
    } catch (err) {
      console.error('对话处理异常:', err)
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
