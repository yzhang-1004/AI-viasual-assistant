"use client";

import { useRef, useCallback, useEffect } from "react";

interface UseFrameSamplerOptions {
  /** 非对话状态采样间隔(ms)，默认 5000 */
  idleInterval?: number;
  /** 对话状态采样间隔(ms)，默认 2000 */
  activeInterval?: number;
  /** 每次采样时调用的函数 */
  onSample: () => void;
  /** 是否启用采样 */
  enabled: boolean;
  /** 当前是否处于对话状态 */
  isConversing: boolean;
}

export function useFrameSampler(options: UseFrameSamplerOptions) {
  const {
    idleInterval = 5000,
    activeInterval = 2000,
    onSample,
    enabled,
    isConversing,
  } = options;

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const onSampleRef = useRef(onSample);

  // 保持 onSample 引用最新
  useEffect(() => {
    onSampleRef.current = onSample;
  }, [onSample]);

  const currentInterval = isConversing ? activeInterval : idleInterval;

  const startSampling = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    timerRef.current = setInterval(() => {
      onSampleRef.current();
    }, currentInterval);
  }, [currentInterval]);

  const stopSampling = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // 根据 enabled 和间隔变化自动重启
  useEffect(() => {
    if (enabled) {
      startSampling();
    } else {
      stopSampling();
    }
    return stopSampling;
  }, [enabled, startSampling, stopSampling]);

  return {
    startSampling,
    stopSampling,
  };
}
