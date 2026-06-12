import { NextRequest, NextResponse } from "next/server";
import { speechRecognition } from "@/lib/dashscope";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { audioBase64 } = body;

    if (!audioBase64) {
      return NextResponse.json(
        { success: false, error: "音频数据不能为空" },
        { status: 400 }
      );
    }

    const text = await speechRecognition(audioBase64);
    return NextResponse.json({
      success: true,
      text: text || "（未识别到语音内容）",
    });
  } catch (error: any) {
    console.error("ASR error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "语音识别失败" },
      { status: 500 }
    );
  }
}
