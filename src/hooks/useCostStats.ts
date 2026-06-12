"use client";

import { useState, useCallback } from "react";

export interface CostStats {
  vlmCalls: number;     // VLM 视觉理解调用次数
  llmCalls: number;     // LLM 文字对话调用次数
  asrCalls: number;     // ASR 语音识别调用次数
  ttsCalls: number;     // TTS 语音合成调用次数
  framesSent: number;   // 发送的帧数
  framesSkipped: number; // 跳过的帧数（无场景变化）
}

export function useCostStats() {
  const [stats, setStats] = useState<CostStats>({
    vlmCalls: 0,
    llmCalls: 0,
    asrCalls: 0,
    ttsCalls: 0,
    framesSent: 0,
    framesSkipped: 0,
  });

  const incrementVLM = useCallback(() => {
    setStats((prev) => ({ ...prev, vlmCalls: prev.vlmCalls + 1 }));
  }, []);

  const incrementLLM = useCallback(() => {
    setStats((prev) => ({ ...prev, llmCalls: prev.llmCalls + 1 }));
  }, []);

  const incrementASR = useCallback(() => {
    setStats((prev) => ({ ...prev, asrCalls: prev.asrCalls + 1 }));
  }, []);

  const incrementTTS = useCallback(() => {
    setStats((prev) => ({ ...prev, ttsCalls: prev.ttsCalls + 1 }));
  }, []);

  const incrementFrameSent = useCallback(() => {
    setStats((prev) => ({ ...prev, framesSent: prev.framesSent + 1 }));
  }, []);

  const incrementFrameSkipped = useCallback(() => {
    setStats((prev) => ({ ...prev, framesSkipped: prev.framesSkipped + 1 }));
  }, []);

  const resetStats = useCallback(() => {
    setStats({
      vlmCalls: 0,
      llmCalls: 0,
      asrCalls: 0,
      ttsCalls: 0,
      framesSent: 0,
      framesSkipped: 0,
    });
  }, []);

  const totalCalls = stats.vlmCalls + stats.llmCalls + stats.asrCalls + stats.ttsCalls;
  const frameSkipRate =
    stats.framesSent + stats.framesSkipped > 0
      ? Math.round((stats.framesSkipped / (stats.framesSent + stats.framesSkipped)) * 100)
      : 0;

  return {
    stats,
    incrementVLM,
    incrementLLM,
    incrementASR,
    incrementTTS,
    incrementFrameSent,
    incrementFrameSkipped,
    resetStats,
    totalCalls,
    frameSkipRate,
  };
}
