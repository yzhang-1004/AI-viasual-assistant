const STORAGE_KEY = 'mindtree_dashscope_key'
// 安全提示：请勿在代码中硬编码 API Key，使用设置面板或 .env 文件配置
const DEFAULT_KEY = ''

export function getApiKey(): string {
  return (
    localStorage.getItem(STORAGE_KEY) ||
    (import.meta.env.VITE_DASHSCOPE_API_KEY as string) ||
    DEFAULT_KEY
  )
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
