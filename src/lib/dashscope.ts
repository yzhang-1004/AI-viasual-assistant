/**
 * DashScope API Client
 * 阿里云灵积 API 封装 - LLM / VLM / ASR / TTS
 */

const BASE_URL = "https://dashscope.aliyuncs.com/compatible-mode/v1";

function getApiKey(): string {
  const key = process.env.DASHSCOPE_API_KEY;
  if (!key) throw new Error("DASHSCOPE_API_KEY 未配置");
  return key;
}

function cleanResponse(text: string): string {
  return text.replace(/<think[\s\S]*?<\/think>/g, "").trim();
}

/** LLM 文字对话 */
export async function chatCompletion(
  messages: Array<{ role: string; content: string }>,
  options?: { temperature?: number; maxTokens?: number }
) {
  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "qwen-max",
      messages,
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens ?? 1024,
    }),
  });
  if (!res.ok) throw new Error(`LLM API error: ${res.status}`);
  const data = await res.json();
  return cleanResponse(data.choices[0].message.content);
}

/** VLM 视觉对话 */
export async function visionChatCompletion(
  messages: Array<{ role: string; content: any }>,
  options?: { temperature?: number; maxTokens?: number }
) {
  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "qwen-vl-max",
      messages,
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens ?? 1024,
    }),
  });
  if (!res.ok) throw new Error(`VLM API error: ${res.status}`);
  const data = await res.json();
  return cleanResponse(data.choices[0].message.content);
}

/** ASR 语音识别 */
export async function speechRecognition(audioBase64: string): Promise<string> {
  const rawAudio = audioBase64.replace(/^data:[^;]+;base64,/, "");

  const res = await fetch(
    "https://dashscope.aliyuncs.com/api/v1/services/audio/asr/transcription",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${getApiKey()}`,
        "Content-Type": "application/json",
        "X-DashScope-Async": "false",
      },
      body: JSON.stringify({
        model: "paraformer-v2",
        input: { audio: rawAudio },
        parameters: { format: "wav", sample_rate: 16000 },
      }),
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`ASR API error: ${res.status} - ${errText}`);
  }

  const data = await res.json();
  const results = data?.output?.results;
  if (results && results.length > 0 && results[0].text) {
    return results[0].text;
  }
  return data?.output?.text || "";
}

/** TTS 语音合成 - 使用 OpenAI 兼容接口 */
export async function speechSynthesis(
  text: string,
  options?: { voice?: string; speed?: number }
): Promise<Buffer> {
  const res = await fetch(`${BASE_URL}/audio/speech`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "cosyvoice-v2",
      input: text.slice(0, 1024),
      voice: options?.voice || "longxiaochun",
      speed: options?.speed || 1.0,
      response_format: "wav",
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`TTS API error: ${res.status} - ${errText}`);
  }

  const arrayBuf = await res.arrayBuffer();
  return Buffer.from(arrayBuf);
}
