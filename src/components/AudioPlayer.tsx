"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { Volume2, VolumeX } from "lucide-react";

export function useAudioPlayer() {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const playAudio = useCallback((base64Audio: string, format = "mp3") => {
    // 停止之前的播放
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    const audioBlob = base64ToBlob(base64Audio, `audio/${format}`);
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);
    audioRef.current = audio;

    setIsPlaying(true);

    audio.onended = () => {
      setIsPlaying(false);
      URL.revokeObjectURL(audioUrl);
    };

    audio.onerror = () => {
      setIsPlaying(false);
      URL.revokeObjectURL(audioUrl);
    };

    audio.play().catch(() => {
      setIsPlaying(false);
      URL.revokeObjectURL(audioUrl);
    });
  }, []);

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  // 清理
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  return { isPlaying, playAudio, stopAudio };
}

function base64ToBlob(base64: string, mimeType: string): Blob {
  const byteChars = atob(base64);
  const byteNumbers = new Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) {
    byteNumbers[i] = byteChars.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
}

// UI 组件：音频播放状态指示器
export function AudioIndicator({ isPlaying }: { isPlaying: boolean }) {
  if (!isPlaying) return null;

  return (
    <div className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1">
      <Volume2 className="h-3.5 w-3.5 animate-pulse text-primary" />
      <span className="text-xs text-primary">正在播放语音...</span>
    </div>
  );
}

export function AudioMutedIndicator() {
  return (
    <div className="flex items-center gap-1.5 rounded-full bg-muted px-3 py-1">
      <VolumeX className="h-3.5 w-3.5 text-muted-foreground" />
      <span className="text-xs text-muted-foreground">语音已关闭</span>
    </div>
  );
}
