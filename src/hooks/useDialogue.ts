"use client";

import { useState, useCallback, useRef } from "react";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  hasImage: boolean;
  timestamp: Date;
}

interface UseDialogueOptions {
  onAssistantReply?: (reply: string) => void;
  onModelUsed?: (model: "vlm" | "llm") => void;
}

export function useDialogue(options: UseDialogueOptions = {}) {
  const { onAssistantReply, onModelUsed } = options;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false); // CC-08: 请求节流
  const [error, setError] = useState<string | null>(null);

  const messageHistoryRef = useRef<
    Array<{ role: "user" | "assistant"; content: string }>
  >([]);

  const generateId = () =>
    `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // 发送消息（文字或视觉）
  const sendMessage = useCallback(
    async (content: string, image?: string) => {
      // CC-08: 请求节流 - loading 期间禁止重复发送
      if (isLoading || !content.trim()) return;

      setIsLoading(true);
      setError(null);

      const hasImage = !!image;
      const userMessage: ChatMessage = {
        id: generateId(),
        role: "user",
        content,
        hasImage,
        timestamp: new Date(),
      };

      // 添加到消息列表和历史
      setMessages((prev) => [...prev, userMessage]);
      messageHistoryRef.current.push({ role: "user", content });

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: messageHistoryRef.current.slice(-10), // CC-06: 最近10条
            image,
          }),
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || "请求失败");
        }

        const data = await response.json();
        const reply = data.reply;
        const model = data.model;

        // 通知使用的模型类型
        onModelUsed?.(model);

        const assistantMessage: ChatMessage = {
          id: generateId(),
          role: "assistant",
          content: reply,
          hasImage: false,
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, assistantMessage]);
        messageHistoryRef.current.push({ role: "assistant", content: reply });

        onAssistantReply?.(reply);

        return reply;
      } catch (err) {
        const message = err instanceof Error ? err.message : "发送失败";
        setError(message);

        const errorMessage: ChatMessage = {
          id: generateId(),
          role: "assistant",
          content: `抱歉，发生了错误：${message}`,
          hasImage: false,
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, errorMessage]);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, onAssistantReply, onModelUsed]
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
    messageHistoryRef.current = [];
    setError(null);
  }, []);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    clearMessages,
  };
}
