"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Camera, Mic, Volume2, Settings } from "lucide-react";

interface ControlPanelProps {
  isCameraOn: boolean;
  isMicOn: boolean;
  isTtsEnabled: boolean;
  vadThreshold: number;
  onToggleCamera: () => void;
  onToggleMic: () => void;
  onToggleTts: () => void;
  onVadThresholdChange: (value: number) => void;
  volume: number;
}

export function ControlPanel({
  isCameraOn,
  isMicOn,
  isTtsEnabled,
  vadThreshold,
  onToggleCamera,
  onToggleMic,
  onToggleTts,
  onVadThresholdChange,
  volume,
}: ControlPanelProps) {
  return (
    <Card className="border-0 bg-card shadow-lg">
      <CardHeader className="px-4 py-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <Settings className="h-4 w-4" />
          控制面板
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 px-4 pb-4">
        {/* 摄像头 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Camera className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">摄像头</span>
          </div>
          <Switch checked={isCameraOn} onCheckedChange={onToggleCamera} />
        </div>

        {/* 麦克风 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mic className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">麦克风</span>
          </div>
          <Switch checked={isMicOn} onCheckedChange={onToggleMic} />
        </div>

        {/* 音量指示器 */}
        {isMicOn && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>音量</span>
              <span>{Math.round(volume)}</span>
            </div>
            <div className="h-2 w-full rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-green-500 transition-all duration-100"
                style={{
                  width: `${Math.min(100, (volume / 100) * 100)}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* TTS 语音回复 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Volume2 className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">语音回复</span>
          </div>
          <Switch checked={isTtsEnabled} onCheckedChange={onToggleTts} />
        </div>

        {/* VAD 灵敏度 */}
        {isMicOn && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>VAD 灵敏度</span>
              <span>{vadThreshold}</span>
            </div>
            <Slider
              value={[vadThreshold]}
              onValueChange={(val) => onVadThresholdChange(Array.isArray(val) ? val[0] : val)}
              min={5}
              max={100}
              step={5}
            />
            <p className="text-[10px] text-muted-foreground">
              值越低，对声音越敏感
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
