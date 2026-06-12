# AI 视觉对话助手 — UI 升级 & 语音闭环改造执行说明书

> **目标读者**：AI 编程助手  
> **项目路径**：`d:\AIprogram\`  
> **技术栈**：Next.js 16 + TypeScript + Tailwind CSS 4 + shadcn/ui + 阿里云灵积 DashScope  
> **任务**：按本说明书逐文件修改，完成 UI 视觉升级 + 语音对话闭环修复

---

## 一、核心问题诊断

### 问题1：UI 缺乏视觉冲击力
当前页面为深色底但缺乏氛围感，需要：渐变光晕背景 + 浮动粒子 + 微动效 + 玻璃拟态卡片。

### 问题2：说话后 AI 不语音回复
**根因**：数据流断路，`语音 → ASR → 文字 → LLM → 文字显示 → ❌ 结束`，缺少最后一环 TTS。  
**修复**：改为 `语音 → ASR → 文字 → LLM → 文字显示 → 自动 TTS → 🔊 语音播放`。

---

## 二、需要修改的文件清单

| 序号 | 文件路径 | 操作 | 说明 |
|------|---------|------|------|
| 1 | `src/app/globals.css` | 替换 | 暗色科技风主题变量 + 自定义滚动条 |
| 2 | `src/app/layout.tsx` | 替换 | 标题改为中文、lang 改 zh-CN |
| 3 | `src/lib/dashscope.ts` | 替换 | TTS 改用 OpenAI 兼容接口 |
| 4 | `src/app/api/vision-chat/route.ts` | 替换 | 无大改，保持现有逻辑 |
| 5 | `src/app/api/asr/route.ts` | 替换 | 无大改，保持现有逻辑 |
| 6 | `src/app/api/tts/route.ts` | 替换 | 无大改，保持现有逻辑 |
| 7 | `src/app/page.tsx` | 替换 | **核心重写**：UI 大改 + 15 项设计细节 + 语音闭环 |
| 8 | `src/components/ui/slider.tsx` | 新增 | 设置面板滑块组件 |
| 9 | `src/components/ui/switch.tsx` | 新增 | 语音开关组件 |

---

## 三、前置操作：安装依赖

在项目根目录执行：

```bash
npm install framer-motion lucide-react
npx shadcn@latest add slider switch
```

如果 `shadcn add` 执行失败，则手动创建（代码见下方第八、九节）。

---

## 四、逐文件完整代码

### 文件1：`src/app/globals.css`

```css
@import "tailwindcss";
@import "tw-animate-css";

@custom-variant dark (&:is(.dark *));

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);
  --color-sidebar-ring: var(--sidebar-ring);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar: var(--sidebar);
  --color-chart-5: var(--chart-5);
  --color-chart-4: var(--chart-4);
  --color-chart-3: var(--chart-3);
  --color-chart-2: var(--chart-2);
  --color-chart-1: var(--chart-1);
  --color-ring: var(--ring);
  --color-input: var(--input);
  --color-border: var(--border);
  --color-destructive: var(--destructive);
  --color-accent-foreground: var(--accent-foreground);
  --color-accent: var(--accent);
  --color-muted-foreground: var(--muted-foreground);
  --color-muted: var(--muted);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-secondary: var(--secondary);
  --color-primary-foreground: var(--primary-foreground);
  --color-primary: var(--primary);
  --color-popover-foreground: var(--popover-foreground);
  --color-popover: var(--popover);
  --color-card-foreground: var(--card-foreground);
  --color-card: var(--card);
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
}

:root {
  --radius: 0.625rem;
  --background: oklch(0.08 0.02 260);
  --foreground: oklch(0.95 0.01 260);
  --card: oklch(0.1 0.02 260);
  --card-foreground: oklch(0.95 0.01 260);
  --popover: oklch(0.1 0.02 260);
  --popover-foreground: oklch(0.95 0.01 260);
  --primary: oklch(0.65 0.2 220);
  --primary-foreground: oklch(0.98 0 0);
  --secondary: oklch(0.2 0.02 260);
  --secondary-foreground: oklch(0.95 0.01 260);
  --muted: oklch(0.2 0.02 260);
  --muted-foreground: oklch(0.6 0.01 260);
  --accent: oklch(0.2 0.02 260);
  --accent-foreground: oklch(0.95 0.01 260);
  --destructive: oklch(0.5 0.2 25);
  --border: oklch(1 0 0 / 8%);
  --input: oklch(1 0 0 / 12%);
  --ring: oklch(0.65 0.2 220);
  --chart-1: oklch(0.65 0.2 220);
  --chart-2: oklch(0.6 0.17 162);
  --chart-3: oklch(0.7 0.19 70);
  --chart-4: oklch(0.6 0.26 304);
  --chart-5: oklch(0.65 0.25 16);
  --sidebar: oklch(0.1 0.02 260);
  --sidebar-foreground: oklch(0.95 0.01 260);
  --sidebar-primary: oklch(0.65 0.2 220);
  --sidebar-primary-foreground: oklch(0.98 0 0);
  --sidebar-accent: oklch(0.2 0.02 260);
  --sidebar-accent-foreground: oklch(0.95 0.01 260);
  --sidebar-border: oklch(1 0 0 / 8%);
  --sidebar-ring: oklch(0.65 0.2 220);
}

@layer base {
  * {
    @apply border-border outline-ring/50;
  }
  body {
    @apply bg-background text-foreground;
  }
}

::-webkit-scrollbar {
  width: 4px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.08);
  border-radius: 4px;
}
::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.15);
}
```

---

### 文件2：`src/app/layout.tsx`

```tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AI 视觉助手",
  description: "多模态 AI 视觉对话助手，支持摄像头识别、语音对话、文字交互",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
```

---

### 文件3：`src/lib/dashscope.ts`

```typescript
/**
 * DashScope API Client
 * 阿里云灵积 API 封装 - LLM / VLM / ASR / TTS
 */

const BASE_URL = "https://dashscope.aliyuncs.com/compatible-mode/v1";

function getApiKey(): string {
  const key = process.env.DASHSCOPE_API_KEY;
  if (!key) throw new Error("DASHSCOPE_API_KEY 未配置");
  return key;
}

