"use client";

import { RefObject } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Camera, CameraOff, ImageIcon } from "lucide-react";

interface VideoPreviewProps {
  videoRef: RefObject<HTMLVideoElement | null>;
  isStreaming: boolean;
  onToggleCamera: () => void;
  onCapturePhoto: () => void;
  error?: string | null;
}

export function VideoPreview({
  videoRef,
  isStreaming,
  onToggleCamera,
  onCapturePhoto,
  error,
}: VideoPreviewProps) {
  return (
    <Card className="overflow-hidden border-0 bg-card shadow-lg">
      <div className="relative aspect-video bg-black/90 rounded-t-lg">
        <video
          ref={videoRef}
          className="h-full w-full object-cover"
          playsInline
          muted
        />
        {!isStreaming && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60">
            <div className="text-center">
              <CameraOff className="mx-auto h-12 w-12 text-white/60" />
              <p className="mt-2 text-sm text-white/60">摄像头未开启</p>
            </div>
          </div>
        )}
        {error && (
          <div className="absolute bottom-2 left-2 right-2 rounded bg-red-500/90 px-3 py-1.5 text-xs text-white">
            {error}
          </div>
        )}
      </div>
      <div className="flex items-center gap-2 p-3">
        <Button
          variant={isStreaming ? "destructive" : "default"}
          size="sm"
          onClick={onToggleCamera}
          className="flex-1"
        >
          {isStreaming ? (
            <>
              <CameraOff className="mr-2 h-4 w-4" />
              关闭摄像头
            </>
          ) : (
            <>
              <Camera className="mr-2 h-4 w-4" />
              开启摄像头
            </>
          )}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onCapturePhoto}
          disabled={!isStreaming}
        >
          <ImageIcon className="mr-2 h-4 w-4" />
          拍照提问
        </Button>
      </div>
    </Card>
  );
}
