"use client";

import { useState, useRef, useCallback, useEffect } from "react";

interface UseCameraOptions {
  onFrameCapture?: (imageDataUrl: string) => void;
  onSceneChange?: (imageDataUrl: string) => void;
}

export function useCamera(options: UseCameraOptions = {}) {
  const { onFrameCapture, onSceneChange } = options;

  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const lastFrameDataRef = useRef<ImageData | null>(null);

  // CC-03: 图像压缩参数
  const COMPRESSED_WIDTH = 512;
  const JPEG_QUALITY = 0.6;

  // CC-04: 场景变化检测阈值
  const SCENE_CHANGE_THRESHOLD = 0.05; // 5%

  const startCamera = useCallback(async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setIsStreaming(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : "无法访问摄像头";
      setError(message);
      console.error("Camera error:", err);
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsStreaming(false);
    lastFrameDataRef.current = null;
  }, []);

  // 捕获当前帧并压缩
  const captureFrame = useCallback((): string | null => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return null;

    // 使用或创建 canvas
    if (!canvasRef.current) {
      canvasRef.current = document.createElement("canvas");
    }
    const canvas = canvasRef.current;

    // CC-03: 缩放至 512px 宽度，保持宽高比
    const scale = COMPRESSED_WIDTH / video.videoWidth;
    canvas.width = COMPRESSED_WIDTH;
    canvas.height = Math.round(video.videoHeight * scale);

    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", JPEG_QUALITY);
  }, []);

  // CC-04: 场景变化检测
  const detectSceneChange = useCallback((): boolean => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return false;

    if (!canvasRef.current) {
      canvasRef.current = document.createElement("canvas");
    }
    const canvas = canvasRef.current;

    // 使用较小的尺寸进行像素比较以提高性能
    const compareWidth = 128;
    const compareHeight = Math.round(
      (video.videoHeight / video.videoWidth) * compareWidth
    );
    canvas.width = compareWidth;
    canvas.height = compareHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return false;

    ctx.drawImage(video, 0, 0, compareWidth, compareHeight);
    const currentFrame = ctx.getImageData(0, 0, compareWidth, compareHeight);

    const lastFrame = lastFrameDataRef.current;
    lastFrameDataRef.current = currentFrame;

    if (!lastFrame) return true; // 首次总是认为有变化

    // 计算像素差异比例
    const data1 = lastFrame.data;
    const data2 = currentFrame.data;
    let diffCount = 0;
    const totalPixels = data1.length / 4;

    for (let i = 0; i < data1.length; i += 4) {
      const rDiff = Math.abs(data1[i] - data2[i]);
      const gDiff = Math.abs(data1[i + 1] - data2[i + 1]);
      const bDiff = Math.abs(data1[i + 2] - data2[i + 2]);
      const avgDiff = (rDiff + gDiff + bDiff) / 3;
      if (avgDiff > 30) {
        diffCount++;
      }
    }

    const changeRatio = diffCount / totalPixels;
    return changeRatio > SCENE_CHANGE_THRESHOLD;
  }, []);

  // 捕获帧并触发回调
  const captureAndNotify = useCallback(() => {
    const frame = captureFrame();
    if (frame && onFrameCapture) {
      onFrameCapture(frame);
    }
    return frame;
  }, [captureFrame, onFrameCapture]);

  // 检测场景变化并触发回调
  const checkSceneAndNotify = useCallback((): boolean => {
    const hasChange = detectSceneChange();
    if (hasChange) {
      const frame = captureFrame();
      if (frame && onSceneChange) {
        onSceneChange(frame);
      }
    }
    return hasChange;
  }, [detectSceneChange, captureFrame, onSceneChange]);

  // 清理
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  return {
    videoRef,
    isStreaming,
    error,
    startCamera,
    stopCamera,
    captureFrame,
    captureAndNotify,
    detectSceneChange,
    checkSceneAndNotify,
  };
}
