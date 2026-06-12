# AI 视觉对话助手 — 本地部署完整配置指南

> **使用方式**：把这份文档完整发给 AI 助手（如 Cursor、Claude、ChatGPT），让它按步骤执行即可。

---

## 一、项目概述

一个 AI 视觉对话助手 Web 应用，功能：
- 打开摄像头，AI 能看到视频画面
- 打开麦克风，AI 能听到用户说话
- AI 结合视觉+语音给出回应，并语音播报
- 内置成本控制策略（帧采样、图像压缩、VAD、分级模型调用等）

**技术栈**：Next.js 16 + TypeScript + Tailwind CSS 4 + shadcn/ui + 阿里云灵积 DashScope

---

## 二、前置条件

1. **Node.js** >= 18（推荐 20+）
2. **bun** 或 **npm** 包管理器
3. **阿里云灵积 API Key**：去 https://dashscope.console.aliyun.com/ 注册 → 开通服务 → 创建 API Key

---

## 三、创建项目

```bash
# 1. 创建 Next.js 项目
npx create-next-app@latest ai-vision-assistant --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"

# 2. 进入项目目录
cd ai-vision-assistant

# 3. 安装 shadcn/ui
npx shadcn@latest init

# 4. 安装需要的 shadcn/ui 组件
npx shadcn@latest add button card badge scroll-area separator tabs

# 5. 安装图标库
npm install lucide-react
```

---

## 四、需要创建/修改的文件清单

| 序号 | 文件路径 | 操作 | 说明 |
|------|---------|------|------|
| 1 | `.env` | 修改 | 添加灵积 API Key |
| 2 | `src/lib/dashscope.ts` | 新建 | 灵积 API 客户端（核心） |
| 3 | `src/app/api/vision-chat/route.ts` | 新建 | VLM视觉+LLM对话接口 |
| 4 | `src/app/api/asr/route.ts` | 新建 | 语音识别接口 |
| 5 | `src/app/api/tts/route.ts` | 新建 | 语音合成接口 |
| 6 | `src/app/page.tsx` | 替换 | 前端主页面 |
| 7 | `src/app/layout.tsx` | 替换 | 布局元数据 |

---

## 五、文件内容

### 文件 1：`.env`

```
# 阿里云灵积 DashScope API Key
# 获取方式：https://dashscope.console.aliyun.com/ → 开通服务 → 创建 API Key
DASHSCOPE_API_KEY=sk-你的灵积API-Key填这里
```

---

### 文件 2：`src/lib/dashscope.ts`

```typescript
/**
 * DashScope (灵积) API 客户端
 * 
 * 直接调用阿里云灵积大模型 API，不依赖 z-ai-web-dev-sdk
 * 
 * 环境变量：
 * - DASHSCOPE_API_KEY: 灵积 API Key（必填）
 * 
 * 支持的模型：
 * - LLM: qwen-max, qwen-plus, qwen-turbo
 * - VLM: qwen-vl-max, qwen-vl-plus
 * - ASR: paraformer-v2 (语音识别)
 * - TTS: cosyvoice-v2 (语音合成)
 */

const DASHSCOPE_BASE_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1';
const DASHSCOPE_API_URL = 'https://dashscope.aliyuncs.com/api/v1';

function getApiKey(): string {
  const key = process.env.DASHSCOPE_API_KEY;
  if (!key) {
    throw new Error('DASHSCOPE_API_KEY 环境变量未设置，请在 .env 中添加');
  }
  return key;
}

// ==================== LLM / VLM ====================

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | ContentPart[];
}

interface ContentPart {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: { url: string };
}

interface ChatCompletionOptions {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

/**
 * LLM 文字对话
 * 使用 OpenAI 兼容接口
 */
export async function chatCompletion(options: ChatCompletionOptions) {
  const apiKey = getApiKey();
  const model = options.model || 'qwen-max';

  const response = await fetch(`${DASHSCOPE_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: options.messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.max_tokens,
      stream: options.stream ?? false,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`DashScope Chat API error (${response.status}): ${errorBody}`);
  }

  return await response.json();
}

/**
 * VLM 视觉对话
 * 与 chatCompletion 走同一个 OpenAI 兼容接口，只是 model 不同
 * messages 中可包含 image_url 类型的 content
 */
