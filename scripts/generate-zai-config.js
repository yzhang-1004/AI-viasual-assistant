// scripts/generate-zai-config.js
// Vercel 构建时从环境变量生成 .z-ai-config 文件
const fs = require('fs');
const path = require('path');

const ZAI_BASE_URL = process.env.ZAI_BASE_URL;
const ZAI_API_KEY = process.env.ZAI_API_KEY;

if (!ZAI_BASE_URL || !ZAI_API_KEY) {
  console.log('[generate-zai-config] Skipping: ZAI_BASE_URL or ZAI_API_KEY not set');
  process.exit(0);
}

const config = {
  baseUrl: ZAI_BASE_URL,
  apiKey: ZAI_API_KEY,
};

if (process.env.ZAI_CHAT_ID) config.chatId = process.env.ZAI_CHAT_ID;
if (process.env.ZAI_TOKEN) config.token = process.env.ZAI_TOKEN;
if (process.env.ZAI_USER_ID) config.userId = process.env.ZAI_USER_ID;

const configPath = path.join(process.cwd(), '.z-ai-config');
fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
console.log('[generate-zai-config] .z-ai-config generated successfully');
