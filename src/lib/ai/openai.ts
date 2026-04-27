import OpenAI from "openai";

export const openAiModel = process.env.OPENAI_MODEL || "gpt-5.4-mini";

export function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) {
    return null;
  }

  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}