export async function visionChatCompletion(options: ChatCompletionOptions) {
  const apiKey = getApiKey();
  const model = options.model || 'qwen-vl-max';

  const response = await fetch(`${DASHSCOPE_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: options.messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.max_tokens,
      stream: options.stream ?? false,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`DashScope Vision API error (${response.status}): ${errorBody}`);
  }

  return await response.json();
}

// ==================== ASR ====================

interface AsrOptions {
  audioBase64: string;
  model?: string;
  format?: string;
  sampleRate?: number;
}

/**
 * 语音识别 (ASR)
 * 使用灵积 REST API
 */
export async function speechRecognition(options: AsrOptions): Promise<string> {
  const apiKey = getApiKey();
  const model = options.model || 'paraformer-v2';

  const response = await fetch(`${DASHSCOPE_API_URL}/services/audio/asr/transcription`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      input: {
        audio: options.audioBase64,
      },
      parameters: {
        format: options.format || 'wav',
        sample_rate: options.sampleRate || 16000,
      },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`DashScope ASR API error (${response.status}): ${errorBody}`);
  }

  const result = await response.json();

  // 灵积 ASR 返回格式: { output: { results: [{ transcript: { text: "..." } }] } }
  const text = result?.output?.results?.[0]?.transcript?.text || '';
  return text;
}

// ==================== TTS ====================

interface TtsOptions {
  text: string;
  model?: string;
  voice?: string;
  speed?: number;
  format?: string;
  sampleRate?: number;
}

/**
 * 语音合成 (TTS)
 * 使用灵积 REST API
 * 
 * 可用音色：
 * - longxiaochun: 温暖女声（默认）
 * - longlaotie: 沉稳男声
 * - longshuo: 磁性男声
 * - longshu: 知性女声
 * - longjing: 甜美女声
 * - longmiao: 少女音
 * - longyue: 阳光男声
 * - longfei: 成熟男声
 * - longjielidou: 可爱童声
 * - longshuoeng: 播音男声
 * - longyuan: 评书男声
 * - longting: 电台女声
 */
export async function speechSynthesis(options: TtsOptions): Promise<Buffer> {
  const apiKey = getApiKey();
  const model = options.model || 'cosyvoice-v2';
  const voice = options.voice || 'longxiaochun';

  const response = await fetch(`${DASHSCOPE_API_URL}/services/audio/tts/synthesis`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      input: {
        text: options.text,
      },
      parameters: {
        voice: voice,
        speed: options.speed ?? 1.0,
        format: options.format || 'wav',
        sample_rate: options.sampleRate || 24000,
      },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`DashScope TTS API error (${response.status}): ${errorBody}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(new Uint8Array(arrayBuffer));
}

// ==================== 工具函数 ====================

/**
 * 清理 AI 回复中的思维链泄露
 */
export function cleanResponse(text: string): string {
  let cleaned = text.replace(/<think[\s\S]*?<\/think>/g, '');
  cleaned = cleaned.trim();
  return cleaned || text;
}
```

---

### 文件 3：`src/app/api/vision-chat/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import {
  chatCompletion,
  visionChatCompletion,
  cleanResponse,
} from '@/lib/dashscope';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, imageBase64, history, hasImage } = body;

    if (!message && !imageBase64) {
      return NextResponse.json(
        { error: '消息或图像不能为空' },
        { status: 400 }
      );
    }

    // Build system prompt
    const systemPrompt = `你是一个智能视觉对话助手。你可以看到用户摄像头捕捉的画面，也能听到用户说的话。请根据视觉内容和用户的问题，给出恰当、自然、有帮助的回应。

注意事项：
1. 如果用户提到了画面中的内容，请仔细观察并准确描述
2. 回答要简洁自然，像朋友间的对话，不要过于冗长
3. 如果画面模糊或看不清，请诚实告知
4. 可以主动注意到画面中的有趣细节
5. 用中文回复
6. 直接回答，不要输出思考过程`;

    // Build messages array
    const messages: any[] = [
      { role: 'system', content: systemPrompt }
    ];

    // Add conversation history (text only, last 10 messages to save tokens)
    if (history && Array.isArray(history)) {
      for (const msg of history) {
        if (msg.role === 'user' || msg.role === 'assistant') {
          messages.push({
            role: msg.role,
            content: msg.content
          });
        }
      }
    }

    if (hasImage && imageBase64) {
      // ===== VLM 视觉对话 =====
      const userContent: any[] = [
        {
          type: 'text',
          text: message || '请描述你看到的画面'
        },
        {
          type: 'image_url',
          image_url: {
            url: imageBase64.startsWith('data:')
              ? imageBase64
              : `data:image/jpeg;base64,${imageBase64}`
          }
        }
      ];

      messages.push({
        role: 'user',
        content: userContent
      });

      const result = await visionChatCompletion({
        messages,
        model: 'qwen-vl-max',
      });

      const rawResponse = result.choices?.[0]?.message?.content || '抱歉，我无法理解画面内容。';
      const aiResponse = cleanResponse(rawResponse);

      return NextResponse.json({
        success: true,
        response: aiResponse,
        mode: 'vision'
      });
    } else {
      // ===== LLM 纯文字对话 =====
      messages.push({
        role: 'user',
        content: message || '你好'
      });

      const result = await chatCompletion({
        messages,
        model: 'qwen-max',
      });

      const rawResponse = result.choices?.[0]?.message?.content || '抱歉，我没有理解你的意思。';
      const aiResponse = cleanResponse(rawResponse);

      return NextResponse.json({
        success: true,
        response: aiResponse,
        mode: 'text'
      });
    }
  } catch (error: any) {
    console.error('Vision Chat API Error:', error);
    return NextResponse.json(
      { error: error.message || '对话服务出错，请稍后重试' },
      { status: 500 }
    );
  }
}
```

---

### 文件 4：`src/app/api/asr/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { speechRecognition } from '@/lib/dashscope';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { audioBase64 } = body;

    if (!audioBase64) {
      return NextResponse.json(
        { error: '音频数据不能为空' },
        { status: 400 }
      );
    }

    // Remove data URL prefix if present
    const base64Data = audioBase64.includes(',')
      ? audioBase64.split(',')[1]
      : audioBase64;

    const transcription = await speechRecognition({
      audioBase64: base64Data,
      model: 'paraformer-v2',
      format: 'wav',
      sampleRate: 16000,
    });

    return NextResponse.json({
      success: true,
      text: transcription
    });
  } catch (error: any) {
    console.error('ASR API Error:', error);
    return NextResponse.json(
      { error: error.message || '语音识别失败，请稍后重试' },
      { status: 500 }
    );
  }
}
```

---

### 文件 5：`src/app/api/tts/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { speechSynthesis } from '@/lib/dashscope';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text, voice = 'longxiaochun', speed = 1.0 } = body;

    if (!text || text.trim().length === 0) {
      return NextResponse.json(
        { error: '文本不能为空' },
        { status: 400 }
      );
    }

    if (text.length > 1024) {
      return NextResponse.json(
        { error: '文本过长，请缩短后重试（最大1024字符）' },
        { status: 400 }
      );
    }

    const audioBuffer = await speechSynthesis({
      text: text.trim(),
      model: 'cosyvoice-v2',
      voice: voice,
      speed: speed,
      format: 'wav',
      sampleRate: 24000,
    });

    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/wav',
        'Content-Length': audioBuffer.length.toString(),
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error: any) {
    console.error('TTS API Error:', error);
    return NextResponse.json(
      { error: error.message || '语音合成失败，请稍后重试' },
      { status: 500 }
    );
  }
}
```

---

### 文件 6：`src/app/layout.tsx`

```typescript
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
  title: "AI 视觉对话助手 - 看得见、听得着的智能助手",
  description: "开启摄像头与麦克风，让AI看到你的世界、听到你的声音，并给予恰当回应。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
