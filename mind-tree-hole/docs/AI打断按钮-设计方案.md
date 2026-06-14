# AI 打断按钮 — 设计方案

## 问题

AI 说话时语音识别被暂停（防止回路），用户无法用语音打断，需要一个手动按钮。

## 方案：麦克风按钮变身"打断"按钮

不用新增独立按钮，而是利用现有的中央麦克风按钮，在 AI 说话时自动切换到"打断"模式：

```
AI 倾听中 → 麦克风按钮（正常，点击可挂断）
AI 说话中 → 同一个按钮自动变成"打断"按钮（红色脉冲光圈，点击打断AI，恢复倾听）
```

这符合视频通话直觉——打电话时对方在说话，点同一个按钮打断他。

## 改动范围

| 文件 | 改动 |
|------|------|
| `MicButton.tsx` | ~15 行：新增 `speaking` 模式 + 打断图标 |
| `BottomControlBar.tsx` | ~2 行：传入 `interruptAI` |

## 交互逻辑

```
                       ┌────────────────────┐
用户点击开始  ──────→  │   aiState: listening  │  麦克风 : 琥珀色声波纹
  (toggleCall)        │   callStatus: listening│
                       └────────┬───────────┘
                                │ 用户说完
                                ▼
                       ┌────────────────────┐
                       │   aiState: thinking   │  麦克风 : 紫色等待态
                       └────────┬───────────┘
                                │ LLM 开始输出
                                ▼
                       ┌────────────────────┐
                       │   aiState: speaking   │  ★ 麦克风变身打断按钮
                       │                     │    红色脉冲光圈
                       │   点击 → interruptAI │    "打断"标签
                       │   → 立即停止TTS      │
                       │   → 恢复语音识别     │
                       │   → aiState: listening│
                       └────────────────────┘
```

## UI 设计

**打断态**（aiState === 'speaking'）：

- 按钮背景色：`bg-red-500/20`
- 边框：`border-red-400/60`
- 光晕：红色脉冲 `shadow-[0_0_30px_rgba(239,68,68,0.4)]`
- 图标：方块「停止」图标（□），而非麦克风
- 底部文字：`"点击打断"`
- 尺寸不变（w-16 h-16），位置不变

## 代码改动（伪代码）

```tsx
// MicButton.tsx
export default function MicButton() {
  const aiState = useAppStore(s => s.aiState)
  const callStatus = useAppStore(s => s.callStatus)
  const { toggleCall, interruptAI } = useConversation()

  const isSpeaking = aiState === 'speaking'
  const isActive = callStatus !== 'idle'

  const handleClick = () => {
    if (isSpeaking) {
      interruptAI()          // 打断 TTS + 中断 LLM
      // 注意：interruptAI 完成后 aiState 回到 listening，
      // 语音识别在 interruptAI 中已恢复
    } else {
      toggleCall()
    }
  }

  // 图标：说话态用"停止"方块，其他用麦克风
  // 颜色：说话态红色，其他琥珀色
  // 文字：说话态"点击打断"，其他"点击开始/结束"
}
```

## 与现有机制的配合

`interruptAI()` 已实现（`useConversation.ts:139`）：
- `abortRef.current.abort()` → 中断 LLM 流式请求
- `stopSpeaking()` → 停止浏览器 TTS 播放
- `setAiState('listening')` → 恢复倾听状态
- `isProcessingRef.current = false` → 重置处理锁

打断后语音识别自动恢复（`recognition.onend` 会触发 `recognition.start()`），无需额外处理。
