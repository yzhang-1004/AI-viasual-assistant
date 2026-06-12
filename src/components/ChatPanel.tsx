"use client";

import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Send,
  Mic,
  MicOff,
  Eye,
  MessageSquare,
  Loader2,
  Trash2,
} from "lucide-react";
import type { ChatMessage } from "@/hooks/useDialogue";

interface ChatPanelProps {
  messages: ChatMessage[];
  isLoading: boolean;
  isRecording: boolean;
  onSendText: (text: string) => void;
  onSendPhoto: (text: string) => void;
  onToggleRecording: () => void;
  onClearMessages: () => void;
  capturedImage: string | null;
  onClearCapturedImage: () => void;
}

export function ChatPanel({
  messages,
  isLoading,
  isRecording,
  onSendText,
  onSendPhoto,
  onToggleRecording,
  onClearMessages,
  capturedImage,
  onClearCapturedImage,
}: ChatPanelProps) {
  const [inputText, setInputText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // 自动滚动到底部
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    const text = inputText.trim();
    if (!text) return;

    if (capturedImage) {
      onSendPhoto(text);
      onClearCapturedImage();
    } else {
      onSendText(text);
    }
    setInputText("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Card className="flex h-full flex-col border-0 bg-card shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between border-b px-4 py-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <MessageSquare className="h-4 w-4" />
          对话
        </CardTitle>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearMessages}
          disabled={messages.length === 0}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </CardHeader>

      <ScrollArea className="flex-1" ref={scrollRef}>
        <CardContent className="space-y-3 p-4">
          {messages.length === 0 && (
            <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
              开启对话，向 AI 提问吧
            </div>
          )}
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-3 py-2 ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground"
                }`}
              >
                <div className="mb-1 flex items-center gap-1.5">
                  <span className="text-xs font-medium opacity-70">
                    {msg.role === "user" ? "我" : "AI 助手"}
                  </span>
                  {msg.hasImage && (
                    <Badge variant="secondary" className="h-4 px-1 text-[10px]">
                      <Eye className="mr-0.5 h-2.5 w-2.5" />
                      视觉
                    </Badge>
                  )}
                </div>
                <p className="whitespace-pre-wrap text-sm leading-relaxed">
                  {msg.content}
                </p>
                <p className="mt-1 text-[10px] opacity-50">
                  {msg.timestamp.toLocaleTimeString("zh-CN", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="rounded-lg bg-muted px-3 py-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  AI 正在思考...
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </ScrollArea>

      {/* 拍照预览 */}
      {capturedImage && (
        <div className="border-t px-4 py-2">
          <div className="relative inline-block">
            <img
              src={capturedImage}
              alt="已捕获画面"
              className="h-16 w-24 rounded object-cover"
            />
            <button
              onClick={onClearCapturedImage}
              className="absolute -right-1 -top-1 rounded-full bg-red-500 p-0.5 text-white"
            >
              <span className="text-xs">&times;</span>
            </button>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">已附加画面截图</p>
        </div>
      )}

      {/* 输入区域 */}
      <div className="border-t p-3">
        <div className="flex items-center gap-2">
          <Button
            variant={isRecording ? "destructive" : "outline"}
            size="sm"
            onClick={onToggleRecording}
            className="shrink-0"
          >
            {isRecording ? (
              <MicOff className="h-4 w-4" />
            ) : (
              <Mic className="h-4 w-4" />
            )}
          </Button>
          <Input
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isRecording ? "正在录音..." : "输入消息，或按住麦克风说话"
            }
            disabled={isLoading}
            className="flex-1"
          />
          <Button
            size="sm"
            onClick={handleSend}
            disabled={isLoading || !inputText.trim()}
            className="shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
