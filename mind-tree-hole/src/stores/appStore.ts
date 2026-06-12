import { create } from 'zustand'
import type { AppMode, AppState, AppActions, CallStatus, AIState, ConversationRound, ConversationState, ConversationActions } from '../types'

export const useAppStore = create<AppState & AppActions>((set) => ({
  mode: 'companion',
  callStatus: 'idle' as CallStatus,
  cameraEnabled: false,
  micEnabled: false,
  showSettings: false,
  showUserCamera: true,
  aiState: 'idle' as AIState,
  aiReplyText: '',
  visionContext: '',

  setMode: (mode: AppMode) => set({ mode }),
  setCallStatus: (callStatus: CallStatus) => set({ callStatus }),
  toggleCamera: () => set((s) => ({ cameraEnabled: !s.cameraEnabled })),
  toggleMic: () => set((s) => ({ micEnabled: !s.micEnabled })),
  setShowSettings: (show: boolean) => set({ showSettings: show }),
  toggleUserCamera: () => set((s) => ({ showUserCamera: !s.showUserCamera })),
  setAiState: (aiState: AIState) => set({ aiState }),
  setAiReplyText: (aiReplyText: string) => set({ aiReplyText }),
  appendAiReplyText: (chunk: string) => set((s) => ({ aiReplyText: s.aiReplyText + chunk })),
  setVisionContext: (visionContext: string) => set({ visionContext }),
}))

export const useConversationStore = create<ConversationState & ConversationActions>((set, get) => ({
  rounds: [],
  summary: '',

  addRound: (round: ConversationRound) =>
    set((s) => ({ rounds: [...s.rounds, round] })),

  setSummary: (summary: string) => set({ summary }),

  clearRounds: () => set({ rounds: [], summary: '' }),

  getContextMessages: () => {
    const { rounds, summary } = get()
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = []
    if (summary) {
      messages.push({ role: 'system', content: `[对话历史摘要]：${summary}` })
    }
    for (const r of rounds.slice(-20)) {
      messages.push({ role: 'user', content: r.userText })
      messages.push({ role: 'assistant', content: r.aiReply })
    }
    return messages
  },
}))
