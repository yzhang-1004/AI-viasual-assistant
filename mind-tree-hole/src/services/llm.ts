import { getApiKey, DASHSCOPE_CONFIG } from '../config/dashscope'

interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface StreamCallbacks {
  onToken: (token: string) => void
  onDone: (fullText: string) => void
  onError: (error: Error) => void
}

/**
 * 灵积 LLM 流式调用（OpenAI 兼容接口）
 */
export async function streamLLM(
  messages: ChatMessage[],
  callbacks: StreamCallbacks,
  options?: { model?: string; temperature?: number; maxTokens?: number },
): Promise<AbortController> {
  const apiKey = getApiKey()
  if (!apiKey) {
    callbacks.onError(new Error('请先在设置中配置灵积 API Key'))
    return new AbortController()
  }

  const controller = new AbortController()
  const { onToken, onDone, onError } = callbacks
  const model = options?.model || DASHSCOPE_CONFIG.models.llm

  try {
    const response = await fetch(DASHSCOPE_CONFIG.llmEndpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        stream: true,
        temperature: options?.temperature ?? 0.85,
        max_tokens: options?.maxTokens ?? 512,
        top_p: 0.9,
      }),
      signal: controller.signal,
    })

    if (!response.ok) {
      const errBody = await response.text().catch(() => '')
      throw new Error(`API 请求失败 (${response.status}): ${errBody}`)
    }

    const reader = response.body?.getReader()
    if (!reader) throw new Error('无法读取流式响应')

    const decoder = new TextDecoder()
    let fullText = ''
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })

      // 解析 SSE 事件
      const lines = buffer.split('\n')
      buffer = lines.pop() || '' // 不完整的行保留到下次

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed || !trimmed.startsWith('data:')) continue

        const dataStr = trimmed.slice(5).trim()
        if (dataStr === '[DONE]') continue

        try {
          const json = JSON.parse(dataStr)
          const delta = json.choices?.[0]?.delta?.content
          if (delta) {
            fullText += delta
            onToken(delta)
          }
        } catch {
          // 跳过无法解析的行
        }
      }
    }

    onDone(fullText)
  } catch (err) {
    if ((err as Error).name === 'AbortError') return controller
    onError(err instanceof Error ? err : new Error(String(err)))
  }

  return controller
}

/**
 * 非流式 LLM 调用（用于摘要生成等场景）
 */
export async function callLLM(
  messages: ChatMessage[],
  options?: { model?: string; temperature?: number; maxTokens?: number },
): Promise<string> {
  const apiKey = getApiKey()
  if (!apiKey) throw new Error('请先在设置中配置灵积 API Key')

  const model = options?.model || DASHSCOPE_CONFIG.models.llm

  const response = await fetch(DASHSCOPE_CONFIG.llmEndpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      stream: false,
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens ?? 256,
    }),
  })

  if (!response.ok) {
    const errBody = await response.text().catch(() => '')
    throw new Error(`API 请求失败 (${response.status}): ${errBody}`)
  }

  const json = await response.json()
  return json.choices?.[0]?.message?.content || ''
}
