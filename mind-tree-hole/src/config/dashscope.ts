const STORAGE_KEY = 'mindtree_dashscope_key'
const DEFAULT_KEY = 'sk-8c54c7fd5f124e42a2baaab5a926b2d6'

export function getApiKey(): string {
  return localStorage.getItem(STORAGE_KEY) || DEFAULT_KEY
}

export function setApiKey(key: string): void {
  localStorage.setItem(STORAGE_KEY, key)
}

export function clearApiKey(): void {
  localStorage.removeItem(STORAGE_KEY)
}

export function hasApiKey(): boolean {
  return getApiKey().length > 0
}

// 灵积 DashScope API 端点
export const DASHSCOPE_CONFIG = {
  llmEndpoint: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
  asrWSEndpoint: 'wss://dashscope.aliyuncs.com/api-ws/v1/inference',
  ttsWSEndpoint: 'wss://dashscope.aliyuncs.com/api-ws/v1/inference',
  visionEndpoint: 'https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation',

  models: {
    llm: 'qwen-plus',
    llmMax: 'qwen-max',
    asr: 'fun-asr',
    tts: 'cosyvoice-v1',
    vision: 'qwen-vl-max',
  },
} as const
