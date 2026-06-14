# CosyVoice WebSocket 流式 TTS — 实施方案

## 目标

把 AI 回复的朗读从浏览器 `SpeechSynthesis`（机械音、等全文）替换为灵积 CosyVoice WebSocket（自然音色、流式秒播）。

## 难度评估

**中等偏低**。核心工作是 WebSocket 通信 + AudioContext 播放 PCM，没有复杂算法。

| 维度 | 评估 |
|------|------|
| 新增文件 | 1 个（`src/services/tts.ts`） |
| 修改文件 | 3 个（`useConversation.ts`, `speech.ts`, 标记浏览器 TTS 为降级方案） |
| 新增依赖 | 0（浏览器原生 `WebSocket` + `AudioContext`） |
| 代码量 | ~120 行 |
| 开发时间 | 约 30 分钟 |

---

## CosyVoice WebSocket 协议（已确认）

```
Client                                    Server
  │                                          │
  │── connect(wss://.../api-ws/v1/inference)─│
  │   header: Authorization Bearer <key>     │
  │                                          │
  │── run-task ──────────────────────────────│
  │   { model: "cosyvoice-v1",               │
  │     voice: "longxiaocheng",              │
  │     format: "pcm", sample_rate: 24000 }  │
  │                                          │
  │◄─ task-started ──────────────────────────│
  │                                          │
  │── continue-task { text: "今天心情..." } ──│
  │                                          │
  │◄─ binary PCM audio (完整句子时) ────────│
  │                                          │
  │── continue-task { text: "..." } ─────────│  可以多次发送
  │◄─ binary PCM audio ─────────────────────│
  │                                          │
  │── finish-task ───────────────────────────│
  │◄─ binary PCM audio (最后缓存的内容) ────│
  │◄─ task-finished ────────────────────────│
  │                                          │
  │── close ─────────────────────────────────│
```

**关键利好**：服务端自动分句！发送文本片段后，服务端会缓存直到形成完整句子才返回音频。不需要我们在前端做句子切分。

---

## 改动详情

### 1. 新建 `src/services/tts.ts`

封装 CosyVoice WebSocket 连接 → 发送文本 → 接收 PCM → 播放的完整流程。

```ts
// 核心函数签名
export function createStreamingTTS(options: {
  onStart?: () => void           // 开始播放首段音频时回调
  onEnd?: () => void            // 全部播放完毕时回调
  onError?: (err: Error) => void
}): {
  feed(text: string): void       // 喂入文本片段
  flush(): void                  // 发送 finish-task，通知结束
  abort(): void                  // 打断：关闭连接 + 停止播放
}
```

**播放策略**：使用 `AudioContext`，收到 PCM 数据后创建 `AudioBuffer`，用队列保证顺序播放。

**WebSocket 消息格式示例**：

```json
// run-task
{
  "header": { "action": "run-task", "task_id": "<uuid>", "streaming": "duplex" },
  "payload": {
    "task_group": "audio", "task": "tts", "function": "SpeechSynthesizer",
    "model": "cosyvoice-v1",
    "parameters": {
      "text_type": "PlainText",
      "voice": "longxiaocheng",
      "format": "pcm",
      "sample_rate": 24000
    },
    "input": {}
  }
}

// continue-task
{
  "header": { "action": "continue-task", "task_id": "<same uuid>", "streaming": "duplex" },
  "payload": { "input": { "text": "今天心情不太好..." } }
}

// finish-task
{
  "header": { "action": "finish-task", "task_id": "<same uuid>", "streaming": "duplex" },
  "payload": { "input": {} }
}
```

### 2. 修改 `src/hooks/useConversation.ts`

改动核心：把"等全文 → 一次性 TTS"改为"边收 token → 边喂 TTS"。

```
改前（浏览器 TTS）：
  onToken: appendText
  onDone:  speakText(全文) → 等全文播完

改后（CosyVoice）：
  onToken: appendText + tts.feed(token)    ← 流式喂入
  onDone:  tts.flush() → 等待全部播完
```

**伪代码改动**：

```ts
// 在 processUserInput 的 streamLLM 回调中：
const tts = createStreamingTTS({
  onEnd: () => {
    resumeRecognitionAfterTTS()
    setAiState('listening')
    isProcessingRef.current = false
  },
  onError: (err) => {
    // 降级：WebSocket 失败时回退到浏览器 TTS
    speakText(fullText).then(/* 原有逻辑 */)
  },
})

// onToken
pauseRecognitionForTTS()  // TTS 开始前暂停语音识别
tts.feed(token)

// onDone
addRound(...)
tts.flush()  // 不再 await speakText
```

### 3. 保留 `speech.ts` 中的浏览器 TTS

作为降级方案：CosyVoice 连接失败时，自动回退到 `speakText()`。已有函数不删。

### 4. 配置项（`dashscope.ts` 已就绪）

当前配置直接用，无需改动：

```ts
ttsWSEndpoint: 'wss://dashscope.aliyuncs.com/api-ws/v1/inference'
tts: 'cosyvoice-v1'  // 当前配置
```

可选升级：`cosyvoice-v3-flash` 音质更好但价格更高，先用 v1。

**音色选择**：
- `longxiaocheng` — 温暖男声（推荐，"树洞"风格契合）
- `longxiaochun` — 温柔女声（备选）

---

## 音频播放技术细节

```
WebSocket 收到 Binary Message
  → ArrayBuffer（PCM 16-bit little-endian, 24000Hz, mono）
  → 转换为 Float32Array（AudioBuffer 要求 -1~1）
  → AudioContext.createBuffer(1, samples, 24000)
  → 放入播放队列
  → 前一段播完自动播下一段
```

---

## 风险与对策

| 风险 | 对策 |
|------|------|
| WebSocket 连接失败 | 自动降级到浏览器 TTS |
| API Key 无效 | 同上降级 |
| 网络断开 | `onerror` 捕获，降级 |
| 音频格式兼容 | PCM 16-bit 是通用格式，所有浏览器 AudioContext 支持 |
| 打断时 WebSocket 未关闭 | `abort()` 中 `ws.close()` + 清空播放队列 |

---

## 对比总结

| 维度 | 改前（浏览器 TTS） | 改后（CosyVoice） |
|------|-------------------|-------------------|
| 音色 | 机械、单一 | 温暖自然（longxiaocheng） |
| 首音延迟 | LLM 全文完成后才播 | LLM 第一句话完成即播 |
| 流式 | ❌ | ✅ 边生成边朗读 |
| 降级 | — | WebSocket 失败自动回退浏览器 TTS |
| 新增依赖 | — | 零（原生 WebSocket + AudioContext） |
