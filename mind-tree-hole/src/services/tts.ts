/**
 * CosyVoice WebSocket 流式 TTS
 * 替代浏览器 SpeechSynthesis，实现自然音色 + 流式秒播
 */
import { getApiKey, DASHSCOPE_CONFIG } from '../config/dashscope'

interface StreamingTTSOptions {
  onStart?: () => void
  onEnd?: () => void
  onError?: (err: Error) => void
}

export interface StreamingTTSHandle {
  /** 喂入文本片段 */
  feed: (text: string) => void
  /** 通知服务端文本发送完毕 */
  flush: () => void
  /** 立即中断（关闭连接 + 停止播放） */
  abort: () => void
}

export function createStreamingTTS(options: StreamingTTSOptions): StreamingTTSHandle {
  const apiKey = getApiKey()
  if (!apiKey) {
    const err = new Error('缺少 API Key')
    options.onError?.(err)
    return { feed: () => {}, flush: () => {}, abort: () => {} }
  }

  const taskId = crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`
  let ws: WebSocket | null = null
  let audioCtx: AudioContext | null = null
  let isStarted = false
  let isFinished = false
  let isAborted = false

  // === 音频播放队列 ===
  const playQueue: AudioBuffer[] = []
  let isPlaying = false

  const playNext = () => {
    if (isAborted) return
    if (playQueue.length === 0) {
      isPlaying = false
      if (isFinished) {
        // 全部播完
        audioCtx?.close()
        audioCtx = null
        options.onEnd?.()
      }
      return
    }
    isPlaying = true
    const buffer = playQueue.shift()!
    const source = audioCtx!.createBufferSource()
    source.buffer = buffer
    source.connect(audioCtx!.destination)
    source.onended = () => playNext()
    source.start()
  }

  // === PCM 16-bit → AudioBuffer ===
  const pcmToAudioBuffer = (pcmData: ArrayBuffer): AudioBuffer | null => {
    if (!audioCtx) return null
    const int16 = new Int16Array(pcmData)
    const float32 = new Float32Array(int16.length)
    for (let i = 0; i < int16.length; i++) {
      float32[i] = int16[i] / 32768
    }
    const buf = audioCtx.createBuffer(1, float32.length, 24000)
    buf.getChannelData(0).set(float32)
    return buf
  }

  // === 连接 WebSocket ===
  const connect = () => {
    audioCtx = new AudioContext({ sampleRate: 24000 })

    ws = new WebSocket(DASHSCOPE_CONFIG.ttsWSEndpoint)
    ws.binaryType = 'arraybuffer'

    ws.onopen = () => {
      // 发送 run-task
      ws!.send(JSON.stringify({
        header: { action: 'run-task', task_id: taskId, streaming: 'duplex' },
        payload: {
          task_group: 'audio',
          task: 'tts',
          function: 'SpeechSynthesizer',
          model: DASHSCOPE_CONFIG.models.tts,
          parameters: {
            text_type: 'PlainText',
            voice: 'longxiaocheng',
            format: 'pcm',
            sample_rate: 24000,
            volume: 50,
            rate: 1.1,
            pitch: 1.0,
          },
          input: {},
        },
      }))
    }

    ws.onmessage = (event) => {
      if (isAborted) return

      // 二进制音频数据
      if (event.data instanceof ArrayBuffer) {
        const buffer = pcmToAudioBuffer(event.data)
        if (buffer) {
          playQueue.push(buffer)
          if (!isStarted) {
            isStarted = true
            options.onStart?.()
          }
          if (!isPlaying) playNext()
        }
        return
      }

      // JSON 控制消息
      try {
        const msg = JSON.parse(event.data as string)
        const header = msg.header

        if (header?.name === 'task-finished') {
          isFinished = true
          if (!isPlaying && playQueue.length === 0) {
            audioCtx?.close()
            audioCtx = null
            options.onEnd?.()
          }
        }
      } catch {
        // 忽略解析失败
      }
    }

    ws.onerror = () => {
      options.onError?.(new Error('CosyVoice WebSocket 连接失败'))
    }

    ws.onclose = () => {
      ws = null
    }
  }

  connect()

  return {
    feed: (text: string) => {
      if (isAborted || !ws || ws.readyState !== WebSocket.OPEN) return
      ws.send(JSON.stringify({
        header: { action: 'continue-task', task_id: taskId, streaming: 'duplex' },
        payload: { input: { text } },
      }))
    },

    flush: () => {
      if (isAborted || !ws || ws.readyState !== WebSocket.OPEN) return
      ws.send(JSON.stringify({
        header: { action: 'finish-task', task_id: taskId, streaming: 'duplex' },
        payload: { input: {} },
      }))
    },

    abort: () => {
      isAborted = true
      playQueue.length = 0
      isPlaying = false
      if (ws) {
        try { ws.close() } catch { /* 忽略 */ }
        ws = null
      }
      if (audioCtx) {
        audioCtx.close()
        audioCtx = null
      }
    },
  }
}