function cleanResponse(text: string): string {
  return text.replace(/<think[\s\S]*?<\/think>/g, "").trim();
}

/** LLM 文字对话 */
export async function chatCompletion(
  messages: Array<{ role: string; content: string }>,
  options?: { temperature?: number; maxTokens?: number }
) {
  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "qwen-max",
      messages,
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens ?? 1024,
    }),
  });
  if (!res.ok) throw new Error(`LLM API error: ${res.status}`);
  const data = await res.json();
  return cleanResponse(data.choices[0].message.content);
}

/** VLM 视觉对话 */
export async function visionChatCompletion(
  messages: Array<{ role: string; content: any }>,
  options?: { temperature?: number; maxTokens?: number }
) {
  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "qwen-vl-max",
      messages,
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens ?? 1024,
    }),
  });
  if (!res.ok) throw new Error(`VLM API error: ${res.status}`);
  const data = await res.json();
  return cleanResponse(data.choices[0].message.content);
}

/** ASR 语音识别 */
export async function speechRecognition(audioBase64: string): Promise<string> {
  const rawAudio = audioBase64.replace(/^data:[^;]+;base64,/, "");

  const res = await fetch(
    "https://dashscope.aliyuncs.com/api/v1/services/audio/asr/transcription",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${getApiKey()}`,
        "Content-Type": "application/json",
        "X-DashScope-Async": "false",
      },
      body: JSON.stringify({
        model: "paraformer-v2",
        input: { audio: rawAudio },
        parameters: { format: "wav", sample_rate: 16000 },
      }),
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`ASR API error: ${res.status} - ${errText}`);
  }

  const data = await res.json();
  const results = data?.output?.results;
  if (results && results.length > 0 && results[0].text) {
    return results[0].text;
  }
  return data?.output?.text || "";
}

/** TTS 语音合成 - 使用 OpenAI 兼容接口 */
export async function speechSynthesis(
  text: string,
  options?: { voice?: string; speed?: number }
): Promise<Buffer> {
  const res = await fetch(`${BASE_URL}/audio/speech`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "cosyvoice-v2",
      input: text.slice(0, 1024),
      voice: options?.voice || "longxiaochun",
      speed: options?.speed || 1.0,
      response_format: "wav",
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`TTS API error: ${res.status} - ${errText}`);
  }

  const arrayBuf = await res.arrayBuffer();
  return Buffer.from(arrayBuf);
}
```

---

### 文件4：`src/app/api/vision-chat/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { chatCompletion, visionChatCompletion } from "@/lib/dashscope";

const SYSTEM_PROMPT = `你是一个友好、聪慧的AI视觉助手。你可以通过摄像头"看到"用户面前的场景，也可以通过语音和文字与用户交流。
回答时要简洁有趣，像朋友聊天一样自然。如果用户提供了图像，先描述你看到的内容，再回答问题。`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, imageBase64, history = [], hasImage } = body;

    if (!message?.trim()) {
      return NextResponse.json(
        { success: false, error: "消息不能为空" },
        { status: 400 }
      );
    }

    const messages: Array<{ role: string; content: any }> = [
      { role: "system", content: SYSTEM_PROMPT },
    ];

    const recentHistory = history.slice(-8);
    for (const msg of recentHistory) {
      messages.push({ role: msg.role, content: msg.content });
    }

    if (hasImage && imageBase64) {
      const imageUrl = imageBase64.startsWith("data:")
        ? imageBase64
        : `data:image/jpeg;base64,${imageBase64}`;

      messages.push({
        role: "user",
        content: [
          { type: "image_url", image_url: { url: imageUrl } },
          { type: "text", text: message },
        ],
      });

      const response = await visionChatCompletion(messages);
      return NextResponse.json({
        success: true,
        response,
        mode: "vision" as const,
      });
    } else {
      messages.push({ role: "user", content: message });
      const response = await chatCompletion(messages);
      return NextResponse.json({
        success: true,
        response,
        mode: "text" as const,
      });
    }
  } catch (error: any) {
    console.error("Vision chat error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "服务器错误" },
      { status: 500 }
    );
  }
}
```

---

### 文件5：`src/app/api/asr/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { speechRecognition } from "@/lib/dashscope";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { audioBase64 } = body;

    if (!audioBase64) {
      return NextResponse.json(
        { success: false, error: "音频数据不能为空" },
        { status: 400 }
      );
    }

    const text = await speechRecognition(audioBase64);
    return NextResponse.json({
      success: true,
      text: text || "（未识别到语音内容）",
    });
  } catch (error: any) {
    console.error("ASR error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "语音识别失败" },
      { status: 500 }
    );
  }
}
```

---

### 文件6：`src/app/api/tts/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { speechSynthesis } from "@/lib/dashscope";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text, voice, speed } = body;

    if (!text?.trim()) {
      return NextResponse.json(
        { success: false, error: "文本不能为空" },
        { status: 400 }
      );
    }

    const audioBuffer = await speechSynthesis(text, { voice, speed });

    return new NextResponse(audioBuffer, {
      headers: {
        "Content-Type": "audio/wav",
        "Content-Length": audioBuffer.length.toString(),
      },
    });
  } catch (error: any) {
    console.error("TTS error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "语音合成失败" },
      { status: 500 }
    );
  }
}
```

---

### 文件7：`src/app/page.tsx`（核心重写）

**本文件包含 15 项设计细节 + 语音闭环 + VAD 自动停止，是最关键的文件。**

```tsx
'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Camera, CameraOff, Mic, MicOff, Send, Volume2, VolumeX,
  Eye, Trash2, Loader2, Sparkles, Settings, X,
  MessageCircle, Radio, ChevronDown
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'

// ─── 类型定义 ───
interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  mode?: 'vision' | 'text' | 'voice'
  timestamp: Date
}

interface CostStats {
  vision: number
  text: number
  asr: number
  tts: number
  framesSent: number
  framesSkipped: number
}

// ─── 工具函数 ───

