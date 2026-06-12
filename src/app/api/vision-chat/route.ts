import { NextRequest, NextResponse } from "next/server";
import { chatCompletion, visionChatCompletion } from "@/lib/dashscope";

const SYSTEM_PROMPT = `你是一个友好、聪慧的AI视觉助手。你可以通过摄像头"看到"用户面前的场景，也可以通过语音和文字与用户交流。
回答时要简洁有趣，像朋友聊天一样自然。如果用户提供了图像，先描述你看到的内容，再回答问题。`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, imageBase64, history = [], hasImage } = body;

    if (!message?.trim()) {
      return NextResponse.json(
        { success: false, error: "消息不能为空" },
        { status: 400 }
      );
    }

    const messages: Array<{ role: string; content: any }> = [
      { role: "system", content: SYSTEM_PROMPT },
    ];

    const recentHistory = history.slice(-8);
    for (const msg of recentHistory) {
      messages.push({ role: msg.role, content: msg.content });
    }

    if (hasImage && imageBase64) {
      const imageUrl = imageBase64.startsWith("data:")
        ? imageBase64
        : `data:image/jpeg;base64,${imageBase64}`;

      messages.push({
        role: "user",
        content: [
          { type: "image_url", image_url: { url: imageUrl } },
          { type: "text", text: message },
        ],
      });

      const response = await visionChatCompletion(messages);
      return NextResponse.json({
        success: true,
        response,
        mode: "vision" as const,
      });
    } else {
      messages.push({ role: "user", content: message });
      const response = await chatCompletion(messages);
      return NextResponse.json({
        success: true,
        response,
        mode: "text" as const,
      });
    }
  } catch (error: any) {
    console.error("Vision chat error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "服务器错误" },
      { status: 500 }
    );
  }
}
