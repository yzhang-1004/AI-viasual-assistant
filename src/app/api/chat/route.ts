import { NextRequest, NextResponse } from "next/server";
import ZAI from "z-ai-web-dev-sdk";

// 单例模式复用 ZAI 实例
let zaiInstance: Awaited<ReturnType<typeof ZAI.create>> | null = null;

async function getZAI() {
  if (!zaiInstance) {
    zaiInstance = await ZAI.create();
  }
  return zaiInstance;
}

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface ChatRequest {
  messages: ChatMessage[];
  image?: string; // base64 data URL 或普通 URL
}

export async function POST(request: NextRequest) {
  try {
    const body: ChatRequest = await request.json();
    const { messages, image } = body;

    if (!messages || messages.length === 0) {
      return NextResponse.json(
        { error: "消息不能为空" },
        { status: 400 }
      );
    }

    // CC-06: 对话历史压缩 - 只保留最近 10 条消息
    const limitedMessages = messages.slice(-10);

    const zai = await getZAI();

    // CC-05: 分级模型调用
    if (image) {
      // 有图像时使用 VLM (createVision)
      const lastMessage = limitedMessages[limitedMessages.length - 1];
      const otherMessages = limitedMessages.slice(0, -1);

      const visionMessages = [
        ...otherMessages.map((m) => ({
          role: m.role as "system" | "user" | "assistant",
          content: m.content,
        })),
        {
          role: "user" as const,
          content: [
            { type: "text" as const, text: lastMessage.content },
            {
              type: "image_url" as const,
              image_url: { url: image },
            },
          ],
        },
      ];

      const response = await zai.chat.completions.createVision({
        model: "glm-4v-flash",
        messages: visionMessages,
        thinking: { type: "disabled" },
      } as Parameters<typeof zai.chat.completions.createVision>[0]);

      const reply = response.choices[0]?.message?.content || "抱歉，我无法理解这个画面。";

      return NextResponse.json({
        reply,
        model: "vlm",
        usage: response.usage,
      });
    } else {
      // 无图像时使用普通 LLM (create)
      const response = await zai.chat.completions.create({
        messages: [
          {
            role: "system",
            content:
              "你是一个智能对话助手，请用中文回答用户的问题。如果用户之前发送过图片，你可以参考图片内容进行对话。",
          },
          ...limitedMessages.map((m) => ({
            role: m.role as "system" | "user" | "assistant",
            content: m.content,
          })),
        ],
      });

      const reply = response.choices[0]?.message?.content || "抱歉，我无法回答这个问题。";

      return NextResponse.json({
        reply,
        model: "llm",
        usage: response.usage,
      });
    }
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "服务器内部错误" },
      { status: 500 }
    );
  }
}
