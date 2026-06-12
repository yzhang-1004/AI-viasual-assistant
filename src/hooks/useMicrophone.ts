"use client";

import { useState, useRef, useCallback, useEffect } from "react";

interface UseMicrophoneOptions {
  vadThreshold?: number;
  silenceDuration?: number;
  onRecordingComplete?: (audioBase64: string) => void;
  onVolumeChange?: (volume: number) => void;
}

export function useMicrophone(options: UseMicrophoneOptions = {}) {
  const {
    vadThreshold = 25,
    silenceDuration = 1500,
    onRecordingComplete,
    onVolumeChange,
  } = options;

  const [isListening, setIsListening] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [volume, setVolume] = useState(0);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const animFrameRef = useRef<number>(0);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isRecordingRef = useRef(false);

  // 使用 ref 保存最新的回调，避免循环依赖
  const onRecordingCompleteRef = useRef(onRecordingComplete);
  const onVolumeChangeRef = useRef(onVolumeChange);
  const vadThresholdRef = useRef(vadThreshold);
  const silenceDurationRef = useRef(silenceDuration);

  useEffect(() => {
    onRecordingCompleteRef.current = onRecordingComplete;
    onVolumeChangeRef.current = onVolumeChange;
    vadThresholdRef.current = vadThreshold;
    silenceDurationRef.current = silenceDuration;
  }, [onRecordingComplete, onVolumeChange, vadThreshold, silenceDuration]);

  // stopRecording 定义在前（不依赖其他回调）
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    isRecordingRef.current = false;
    setIsRecording(false);
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  // startRecording 定义在后（不依赖 monitorVolume）
  const startRecording = useCallback(() => {
    if (!streamRef.current || isRecordingRef.current) return;

    try {
      const mediaRecorder = new MediaRecorder(streamRef.current, {
        mimeType: "audio/webm;codecs=opus",
      });

      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const arrayBuffer = await blob.arrayBuffer();
        const base64 = btoa(
          new Uint8Array(arrayBuffer).reduce(
            (data, byte) => data + String.fromCharCode(byte),
            ""
          )
        );
        onRecordingCompleteRef.current?.(base64);
      };

      mediaRecorder.start(100);
      mediaRecorderRef.current = mediaRecorder;
      isRecordingRef.current = true;
      setIsRecording(true);
    } catch (err) {
      console.error("Recording error:", err);
    }
  }, []);

  // CC-01: VAD 音量监测 - 使用 ref 调用避免声明顺序问题
  const monitorVolumeRef = useRef<() => void>(() => {});

  useEffect(() => {
    monitorVolumeRef.current = () => {
      if (!analyserRef.current) return;

      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
      analyserRef.current.getByteFrequencyData(dataArray);

      const sum = dataArray.reduce((acc, val) => acc + val, 0);
      const avgVolume = sum / dataArray.length;

      setVolume(avgVolume);
      onVolumeChangeRef.current?.(avgVolume);

      if (avgVolume > vadThresholdRef.current) {
        if (!isRecordingRef.current) {
          startRecording();
        }
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = null;
        }
      } else {
        if (isRecordingRef.current && !silenceTimerRef.current) {
          silenceTimerRef.current = setTimeout(() => {
            stopRecording();
          }, silenceDurationRef.current);
        }
      }

      animFrameRef.current = requestAnimationFrame(() => monitorVolumeRef.current());
    };
  }, [startRecording, stopRecording]);

  const startListening = useCallback(async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      streamRef.current = stream;

      const audioContext = new AudioContext({ sampleRate: 16000 });
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      setIsListening(true);
      animFrameRef.current = requestAnimationFrame(() => monitorVolumeRef.current());
    } catch (err) {
      const message = err instanceof Error ? err.message : "无法访问麦克风";
      setError(message);
      console.error("Microphone error:", err);
    }
  }, []);

  const stopListening = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = 0;
    }
    stopRecording();
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    analyserRef.current = null;
    setIsListening(false);
    setVolume(0);
  }, [stopRecording]);

  useEffect(() => {
    return () => {
      stopListening();
    };
  }, [stopListening]);

  return {
    isListening,
    isRecording,
    error,
    volume,
    startListening,
    stopListening,
    startRecording,
    stopRecording,
  };
}