// 图像压缩：发送前缩放至 maxWidth + JPEG quality
function compressImage(
  video: HTMLVideoElement,
  maxWidth = 512,
  quality = 0.6
): string | null {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  const scale = maxWidth / video.videoWidth
  canvas.width = maxWidth
  canvas.height = video.videoHeight * scale
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL('image/jpeg', quality).split(',')[1]
}

// 帧差法：比较两帧像素差异，返回 0~1 的差异值
function calculateFrameDifference(a: ImageData, b: ImageData): number {
  let diff = 0
  const step = 16
  for (let i = 0; i < a.data.length; i += 4 * step) {
    diff += Math.abs(a.data[i] - b.data[i])
    diff += Math.abs(a.data[i + 1] - b.data[i + 1])
    diff += Math.abs(a.data[i + 2] - b.data[i + 2])
  }
  return diff / (a.data.length / (4 * step)) / 255 / 3
}

// VAD 语音活动检测：计算频域平均能量
function detectVoiceActivity(analyser: AnalyserNode, threshold: number): boolean {
  const data = new Uint8Array(analyser.frequencyBinCount)
  analyser.getByteFrequencyData(data)
  const avg = data.reduce((a, b) => a + b, 0) / data.length
  return avg > threshold
}

// WebM 转 WAV：录音格式转换，16kHz 采样率
async function convertWebmToWav(blob: Blob): Promise<string> {
  const audioCtx = new AudioContext({ sampleRate: 16000 })
  const arrayBuf = await blob.arrayBuffer()
  const audioBuffer = await audioCtx.decodeAudioData(arrayBuf)
  const channelData = audioBuffer.getChannelData(0)
  const length = channelData.length
  const wavBuffer = new ArrayBuffer(44 + length * 2)
  const view = new DataView(wavBuffer)

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i))
  }

  writeString(0, 'RIFF')
  view.setUint32(4, 36 + length * 2, true)
  writeString(8, 'WAVE')
  writeString(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, 16000, true)
  view.setUint32(28, 32000, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  writeString(36, 'data')
  view.setUint32(40, length * 2, true)

  for (let i = 0; i < length; i++) {
    const s = Math.max(-1, Math.min(1, channelData[i]))
    view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true)
  }

  const wavBlob = new Blob([wavBuffer], { type: 'audio/wav' })
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve((reader.result as string).split(',')[1])
    reader.readAsDataURL(wavBlob)
  })
}

