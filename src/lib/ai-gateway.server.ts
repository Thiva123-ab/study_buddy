import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

/**
 * Creates an OpenAI-compatible AI provider.
 *
 * Configure via environment variables:
 *   OPENAI_API_KEY   – your API key (required)
 *   OPENAI_BASE_URL  – base URL for the provider (optional, defaults to OpenAI)
 *                      e.g. https://api.groq.com/openai/v1  (Groq)
 *                           https://api.together.xyz/v1      (Together AI)
 *                           https://api.openai.com/v1        (OpenAI, default)
 */
export function createAiProvider(apiKey: string, baseURL?: string) {
  return createOpenAICompatible({
    name: "ai-provider",
    baseURL: baseURL ?? "https://api.openai.com/v1",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });
}

export function getGateway() {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("Missing OPENAI_API_KEY environment variable");
  const baseURL = process.env.OPENAI_BASE_URL;
  return createAiProvider(key, baseURL);
}