```

---

### 文件 7：`src/app/page.tsx`

```typescript
'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Camera,
  CameraOff,
  Mic,
  MicOff,
  Send,
  Volume2,
  VolumeX,
  Eye,
  EyeOff,
  Trash2,
  Loader2,
  MessageCircle,
  BarChart3,
  Settings,
  Sparkles,
  AlertCircle,
} from 'lucide-react';

// ==================== Types ====================
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  hasImage?: boolean;
  mode?: 'vision' | 'text';
}

interface CostStats {
  visionCalls: number;
  textCalls: number;
  asrCalls: number;
  ttsCalls: number;
  framesSent: number;
  framesSkipped: number;
  imagesCompressed: number;
  totalApiCalls: number;
}

// ==================== Utility Functions ====================

// Compress image to reduce token cost
function compressImage(
  canvas: HTMLCanvasElement,
  maxWidth: number = 512,
  quality: number = 0.6
): string {
  const ratio = Math.min(maxWidth / canvas.width, maxWidth / canvas.height);
  const newWidth = Math.round(canvas.width * ratio);
  const newHeight = Math.round(canvas.height * ratio);

  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = newWidth;
  tempCanvas.height = newHeight;

  const ctx = tempCanvas.getContext('2d')!;
  ctx.drawImage(canvas, 0, 0, newWidth, newHeight);

  return tempCanvas.toDataURL('image/jpeg', quality);
}

