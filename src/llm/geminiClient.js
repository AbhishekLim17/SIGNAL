import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '../config/env.js';

let client;
let model;

function getModel() {
  if (!model) {
    client = new GoogleGenerativeAI(env.geminiApiKey);
    model = client.getGenerativeModel({ model: env.geminiModel });
  }
  return model;
}

function isRateLimitError(err) {
  const status = err?.status || err?.response?.status;
  return status === 429;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calls Gemini with a single automatic retry+backoff on rate-limit (429) errors,
 * since the free tier caps requests per minute.
 */
export async function generateText(prompt) {
  const m = getModel();
  try {
    const result = await m.generateContent(prompt);
    return result.response.text();
  } catch (err) {
    if (isRateLimitError(err)) {
      await sleep(15000);
      const result = await m.generateContent(prompt);
      return result.response.text();
    }
    throw err;
  }
}
