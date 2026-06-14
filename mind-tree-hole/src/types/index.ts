export type AppMode = 'companion' | 'guidance' | 'meditation' | 'daily-power'

export type CallStatus = 'idle' | 'connecting' | 'listening' | 'thinking' | 'speaking'

export type AIState = 'idle' | 'listening' | 'thinking' | 'speaking'

export interface ConversationRound {
  id: string
  userText: string
  aiReply: string
  timestamp: number
}

export interface AppState {
  mode: AppMode
  callStatus: CallStatus
  cameraEnabled: boolean
  micEnabled: boolean
  showSettings: boolean
  showUserCamera: boolean
  aiState: AIState
  aiReplyText: string
  visionContext: string
  userText: string
}

export interface AppActions {
  setMode: (mode: AppMode) => void
  setCallStatus: (status: CallStatus) => void
  toggleCamera: () => void
  toggleMic: () => void
  setShowSettings: (show: boolean) => void
  toggleUserCamera: () => void
  setAiState: (state: AIState) => void
  setAiReplyText: (text: string) => void
  appendAiReplyText: (chunk: string) => void
  setVisionContext: (ctx: string) => void
  setUserText: (text: string) => void
}

export interface ConversationState {
  rounds: ConversationRound[]
  summary: string
}

export interface ConversationActions {
  addRound: (round: ConversationRound) => void
  setSummary: (summary: string) => void
  clearRounds: () => void
  getContextMessages: () => Array<{ role: 'system' | 'user' | 'assistant'; content: string }>
}

export const MODE_LABELS: Record<AppMode, string> = {
  'companion': '陪伴倾听',
  'guidance': '解惑指路',
  'meditation': '冥想放松',
  'daily-power': '每日力量',
}
