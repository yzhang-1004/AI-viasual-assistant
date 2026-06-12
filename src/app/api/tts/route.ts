import { NextRequest, NextResponse } from "next/server";
import { speechSynthesis } from "@/lib/dashscope";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text, voice = "longxiaochun", speed = 1.0 } = body;

    if (!text?.trim()) {
      return NextResponse.json(
        { success: false, error: "文本不能为空" },
        { status: 400 }
      );
    }

    if (text.length > 1024) {
      return NextResponse.json(
        { success: false, error: "文本过长（最大1024字符）" },
        { status: 400 }
      );
    }

    const audioBuffer = await speechSynthesis(text, { voice, speed });

    return new NextResponse(audioBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "audio/wav",
        "Content-Length": audioBuffer.length.toString(),
        "Cache-Control": "no-cache",
      },
    });
  } catch (error: any) {
    console.error("TTS error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "语音合成失败" },
      { status: 500 }
    );
  }
}