// ─── 浮动粒子组件（设计细节 #2） ───
function FloatingParticles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {Array.from({ length: 20 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            width: Math.random() * 4 + 1,
            height: Math.random() * 4 + 1,
            background: `rgba(${100 + Math.random() * 100}, ${180 + Math.random() * 75}, 255, ${0.15 + Math.random() * 0.2})`,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
          animate={{
            y: [0, -30 - Math.random() * 60, 0],
            x: [0, (Math.random() - 0.5) * 40, 0],
            opacity: [0.2, 0.6, 0.2],
          }}
          transition={{
            duration: 4 + Math.random() * 6,
            repeat: Infinity,
            delay: Math.random() * 4,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  )
}

// ─── 主页面 ───
export default function Home() {
  // 状态
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isCameraOn, setIsCameraOn] = useState(false)
  const [isMicOn, setIsMicOn] = useState(false)
  const [isTtsOn, setIsTtsOn] = useState(true) // ★ 默认开启语音回复
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isAiSeeing, setIsAiSeeing] = useState(false)
  const [currentImage, setCurrentImage] = useState<string | null>(null)
  const [costStats, setCostStats] = useState<CostStats>({
    vision: 0, text: 0, asr: 0, tts: 0, framesSent: 0, framesSkipped: 0,
  })
  const [vadThreshold, setVadThreshold] = useState(15)
  const [frameInterval, setFrameInterval] = useState(2000)
  const [showSettings, setShowSettings] = useState(false)
  const [asrText, setAsrText] = useState('')
  const [isProcessingVoice, setIsProcessingVoice] = useState(false)
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({})

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const prevFrameRef = useRef<ImageData | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const analyserRef = useRef<AnalyserNode | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const vadIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const frameIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const ttsAudioRef = useRef<HTMLAudioElement | null>(null)
  const isRecordingRef = useRef(false)

  // 卡片折叠切换（设计细节 #4）
  const toggleCollapse = (key: string) => {
    setCollapsedSections(prev => ({ ...prev, [key]: !prev[key] }))
  }

  // 自动滚动
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ─── 摄像头控制 ───
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }
      })
      streamRef.current = stream
      if (videoRef.current) videoRef.current.srcObject = stream
      setIsCameraOn(true)
    } catch (err) {
      console.error('Camera error:', err)
    }
  }, [])

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setIsCameraOn(false)
    setIsAiSeeing(false)
    setCurrentImage(null)
  }, [])

  // 帧采样 + 场景变化检测
  useEffect(() => {
    if (!isCameraOn) {
      if (frameIntervalRef.current) clearInterval(frameIntervalRef.current)
      return
    }
    const captureFrame = () => {
      if (!videoRef.current || !canvasRef.current) return
      const video = videoRef.current
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      if (!ctx) return
      canvas.width = 160
      canvas.height = 120
      ctx.drawImage(video, 0, 0, 160, 120)
      const currentFrame = ctx.getImageData(0, 0, 160, 120)
      if (prevFrameRef.current) {
        const diff = calculateFrameDifference(prevFrameRef.current, currentFrame)
        if (diff < 0.05) {
          setCostStats(s => ({ ...s, framesSkipped: s.framesSkipped + 1 }))
          prevFrameRef.current = currentFrame
          return
        }
      }
      prevFrameRef.current = currentFrame
      const base64 = compressImage(video)
      if (base64) {
        setCurrentImage(base64)
        setIsAiSeeing(true)
        setCostStats(s => ({ ...s, framesSent: s.framesSent + 1 }))
      }
    }
    frameIntervalRef.current = setInterval(captureFrame, frameInterval)
    return () => { if (frameIntervalRef.current) clearInterval(frameIntervalRef.current) }
  }, [isCameraOn, frameInterval])

  // ─── TTS 语音播放 ───
  const playTTS = useCallback(async (text: string) => {
    try {
      if (ttsAudioRef.current) {
        ttsAudioRef.current.pause()
        ttsAudioRef.current = null
      }

      setIsSpeaking(true)
      setCostStats(s => ({ ...s, tts: s.tts + 1 }))

      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice: 'longxiaochun', speed: 1.0 }),
      })

      if (!res.ok) throw new Error('TTS failed')

      const audioBlob = await res.blob()
      const url = URL.createObjectURL(audioBlob)
      const audio = new Audio(url)
      ttsAudioRef.current = audio

      audio.onended = () => {
        setIsSpeaking(false)
        URL.revokeObjectURL(url)
      }
      audio.onerror = () => setIsSpeaking(false)

      await audio.play()
    } catch (err) {
      console.error('TTS error:', err)
      setIsSpeaking(false)
    }
  }, [])

  const stopTTS = useCallback(() => {
    if (ttsAudioRef.current) {
      ttsAudioRef.current.pause()
      ttsAudioRef.current = null
    }
    setIsSpeaking(false)
  }, [])

  // ─── 麦克风 & VAD ───
  const stopRecordingAndProcess = useCallback(async () => {
    isRecordingRef.current = false
    if (vadIntervalRef.current) clearInterval(vadIntervalRef.current)

    const recorder = mediaRecorderRef.current
    if (recorder && recorder.state === 'recording') recorder.stop()
    await new Promise(r => setTimeout(r, 300))

    const chunks = [...audioChunksRef.current]
    audioChunksRef.current = []
    recorder?.stream.getTracks().forEach(t => t.stop())
    setIsMicOn(false)

    if (chunks.length === 0) return

    setIsProcessingVoice(true)
    try {
      const blob = new Blob(chunks, { type: 'audio/webm' })
      const wavBase64 = await convertWebmToWav(blob)

      // ASR 识别
      const asrRes = await fetch('/api/asr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audioBase64: wavBase64 }),
      })
      const asrData = await asrRes.json()
      setCostStats(s => ({ ...s, asr: s.asr + 1 }))

      if (asrData.success && asrData.text && asrData.text !== '（未识别到语音内容）') {
        setAsrText(asrData.text)
        // ★ 关键：识别后自动发送消息
        await sendMessage(asrData.text, 'voice')
      }
    } catch (err) {
      console.error('Voice processing error:', err)
    } finally {
      setIsProcessingVoice(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 16000 }
      })
      audioCtxRef.current = new AudioContext()
      const source = audioCtxRef.current.createMediaStreamSource(stream)
      analyserRef.current = audioCtxRef.current.createAnalyser()
      analyserRef.current.fftSize = 512
      source.connect(analyserRef.current)

      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      mediaRecorderRef.current = recorder
      audioChunksRef.current = []
      isRecordingRef.current = true

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data)
      }
      recorder.start(100)
      setIsMicOn(true)

      // VAD 循环：静默 2 秒自动停止并发送
      let silenceStart = 0
      vadIntervalRef.current = setInterval(() => {
        if (!analyserRef.current || !isRecordingRef.current) return
        const hasVoice = detectVoiceActivity(analyserRef.current, vadThreshold)
        if (hasVoice) {
          silenceStart = 0
        } else {
          if (silenceStart === 0) silenceStart = Date.now()
          if (Date.now() - silenceStart > 2000 && audioChunksRef.current.length > 0) {
            stopRecordingAndProcess()
          }
        }
      }, 200)
    } catch (err) {
      console.error('Mic error:', err)
    }
  }, [vadThreshold, stopRecordingAndProcess])

  const stopMic = useCallback(() => {
    if (isRecordingRef.current) stopRecordingAndProcess()
  }, [stopRecordingAndProcess])

  // ─── 发送消息（★ 语音闭环关键） ───
  const sendMessage = useCallback(async (
    text?: string,
    source?: 'voice' | 'text'
  ) => {
    const msgText = text || input.trim()
    if (!msgText || isLoading) return

    setInput('')
    setAsrText('')
    setIsLoading(true)

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: msgText,
      mode: source || 'text',
      timestamp: new Date(),
    }
    setMessages(prev => [...prev, userMsg])

    try {
      const history = messages.slice(-8).map(m => ({
        role: m.role,
        content: m.content,
      }))

      const res = await fetch('/api/vision-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: msgText,
          imageBase64: currentImage,
          hasImage: isCameraOn && !!currentImage,
          history,
        }),
      })
      const data = await res.json()

      if (data.success) {
        const aiMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.response,
          mode: data.mode,
          timestamp: new Date(),
        }
        setMessages(prev => [...prev, aiMsg])
        setCostStats(s => ({
          ...s,
          [data.mode === 'vision' ? 'vision' : 'text']:
            s[data.mode === 'vision' ? 'vision' : 'text'] + 1,
        }))

        // ★★★ 语音闭环：AI 回复后自动 TTS 播放 ★★★
        if (isTtsOn && data.response) {
          playTTS(data.response)
        }
      }
    } catch (err) {
      console.error('Send error:', err)
    } finally {
      setIsLoading(false)
    }
  }, [input, isLoading, messages, currentImage, isCameraOn, isTtsOn, playTTS])

  const clearChat = useCallback(() => {
    setMessages([])
    stopTTS()
  }, [stopTTS])

  useEffect(() => {
    return () => {
      stopCamera()
      if (vadIntervalRef.current) clearInterval(vadIntervalRef.current)
      stopTTS()
    }
  }, [])

  const totalCalls = costStats.vision + costStats.text + costStats.asr + costStats.tts
  const totalFrames = costStats.framesSent + costStats.framesSkipped
  const frameSaveRate = totalFrames > 0 ? Math.round(costStats.framesSkipped / totalFrames * 100) : 0

  // ─── 渲染 ───
  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white overflow-hidden relative">
      {/* 浮动粒子（设计细节 #2） */}
      <FloatingParticles />

      {/* 渐变光晕背景（设计细节 #1） */}
      <div className="fixed top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-blue-600/8 blur-[120px] pointer-events-none" />
      <div className="fixed bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-purple-600/8 blur-[120px] pointer-events-none" />
      <div className="fixed top-[40%] right-[20%] w-[300px] h-[300px] rounded-full bg-cyan-500/5 blur-[80px] pointer-events-none" />

      {/* ─── 顶部导航栏 ─── */}
      <header className="relative z-10 border-b border-white/5 bg-white/[0.02] backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Logo 呼吸旋转动画（设计细节 #3） */}
            <motion.div
              className="relative"
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
            </motion.div>
            <div>
              <h1 className="text-lg font-bold bg-gradient-to-r from-cyan-300 to-blue-400 bg-clip-text text-transparent">
                AI 视觉助手
              </h1>
              <p className="text-[10px] text-white/30 -mt-0.5">Vision · Voice · Intelligence</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <AnimatePresence>
              {isCameraOn && (
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                  <Badge variant="outline" className="bg-cyan-500/10 text-cyan-400 border-cyan-500/20 text-xs">
                    <Eye className="w-3 h-3 mr-1" /> 视觉
                  </Badge>
                </motion.div>
              )}
              {isMicOn && (
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                  <Badge variant="outline" className="bg-red-500/10 text-red-400 border-red-500/20 text-xs">
                    <motion.div animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1, repeat: Infinity }}>
                      <Radio className="w-3 h-3 mr-1 inline" />
                    </motion.div>
                    录音中
                  </Badge>
                </motion.div>
              )}
              {isSpeaking && (
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                  <Badge variant="outline" className="bg-purple-500/10 text-purple-400 border-purple-500/20 text-xs">
                    <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 0.8, repeat: Infinity }}>
                      <Volume2 className="w-3 h-3 mr-1 inline" />
                    </motion.div>
                    说话中
                  </Badge>
                </motion.div>
              )}
            </AnimatePresence>
            <Button variant="ghost" size="icon" onClick={() => setShowSettings(!showSettings)}
              className="text-white/40 hover:text-white/80 hover:bg-white/5">
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* ─── 主内容区 ─── */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 py-4 flex gap-4 h-[calc(100vh-56px)]">

        {/* ═══ 左侧功能栏 ═══ */}
        <div className="w-[340px] flex-shrink-0 flex flex-col gap-3">

          {/* ── 实时摄像头模块（可折叠，设计细节 #4） ── */}
          <Card className="relative overflow-hidden bg-white/[0.03] border-white/[0.06] backdrop-blur-xl rounded-2xl">
            <div
              className="px-3 py-2.5 flex items-center justify-between cursor-pointer hover:bg-white/[0.02] transition-colors"
              onClick={() => toggleCollapse('camera')}
            >
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-cyan-400/60" />
                <span className="text-xs text-white/60 font-medium">实时摄像头</span>
              </div>
              <motion.div
                animate={{ rotate: collapsedSections.camera ? 0 : 180 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown className="w-4 h-4 text-white/30" />
              </motion.div>
            </div>
            <AnimatePresence>
              {!collapsedSections.camera && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="aspect-[4/3] relative bg-black/40 mx-3 mb-2 rounded-lg overflow-hidden">
                    <video ref={videoRef} autoPlay playsInline muted
                      className={`w-full h-full object-cover ${isCameraOn ? 'opacity-100' : 'opacity-0'}`} />
                    <canvas ref={canvasRef} className="hidden" />

                    {/* 摄像头空状态动画（设计细节 #5） */}
                    {!isCameraOn && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                        <motion.div
                          animate={{ scale: [1, 1.05, 1] }}
                          transition={{ duration: 3, repeat: Infinity }}
                          className="w-16 h-16 rounded-full bg-white/[0.03] border border-white/10 flex items-center justify-center"
                        >
                          <Camera className="w-7 h-7 text-white/20" />
                        </motion.div>
                        <p className="text-white/20 text-xs">点击下方按钮开启摄像头</p>
                      </div>
                    )}

                    {/* AI 正在观察指示（设计细节 #6） */}
                    <AnimatePresence>
                      {isAiSeeing && isCameraOn && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                          className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/50 backdrop-blur-sm rounded-full px-2.5 py-1"
                        >
                          <motion.div className="w-2 h-2 rounded-full bg-cyan-400"
                            animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.5, repeat: Infinity }} />
                          <span className="text-[10px] text-cyan-300 font-medium">AI 正在观察</span>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <div className="px-3 pb-3">
                    <Button
                      onClick={isCameraOn ? stopCamera : startCamera}
                      className={`w-full ${isCameraOn
                        ? 'bg-red-500/15 text-red-400 hover:bg-red-500/25 border border-red-500/20'
                        : 'bg-cyan-500/15 text-cyan-400 hover:bg-cyan-500/25 border border-cyan-500/20'
                      }`}
                      variant="ghost" size="sm"
                    >
                      {isCameraOn ? <CameraOff className="w-4 h-4 mr-1.5" /> : <Camera className="w-4 h-4 mr-1.5" />}
                      {isCameraOn ? '关闭摄像头' : '开启摄像头'}
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </Card>

          {/* ── 快捷操作模块 ── */}
          <Card className="bg-white/[0.03] border-white/[0.06] backdrop-blur-xl rounded-2xl">
            <div
              className="px-3 py-2.5 flex items-center justify-between cursor-pointer hover:bg-white/[0.02] transition-colors"
              onClick={() => toggleCollapse('actions')}
            >
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400/60" />
                <span className="text-xs text-white/60 font-medium">快捷操作</span>
              </div>
              <motion.div
                animate={{ rotate: collapsedSections.actions ? 0 : 180 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown className="w-4 h-4 text-white/30" />
              </motion.div>
            </div>
            <AnimatePresence>
              {!collapsedSections.actions && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="px-3 pb-3 space-y-2">
                    {/* 麦克风按钮（带脉冲波纹，设计细节 #7） */}
                    <div className="relative">
                      {isMicOn && (
                        <motion.div
                          className="absolute inset-0 rounded-xl border-2 border-red-500/30 pointer-events-none"
                          animate={{ scale: [1, 1.15], opacity: [0.5, 0] }}
                          transition={{ duration: 1, repeat: Infinity }}
                        />
                      )}
                      <Button
                        onClick={isMicOn ? stopMic : startRecording}
                        className={`w-full justify-start h-10 rounded-xl transition-all duration-300 ${isMicOn
                          ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30'
                          : 'bg-white/[0.04] text-white/50 hover:bg-white/[0.08] hover:text-white/70 border border-white/[0.06]'
                        }`}
                        variant="ghost" size="sm"
                      >
                        {isMicOn ? <MicOff className="w-4 h-4 mr-2" /> : <Mic className="w-4 h-4 mr-2" />}
                        {isMicOn ? '停止录音' : '语音对话'}
                        {isProcessingVoice && <Loader2 className="w-3 h-3 ml-auto animate-spin text-amber-400" />}
                      </Button>
                    </div>

                    {/* 语音回复开关 */}
                    <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.06]">
                      <div className="flex items-center gap-2">
                        {isSpeaking ? (
                          <Volume2 className="w-4 h-4 text-purple-400" />
                        ) : (
                          <VolumeX className="w-4 h-4 text-white/30" />
                        )}
                        <span className="text-xs text-white/50">语音回复</span>
                      </div>
                      <Switch checked={isTtsOn} onCheckedChange={setIsTtsOn}
                        className="data-[state=checked]:bg-cyan-500/60" />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </Card>

          {/* ── 语音波形可视化（设计细节 #15） ── */}
          {isSpeaking && (
            <Card className="bg-purple-500/[0.04] border-purple-500/10 backdrop-blur-xl rounded-2xl p-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <motion.div
                      key={i}
                      className="w-1 bg-gradient-to-t from-cyan-500 to-purple-500 rounded-full"
                      animate={{ height: [8, 20 + Math.random() * 12, 8] }}
                      transition={{ duration: 0.4 + Math.random() * 0.3, repeat: Infinity, delay: i * 0.1 }}
                    />
                  ))}
                </div>
                <div className="flex-1">
                  <p className="text-xs text-purple-300 font-medium">AI 正在说话</p>
                </div>
                <Button variant="ghost" size="icon" onClick={stopTTS}
                  className="text-red-400/60 hover:text-red-400 hover:bg-red-500/10 h-7 w-7">
                  <VolumeX className="w-3.5 h-3.5" />
                </Button>
              </div>
            </Card>
          )}

          {/* ── 调用统计模块（设计细节 #8 #9） ── */}
          <Card className="bg-white/[0.03] border-white/[0.06] backdrop-blur-xl rounded-2xl flex-1 min-h-0 overflow-hidden">
            <div
              className="px-3 py-2.5 flex items-center justify-between cursor-pointer hover:bg-white/[0.02] transition-colors"
              onClick={() => toggleCollapse('stats')}
            >
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-green-400/60" />
                <span className="text-xs text-white/60 font-medium">调用统计</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-white/20">共 {totalCalls} 次</span>
                <motion.div
                  animate={{ rotate: collapsedSections.stats ? 0 : 180 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronDown className="w-4 h-4 text-white/30" />
                </motion.div>
              </div>
            </div>
            <AnimatePresence>
              {!collapsedSections.stats && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-auto"
                >
                  <div className="px-3 pb-3">
                    <div className="grid grid-cols-2 gap-1.5">
                      {[
                        { label: '视觉 VLM', value: costStats.vision, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
                        { label: '文字 LLM', value: costStats.text, color: 'text-green-400', bg: 'bg-green-500/10' },
                        { label: 'ASR', value: costStats.asr, color: 'text-amber-400', bg: 'bg-amber-500/10' },
                        { label: 'TTS', value: costStats.tts, color: 'text-purple-400', bg: 'bg-purple-500/10' },
                      ].map(item => (
                        <div key={item.label} className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg ${item.bg}`}>
                          {/* 数字滚动动画（设计细节 #8） */}
                          <motion.span
                            key={item.value}
                            initial={{ y: -8, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            className={`text-sm font-bold ${item.color}`}
                          >
                            {item.value}
                          </motion.span>
                          <span className="text-[10px] text-white/30">{item.label}</span>
                        </div>
                      ))}
                    </div>

                    {/* 微型进度条（设计细节 #9） */}
                    {totalCalls > 0 && (
                      <div className="mt-2 h-1.5 rounded-full bg-white/5 overflow-hidden flex">
                        <div style={{ width: `${(costStats.vision / totalCalls) * 100}%` }} className="bg-cyan-500/60 transition-all duration-500" />
                        <div style={{ width: `${(costStats.text / totalCalls) * 100}%` }} className="bg-green-500/60 transition-all duration-500" />
                        <div style={{ width: `${(costStats.asr / totalCalls) * 100}%` }} className="bg-amber-500/60 transition-all duration-500" />
                        <div style={{ width: `${(costStats.tts / totalCalls) * 100}%` }} className="bg-purple-500/60 transition-all duration-500" />
                      </div>
                    )}

                    <div className="mt-2 flex items-center justify-between text-[10px] text-white/20">
                      <span>帧发送 {costStats.framesSent} / 跳过 {costStats.framesSkipped}</span>
                      <span>节省 {frameSaveRate}%</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </Card>
        </div>

        {/* ═══ 右侧对话区 ═══ */}
        <div className="flex-1 flex flex-col gap-3 min-w-0">
          <Card className="flex-1 min-h-0 bg-white/[0.03] border-white/[0.06] backdrop-blur-xl rounded-2xl flex flex-col overflow-hidden">
            {/* 对话头部 */}
            <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-cyan-400/60" />
                <span className="text-sm text-white/60 font-medium">智能对话</span>
                <span className="text-[10px] text-white/20">{messages.length} 条消息</span>
              </div>
              <Button variant="ghost" size="sm" onClick={clearChat}
                className="text-white/30 hover:text-red-400 hover:bg-red-500/10 h-7 text-xs">
                <Trash2 className="w-3 h-3 mr-1" /> 清空
              </Button>
            </div>

            {/* 消息列表 */}
            <ScrollArea className="flex-1 px-4 py-3">
              {messages.length === 0 ? (
                /* 空状态：品牌展示区（设计细节 #10 #11 #12） */
                <div className="flex flex-col items-center justify-center h-full min-h-[400px] gap-4">
                  <motion.div
                    animate={{
                      scale: [1, 1.05, 1],
                      rotate: [0, 5, -5, 0],
                    }}
                    transition={{ duration: 4, repeat: Infinity }}
                    className="w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center"
                  >
                    <Sparkles className="w-9 h-9 text-cyan-400/60" />
                  </motion.div>
                  <div className="text-center">
                    <p className="text-white/40 text-sm font-medium">你好，我是 AI 视觉助手</p>
                    {/* 关键词彩色高亮（设计细节 #11） */}
                    <p className="text-white/20 text-xs mt-1.5">
                      我能<span className="text-cyan-400">看到</span>你摄像头中的画面，
                      <span className="text-amber-400">听懂</span>你的语音，
                      并用<span className="text-purple-400">自然语音</span>回复你
                    </p>
                  </div>
                  {/* 快捷提问按钮（设计细节 #12） */}
                  <div className="flex flex-wrap gap-2 mt-2 justify-center">
                    {['你好！', '帮我看看画面里有什么', '今天天气怎么样'].map(q => (
                      <Button key={q} variant="ghost" size="sm"
                        onClick={() => sendMessage(q)}
                        className="text-xs text-white/30 hover:text-cyan-400 hover:bg-cyan-500/10 border border-white/[0.06] h-8">
                        {q}
                      </Button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-3 pb-4">
                  {messages.map((msg) => (
                    <motion.div key={msg.id}
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className="max-w-[75%]">
                        <div className={`flex items-center gap-1.5 mb-1 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                          {msg.role === 'assistant' && (
                            <div className="w-4 h-4 rounded-md bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center">
                              <Sparkles className="w-2.5 h-2.5 text-white" />
                            </div>
                          )}
                          <span className="text-[10px] text-white/20">
                            {msg.role === 'user' ? '你' : 'AI'}
                          </span>
                          {/* 消息模式标签（设计细节 #13） */}
                          {msg.mode === 'vision' && (
                            <Badge className="bg-cyan-500/10 text-cyan-400 text-[9px] py-0 px-1.5">视觉</Badge>
                          )}
                          {msg.mode === 'voice' && (
                            <Badge className="bg-amber-500/10 text-amber-400 text-[9px] py-0 px-1.5">语音</Badge>
                          )}
                          <span className="text-[10px] text-white/10">
                            {msg.timestamp.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                          msg.role === 'user'
                            ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-500/10 text-white/90'
                            : 'bg-white/[0.04] border border-white/[0.06] text-white/80'
                        }`}>
                          {msg.content}
                        </div>
                      </div>
                    </motion.div>
                  ))}

                  {/* AI 加载弹跳点（设计细节 #14） */}
                  {isLoading && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                      <div className="bg-white/[0.04] border border-white/[0.06] rounded-2xl px-4 py-3">
                        <div className="flex gap-1.5">
                          {[0, 1, 2].map(i => (
                            <motion.div key={i} className="w-2 h-2 rounded-full bg-cyan-400/50"
                              animate={{ y: [0, -6, 0] }}
                              transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }} />
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                  <div ref={chatEndRef} />
                </div>
              )}
            </ScrollArea>

            {/* 输入区 */}
            <div className="px-4 py-3 border-t border-white/[0.06]">
              {/* ASR 识别结果展示 */}
              {asrText && (
                <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                  className="mb-2 p-2 rounded-lg bg-amber-500/[0.06] border border-amber-500/10">
                  <p className="text-xs text-white/50">
                    <span className="text-amber-400">语音识别：</span>{asrText}
                  </p>
                </motion.div>
              )}
              <form onSubmit={(e) => { e.preventDefault(); sendMessage() }}
                className="flex items-center gap-2">
                <div className="flex-1 relative">
                  <input
                    value={input} onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
                    placeholder={isCameraOn ? "输入消息，AI 会结合画面回答..." : "输入消息与 AI 对话..."}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white/90 placeholder:text-white/20 focus:outline-none focus:border-cyan-500/30 focus:ring-1 focus:ring-cyan-500/20 transition-all"
                    disabled={isLoading}
                  />
                  {isCameraOn && currentImage && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <motion.div animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 2, repeat: Infinity }}>
                        <Eye className="w-4 h-4 text-cyan-400/50" />
                      </motion.div>
                    </div>
                  )}
                </div>
                <Button type="submit" disabled={!input.trim() || isLoading}
                  className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/20 rounded-xl px-4 h-10 disabled:opacity-30 disabled:shadow-none">
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            </div>
          </Card>
        </div>
      </main>

      {/* ─── 设置侧边栏 ─── */}
      <AnimatePresence>
        {showSettings && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
              onClick={() => setShowSettings(false)} />
            <motion.div
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-[320px] bg-[#0d1220]/95 backdrop-blur-xl border-l border-white/[0.06] z-50 p-6 overflow-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-white/80">设置</h2>
                <Button variant="ghost" size="icon" onClick={() => setShowSettings(false)}
                  className="text-white/40 hover:text-white">
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <div className="space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm text-white/50">VAD 灵敏度</label>
                    <span className="text-xs text-cyan-400 font-mono">{vadThreshold}</span>
                  </div>
                  <Slider value={[vadThreshold]} onValueChange={([v]) => setVadThreshold(v)}
                    min={5} max={40} step={1} />
                  <p className="text-[10px] text-white/20 mt-1">值越低越灵敏，建议 10-20</p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm text-white/50">帧采样间隔</label>
                    <span className="text-xs text-cyan-400 font-mono">{frameInterval}ms</span>
                  </div>
                  <Slider value={[frameInterval]} onValueChange={([v]) => setFrameInterval(v)}
                    min={500} max={5000} step={100} />
                  <p className="text-[10px] text-white/20 mt-1">越低画面越实时，但 API 调用越多</p>
                </div>

                <Separator className="bg-white/[0.06]" />

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-white/50">语音回复</p>
                    <p className="text-[10px] text-white/20">AI 回复时自动播放语音</p>
                  </div>
                  <Switch checked={isTtsOn} onCheckedChange={setIsTtsOn}
                    className="data-[state=checked]:bg-cyan-500/60" />
                </div>

                <Separator className="bg-white/[0.06]" />

                <Button variant="ghost"
                  onClick={() => setCostStats({ vision: 0, text: 0, asr: 0, tts: 0, framesSent: 0, framesSkipped: 0 })}
                  className="w-full text-white/30 hover:text-red-400 hover:bg-red-500/10" size="sm">
                  <Trash2 className="w-3 h-3 mr-1" /> 重置统计
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
```

---

### 文件8：`src/components/ui/slider.tsx`（如果 shadcn add 失败则手动创建）

```tsx
"use client"

import * as React from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"
import { cn } from "@/lib/utils"

const Slider = React.forwardRef<
  React.ComponentRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={cn("relative flex w-full touch-none select-none items-center", className)}
    {...props}
  >
    <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-white/10">
      <SliderPrimitive.Range className="absolute h-full bg-cyan-500/60" />
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb className="block h-4 w-4 rounded-full border border-cyan-400/50 bg-cyan-500 shadow transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cyan-500 disabled:pointer-events-none disabled:opacity-50" />
  </SliderPrimitive.Root>
))
Slider.displayName = SliderPrimitive.Root.displayName

export { Slider }
```

> **注意**：需要安装 `@radix-ui/react-slider`：`npm install @radix-ui/react-slider`

---

### 文件9：`src/components/ui/switch.tsx`（如果 shadcn add 失败则手动创建）

```tsx
"use client"

import * as React from "react"
import * as SwitchPrimitives from "@radix-ui/react-switch"
import { cn } from "@/lib/utils"

const Switch = React.forwardRef<
  React.ComponentRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(
      "peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-cyan-500/60 data-[state=unchecked]:bg-white/20",
      className
    )}
    {...props}
    ref={ref}
  >
    <SwitchPrimitives.Thumb
      className={cn(
        "pointer-events-none block h-4 w-4 rounded-full bg-white shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0"
      )}
    />
  </SwitchPrimitives.Root>
))
Switch.displayName = SwitchPrimitives.Root.displayName

export { Switch }
```

> **注意**：需要安装 `@radix-ui/react-switch`：`npm install @radix-ui/react-switch`

---

## 五、15 项设计细节对照表

| # | 设计细节 | 所在位置 | 关键实现 |
|---|---------|---------|---------|
| 1 | 渐变光晕背景 | page.tsx 根容器 | 3 个 fixed 圆形 div + blur-[120px] |
| 2 | 浮动粒子 | FloatingParticles 组件 | 20 个 motion.div + y/opacity 动画 |
| 3 | Logo 呼吸旋转 | header 中 Sparkles | animate rotate 360° + 20s 循环 |
| 4 | 卡片折叠交互 | 每个 Card 模块 | collapsedSections 状态 + AnimatePresence |
| 5 | 摄像头空状态动画 | 摄像头模块内 | scale [1,1.05,1] + 3s 循环 |
| 6 | AI 正在观察指示 | 摄像头画面左上角 | 闪烁绿点 + "AI 正在观察" 文字 |
| 7 | 录音脉冲波纹 | 麦克风按钮 | scale [1,1.15] + opacity [0.5,0] 扩散 |
| 8 | 统计数字滚动 | 调用统计区域 | motion.span key={value} + y/opacity |
| 9 | 统计进度条 | 调用统计区域 | 4 色横条 + width 百分比 |
| 10 | 空状态品牌动效 | 对话区空状态 | scale + rotate 动画组合 |
| 11 | 关键词彩色高亮 | 空状态描述文字 | cyan/amber/purple span |
| 12 | 快捷提问按钮 | 空状态底部 | 3 个 Button + onClick sendMessage |
| 13 | 消息模式标签 | 每条消息头部 | Badge 组件 + 视觉/语音 标签 |
| 14 | AI 加载弹跳点 | 消息列表底部 | 3 个 motion.div + y 弹跳 |
| 15 | 语音波形可视化 | 左侧独立卡片 | 5 个渐变条 + height 动画 |

---

## 六、语音闭环原理

```
修改前（断路）：
  用户说话 → VAD → 录音 → ASR → 文字 → LLM → 文字显示 → ❌ 结束

修改后（闭环）：
  用户说话 → VAD → 录音 → ASR → 文字 → LLM → 文字显示
                                              ↓
                                          自动 TTS → 🔊 语音播放
```

**闭环代码**（在 `sendMessage` 函数末尾，共 3 行）：
```typescript
if (isTtsOn && data.response) {
  playTTS(data.response)
}
```

**VAD 自动停止**（在 `startRecording` 的 setInterval 中）：
```typescript
// 静默 2 秒后自动调用 stopRecordingAndProcess()
if (Date.now() - silenceStart > 2000 && audioChunksRef.current.length > 0) {
  stopRecordingAndProcess()
}
```

---

## 七、执行步骤

1. 在项目根目录安装依赖：`npm install framer-motion lucide-react @radix-ui/react-slider @radix-ui/react-switch`
2. 尝试 `npx shadcn@latest add slider switch`，如果失败则手动创建文件8、文件9
3. 按 文件1→文件9 的顺序替换/新建
4. 确认 `.env` 中有 `DASHSCOPE_API_KEY=sk-8c54c7fd5f124e42a2baaab5a926b2d6`
5. 启动：`npx next dev --webpack`
6. 验证：开启麦克风说话 → AI 应该自动语音回复

---

## 八、注意事项

1. **framer-motion** 是动效核心依赖，必须安装
2. **TTS 接口**必须使用 OpenAI 兼容格式 `/v1/audio/speech`，不是老版本异步接口
3. **cleanResponse** 函数过滤 `<think` 开头的标签（不是 `<think"` 注意没有引号），兼容各种思维链格式
4. 如果编译报 Slider/Switch 相关错误，确认 `@radix-ui/react-slider` 和 `@radix-ui/react-switch` 已安装
5. 如果 `@/lib/utils` 不存在，需要 `npx shadcn@latest init` 初始化