// Simple frame difference detection
function calculateFrameDifference(
  prevData: ImageData | null,
  currData: ImageData
): number {
  if (!prevData) return 1.0;

  const len = Math.min(prevData.data.length, currData.data.length);
  let diff = 0;
  const sampleStep = 40;

  for (let i = 0; i < len; i += 4 * sampleStep) {
    const rDiff = Math.abs(prevData.data[i] - currData.data[i]);
    const gDiff = Math.abs(prevData.data[i + 1] - currData.data[i + 1]);
    const bDiff = Math.abs(prevData.data[i + 2] - currData.data[i + 2]);
    diff += (rDiff + gDiff + bDiff) / (3 * 255);
  }

  const sampledPixels = Math.floor(len / (4 * sampleStep));
  return diff / sampledPixels;
}

// Simple VAD (Voice Activity Detection)
function detectVoiceActivity(
  analyser: AnalyserNode,
  threshold: number = 15
): boolean {
  const dataArray = new Uint8Array(analyser.frequencyBinCount);
  analyser.getByteFrequencyData(dataArray);

  let sum = 0;
  for (let i = 0; i < dataArray.length; i++) {
    sum += dataArray[i];
  }
  const average = sum / dataArray.length;
  return average > threshold;
}

// Convert WebM audio blob to WAV format (required by ASR backend)
async function convertWebMToWav(blob: Blob): Promise<Blob> {
  const arrayBuffer = await blob.arrayBuffer();
  const audioContext = new AudioContext({ sampleRate: 16000 });
  try {
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    const numChannels = 1;
    const sampleRate = audioBuffer.sampleRate;
    const format = 1;
    const bitDepth = 16;

    const bytesPerSample = bitDepth / 8;
    const blockAlign = numChannels * bytesPerSample;
    const dataLength = audioBuffer.length * blockAlign;
    const headerLength = 44;
    const totalLength = headerLength + dataLength;

    const wavBuffer = new ArrayBuffer(totalLength);
    const view = new DataView(wavBuffer);

    writeString(view, 0, 'RIFF');
    view.setUint32(4, totalLength - 8, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, format, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);
    writeString(view, 36, 'data');
    view.setUint32(40, dataLength, true);

    const channelData = audioBuffer.getChannelData(0);
    let offset = 44;
    for (let i = 0; i < channelData.length; i++) {
      const sample = Math.max(-1, Math.min(1, channelData[i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
      offset += 2;
    }

    return new Blob([wavBuffer], { type: 'audio/wav' });
  } finally {
    await audioContext.close();
  }
}

function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

// ==================== Main Component ====================
export default function AIVisionAssistant() {
  // State
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isTtsEnabled, setIsTtsEnabled] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSendingImage, setIsSendingImage] = useState(false);
  const [vadThreshold, setVadThreshold] = useState(15);
  const [frameInterval, setFrameInterval] = useState(2000);
  const [costStats, setCostStats] = useState<CostStats>({
    visionCalls: 0,
    textCalls: 0,
    asrCalls: 0,
    ttsCalls: 0,
    framesSent: 0,
    framesSkipped: 0,
    imagesCompressed: 0,
    totalApiCalls: 0,
  });

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const isRecordingRef = useRef(false);
  const vadIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const frameIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const currentImageBase64Ref = useRef<string | null>(null);
  const prevFrameDataRef = useRef<ImageData | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ==================== Camera ====================
  const toggleCamera = useCallback(async () => {
    if (isCameraOn) {
      // Turn off
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      if (frameIntervalRef.current) {
        clearInterval(frameIntervalRef.current);
        frameIntervalRef.current = null;
      }
      setIsCameraOn(false);
      currentImageBase64Ref.current = null;
      prevFrameDataRef.current = null;
    } else {
      // Turn on
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setIsCameraOn(true);

        // Start frame sampling
        frameIntervalRef.current = setInterval(() => {
          if (!videoRef.current || !canvasRef.current || !isCameraOn) return;

          const video = videoRef.current;
          const canvas = canvasRef.current;
          const ctx = canvas.getContext('2d');
          if (!ctx) return;

          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx.drawImage(video, 0, 0);

          // Scene change detection
          const currentFrame = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const diff = calculateFrameDifference(prevFrameDataRef.current, currentFrame);

          if (diff > 0.05) {
            // Scene changed - capture and compress
            const compressed = compressImage(canvas);
            currentImageBase64Ref.current = compressed;
            prevFrameDataRef.current = currentFrame;
            setCostStats(prev => ({
              ...prev,
              framesSent: prev.framesSent + 1,
              imagesCompressed: prev.imagesCompressed + 1,
            }));
          } else {
            setCostStats(prev => ({
              ...prev,
              framesSkipped: prev.framesSkipped + 1,
            }));
          }
        }, frameInterval);
      } catch (err: any) {
        setError('无法访问摄像头: ' + err.message);
      }
    }
  }, [isCameraOn, frameInterval]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (frameIntervalRef.current) clearInterval(frameIntervalRef.current);
      if (vadIntervalRef.current) clearInterval(vadIntervalRef.current);
      if (currentAudioRef.current) currentAudioRef.current.pause();
    };
  }, []);

  // ==================== Microphone ====================
  const startListening = useCallback(async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000,
        },
      });

      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : 'audio/webm',
      });

      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const webmBlob = new Blob(audioChunksRef.current, {
          type: 'audio/webm',
        });

        try {
          const wavBlob = await convertWebMToWav(webmBlob);

          const reader = new FileReader();
          reader.onloadend = async () => {
            const base64Audio = reader.result as string;
            try {
              const response = await fetch('/api/asr', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ audioBase64: base64Audio }),
              });

              const result = await response.json();
              if (result.success && result.text) {
                setInputText(result.text);
                handleSendMessage(result.text);
              }
              setCostStats((prev) => ({
                ...prev,
                asrCalls: prev.asrCalls + 1,
                totalApiCalls: prev.totalApiCalls + 1,
              }));
            } catch (err: any) {
              setError('语音识别失败: ' + err.message);
            }
          };
          reader.readAsDataURL(wavBlob);
        } catch (err: any) {
          setError('音频格式转换失败: ' + err.message);
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      isRecordingRef.current = true;
      setIsListening(true);

      let silenceStart: number | null = null;
      const SILENCE_TIMEOUT = 2000;
      const MIN_RECORDING_TIME = 1000;
      const startTime = Date.now();

      vadIntervalRef.current = setInterval(() => {
        if (!analyserRef.current || !isRecordingRef.current) return;

        const isVoice = detectVoiceActivity(analyserRef.current, vadThreshold);

        if (isVoice) {
          silenceStart = null;
        } else {
          if (!silenceStart) {
            silenceStart = Date.now();
          } else if (
            Date.now() - silenceStart > SILENCE_TIMEOUT &&
            Date.now() - startTime > MIN_RECORDING_TIME
          ) {
            stopListening();
          }
        }
      }, 200);
    } catch (err: any) {
      setError('无法访问麦克风: ' + err.message);
    }
  }, [vadThreshold]);

  const stopListening = useCallback(() => {
    if (vadIntervalRef.current) {
      clearInterval(vadIntervalRef.current);
      vadIntervalRef.current = null;
    }

    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === 'recording'
    ) {
      mediaRecorderRef.current.stop();
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    isRecordingRef.current = false;
    setIsListening(false);
  }, []);

  // ==================== Send Message ====================
  const handleSendMessage = useCallback(
    async (text?: string) => {
      const messageText = text || inputText;
      if (!messageText.trim() || isLoading) return;

      setIsLoading(true);
      setError(null);

      const userMsg: ChatMessage = {
        id: Date.now().toString(),
        role: 'user',
        content: messageText,
        timestamp: Date.now(),
        hasImage: !!currentImageBase64Ref.current && isCameraOn,
      };
      setMessages((prev) => [...prev, userMsg]);
      setInputText('');

      try {
        const history = messages.slice(-10).map((msg) => ({
          role: msg.role,
          content: msg.content,
        }));

        const hasImage = !!currentImageBase64Ref.current && isCameraOn;

        const response = await fetch('/api/vision-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: messageText,
            imageBase64: hasImage ? currentImageBase64Ref.current : null,
            history: history,
            hasImage: hasImage,
          }),
        });

        const result = await response.json();

        if (result.success) {
          const assistantMsg: ChatMessage = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: result.response,
            timestamp: Date.now(),
            mode: result.mode,
          };
          setMessages((prev) => [...prev, assistantMsg]);

          if (isTtsEnabled && result.response) {
            speakText(result.response);
          }

          setCostStats((prev) => ({
            ...prev,
            [result.mode === 'vision' ? 'visionCalls' : 'textCalls']:
              result.mode === 'vision'
                ? prev.visionCalls + 1
                : prev.textCalls + 1,
            totalApiCalls: prev.totalApiCalls + 1,
          }));
        } else {
          setError(result.error || '对话请求失败');
        }
      } catch (err: any) {
        setError('网络错误: ' + err.message);
      } finally {
        setIsLoading(false);
      }
    },
    [inputText, isLoading, messages, isCameraOn, isTtsEnabled]
  );

  // ==================== TTS ====================
  const speakText = useCallback(
    async (text: string) => {
      try {
        if (currentAudioRef.current) {
          currentAudioRef.current.pause();
          currentAudioRef.current = null;
        }

        setIsSpeaking(true);

        const response = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: text.substring(0, 1024),
            voice: 'longxiaochun',
            speed: 1.0,
          }),
        });

        if (!response.ok) {
          throw new Error('TTS failed');
        }

        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);

        currentAudioRef.current = audio;

        audio.onended = () => {
          setIsSpeaking(false);
          URL.revokeObjectURL(audioUrl);
          currentAudioRef.current = null;
        };

        audio.onerror = () => {
          setIsSpeaking(false);
          URL.revokeObjectURL(audioUrl);
          currentAudioRef.current = null;
        };

        await audio.play();

        setCostStats((prev) => ({
          ...prev,
          ttsCalls: prev.ttsCalls + 1,
        }));
      } catch (err) {
        setIsSpeaking(false);
      }
    },
    []
  );

  const stopSpeaking = useCallback(() => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    setIsSpeaking(false);
  }, []);

  // ==================== Render ====================
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white">
      {/* Header */}
      <header className="border-b border-white/10 backdrop-blur-sm bg-black/20">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold">AI 视觉对话助手</h1>
              <p className="text-xs text-slate-400">看得见、听得着的智能助手</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs border-white/20">
              灵积 DashScope
            </Badge>
            {isCameraOn && (
              <Badge className="text-xs bg-green-600">
                <Camera className="w-3 h-3 mr-1" /> 摄像头
              </Badge>
            )}
            {isListening && (
              <Badge className="text-xs bg-red-600 animate-pulse">
                <Mic className="w-3 h-3 mr-1" /> 录音中
              </Badge>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[calc(100vh-100px)]">
          {/* Left: Camera + Controls */}
          <div className="lg:col-span-1 flex flex-col gap-4">
            {/* Camera Preview */}
            <Card className="bg-white/5 border-white/10 overflow-hidden">
              <div className="p-3 border-b border-white/10 flex items-center justify-between">
                <span className="text-sm font-medium flex items-center gap-2">
                  <Camera className="w-4 h-4" /> 摄像头预览
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleCamera}
                  className={isCameraOn ? 'text-red-400 hover:text-red-300' : 'text-green-400 hover:text-green-300'}
                >
                  {isCameraOn ? <CameraOff className="w-4 h-4" /> : <Camera className="w-4 h-4" />}
                  {isCameraOn ? '关闭' : '开启'}
                </Button>
              </div>
              <div className="relative aspect-video bg-black">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover ${isCameraOn ? '' : 'hidden'}`}
                />
                <canvas ref={canvasRef} className="hidden" />
                {!isCameraOn && (
                  <div className="absolute inset-0 flex items-center justify-center text-slate-500">
                    <div className="text-center">
                      <Camera className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">点击上方按钮开启摄像头</p>
                    </div>
                  </div>
                )}
                {isCameraOn && currentImageBase64Ref.current && (
                  <div className="absolute top-2 right-2">
                    <Badge className="text-xs bg-blue-600">
                      <Eye className="w-3 h-3 mr-1" /> AI 可见
                    </Badge>
                  </div>
                )}
              </div>
            </Card>

            {/* Controls */}
            <Card className="bg-white/5 border-white/10">
              <div className="p-3 border-b border-white/10">
                <span className="text-sm font-medium flex items-center gap-2">
                  <Settings className="w-4 h-4" /> 控制面板
                </span>
              </div>
              <div className="p-3 space-y-3">
                {/* Mic Button */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-300">语音输入</span>
                  <Button
                    variant={isListening ? 'destructive' : 'default'}
                    size="sm"
                    onClick={isListening ? stopListening : startListening}
                    className={isListening ? 'animate-pulse' : ''}
                  >
                    {isListening ? <MicOff className="w-4 h-4 mr-1" /> : <Mic className="w-4 h-4 mr-1" />}
                    {isListening ? '停止录音' : '开始说话'}
                  </Button>
                </div>

                <Separator className="bg-white/10" />

                {/* TTS Toggle */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-300">语音回复</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsTtsEnabled(!isTtsEnabled)}
                    className={isTtsEnabled ? 'text-green-400' : 'text-slate-500'}
                  >
                    {isTtsEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                    {isTtsEnabled ? '已开启' : '已关闭'}
                  </Button>
                </div>

                {isSpeaking && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-blue-300">正在播报...</span>
                    <Button variant="ghost" size="sm" onClick={stopSpeaking} className="text-red-400">
                      停止
                    </Button>
                  </div>
                )}

                <Separator className="bg-white/10" />

                {/* VAD Threshold */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-slate-400">VAD 灵敏度</span>
                    <span className="text-xs text-slate-500">{vadThreshold}</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="40"
                    value={vadThreshold}
                    onChange={(e) => setVadThreshold(Number(e.target.value))}
                    className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                {/* Frame Interval */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-slate-400">帧采样间隔</span>
                    <span className="text-xs text-slate-500">{frameInterval}ms</span>
                  </div>
                  <input
                    type="range"
                    min="500"
                    max="5000"
                    step="500"
                    value={frameInterval}
                    onChange={(e) => setFrameInterval(Number(e.target.value))}
                    className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              </div>
            </Card>

            {/* Cost Stats */}
            <Card className="bg-white/5 border-white/10">
              <div className="p-3 border-b border-white/10">
                <span className="text-sm font-medium flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" /> 成本统计
                </span>
              </div>
              <div className="p-3">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-white/5 rounded-lg p-2">
                    <div className="text-slate-400">视觉调用</div>
                    <div className="text-lg font-bold text-blue-400">{costStats.visionCalls}</div>
                  </div>
                  <div className="bg-white/5 rounded-lg p-2">
                    <div className="text-slate-400">文字调用</div>
                    <div className="text-lg font-bold text-green-400">{costStats.textCalls}</div>
                  </div>
                  <div className="bg-white/5 rounded-lg p-2">
                    <div className="text-slate-400">ASR 调用</div>
                    <div className="text-lg font-bold text-yellow-400">{costStats.asrCalls}</div>
                  </div>
                  <div className="bg-white/5 rounded-lg p-2">
                    <div className="text-slate-400">TTS 调用</div>
                    <div className="text-lg font-bold text-purple-400">{costStats.ttsCalls}</div>
                  </div>
                  <div className="bg-white/5 rounded-lg p-2">
                    <div className="text-slate-400">帧已发送</div>
                    <div className="text-lg font-bold text-cyan-400">{costStats.framesSent}</div>
                  </div>
                  <div className="bg-white/5 rounded-lg p-2">
                    <div className="text-slate-400">帧已跳过</div>
                    <div className="text-lg font-bold text-slate-400">{costStats.framesSkipped}</div>
                  </div>
                </div>
                <div className="mt-2 text-xs text-slate-500 text-center">
                  总 API 调用: {costStats.totalApiCalls} | 节省率: {
                    costStats.framesSent + costStats.framesSkipped > 0
                      ? Math.round((costStats.framesSkipped / (costStats.framesSent + costStats.framesSkipped)) * 100)
                      : 0
                  }%
                </div>
              </div>
            </Card>
          </div>

          {/* Right: Chat */}
          <div className="lg:col-span-2 flex flex-col">
            <Card className="bg-white/5 border-white/10 flex-1 flex flex-col">
              <div className="p-3 border-b border-white/10 flex items-center justify-between">
                <span className="text-sm font-medium flex items-center gap-2">
                  <MessageCircle className="w-4 h-4" /> 对话
                </span>
                {messages.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setMessages([])}
                    className="text-slate-400 hover:text-red-400"
                  >
                    <Trash2 className="w-3 h-3 mr-1" /> 清空
                  </Button>
                )}
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 p-4">
                {messages.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-slate-500">
                    <div className="text-center space-y-4">
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-600/20 flex items-center justify-center mx-auto">
                        <Sparkles className="w-8 h-8 text-blue-400" />
                      </div>
                      <div>
                        <p className="text-lg font-medium text-slate-300">开始对话</p>
                        <p className="text-sm mt-1">开启摄像头和麦克风，或直接输入文字</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                            msg.role === 'user'
                              ? 'bg-blue-600 text-white'
                              : 'bg-white/10 text-slate-200'
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs opacity-50">
                              {new Date(msg.timestamp).toLocaleTimeString()}
                            </span>
                            {msg.hasImage && (
                              <Badge className="text-xs bg-blue-500/30 text-blue-300 px-1 py-0">
                                <Eye className="w-2 h-2 mr-0.5" /> 视觉
                              </Badge>
                            )}
                            {msg.mode === 'vision' && (
                              <Badge className="text-xs bg-purple-500/30 text-purple-300 px-1 py-0">
                                VLM
                              </Badge>
                            )}
                            {msg.mode === 'text' && (
                              <Badge className="text-xs bg-green-500/30 text-green-300 px-1 py-0">
                                LLM
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </ScrollArea>

              {/* Error */}
              {error && (
                <div className="px-4 py-2 bg-red-500/10 border-t border-red-500/20 flex items-center gap-2 text-red-400 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                  <Button variant="ghost" size="sm" onClick={() => setError(null)} className="ml-auto text-red-400 h-6 px-2">
                    关闭
                  </Button>
                </div>
              )}

              {/* Input */}
              <div className="p-3 border-t border-white/10">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  className="flex gap-2"
                >
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="输入消息或点击麦克风说话..."
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                    disabled={isLoading}
                  />
                  <Button
                    type="submit"
                    disabled={!inputText.trim() || isLoading}
                    className="rounded-xl px-4"
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </form>
                <div className="mt-2 flex items-center gap-3 text-xs text-slate-400">
                  <span className="flex items-center gap-1">
                    <Camera className={`h-3 w-3 ${isCameraOn ? 'text-green-500' : ''}`} />
                    摄像头{isCameraOn ? '已开启' : '未开启'}
                  </span>
                  <span className="flex items-center gap-1">
                    <Mic className={`h-3 w-3 ${isListening ? 'text-green-500' : ''}`} />
                    麦克风{isListening ? '录音中' : '就绪'}
                  </span>
                  <span className="flex items-center gap-1">
                    <Volume2 className={`h-3 w-3 ${isTtsEnabled ? 'text-green-500' : ''}`} />
                    语音回复{isTtsEnabled ? '已开启' : '已关闭'}
                  </span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
```

---

## 六、启动与测试

```bash
# 1. 确认 .env 中已填写 DASHSCOPE_API_KEY

# 2. 启动开发服务器
npm run dev

# 3. 打开浏览器访问 http://localhost:3000

# 4. 测试 API
# 测试 LLM 对话
curl -X POST http://localhost:3000/api/vision-chat \
  -H "Content-Type: application/json" \
  -d '{"message":"你好","hasImage":false}'

# 测试 TTS
curl -X POST http://localhost:3000/api/tts \
  -H "Content-Type: application/json" \
  -d '{"text":"你好世界"}' -o test.wav

# 测试 VLM 视觉对话（需要有效的 base64 图片）
curl -X POST http://localhost:3000/api/vision-chat \
  -H "Content-Type: application/json" \
  -d '{"message":"你看到了什么","hasImage":true,"imageBase64":"data:image/jpeg;base64,/9j/..."}'
```

---

## 七、模型与成本参考

| 用途 | 模型 | 价格（元/千token） | 备选（更便宜） |
|------|------|-------------------|--------------|
| LLM 对话 | qwen-max | 0.02 | qwen-plus (0.004) / qwen-turbo (0.001) |
| VLM 视觉 | qwen-vl-max | 0.02 | qwen-vl-plus (0.008) |
| ASR 识别 | paraformer-v2 | 0.02元/分钟 | paraformer-8k-v1 |
| TTS 合成 | cosyvoice-v2 | 0.01元/千字符 | sambert-zhichu-v1 |

如需降低成本，修改 `src/app/api/vision-chat/route.ts` 中的 model 参数即可：
- `qwen-max` → `qwen-plus` 或 `qwen-turbo`
- `qwen-vl-max` → `qwen-vl-plus`

---

## 八、成本控制策略说明

本应用内置了以下成本控制策略，均已在前端代码中实现：

1. **端侧 VAD**：仅在用户说话时才调用 ASR，静默段不消耗 API
2. **智能帧采样**：可调节帧采样间隔（500ms-5000ms），非对话时可降低频率
3. **图像压缩**：发送前缩放至 512px + JPEG 质量 0.6，减少视觉 token 消耗
4. **场景变化检测**：对比前后帧像素差异，画面无变化时不更新图像
5. **分级模型调用**：纯文字对话用 qwen-max（便宜），涉及视觉才用 qwen-vl-max
6. **上下文窗口管理**：对话历史只保留最近 10 条，减少输入 token
7. **TTS 文本截断**：限制 1024 字符，避免超长回复消耗过多
8. **成本统计仪表盘**：实时显示各类 API 调用次数和帧节省率
