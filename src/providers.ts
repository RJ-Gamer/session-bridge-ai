import axios from "axios";
import { API_MODELS, API_URLS } from "./constants";

export async function callGemini(
  apiKey: string,
  prompt: string,
): Promise<string> {
  const response = await axios.post(
    API_URLS.GEMINI(apiKey),
    { contents: [{ parts: [{ text: prompt }] }] },
    { headers: { "content-type": "application/json" }, timeout: 30000 },
  );
  return response.data.candidates[0].content.parts[0].text;
}

export async function callClaude(
  apiKey: string,
  prompt: string,
): Promise<string> {
  const response = await axios.post(
    API_URLS.CLAUDE,
    {
      model: API_MODELS.CLAUDE,
      max_tokens: 1500,
      messages: [{ role: "user", content: prompt }],
    },
    {
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      timeout: 30000,
    },
  );
  return response.data.content[0].text;
}

export async function callOpenAI(
  apiKey: string,
  prompt: string,
): Promise<string> {
  const response = await axios.post(
    API_URLS.OPENAI,
    {
      model: API_MODELS.OPENAI,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 1500,
    },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      timeout: 30000,
    },
  );
  return response.data.choices[0].message.content;
}

export async function callAI(
  provider: string,
  apiKey: string,
  prompt: string,
): Promise<string> {
  switch (provider) {
    case "claude":
      return await callClaude(apiKey, prompt);
    case "openai":
      return await callOpenAI(apiKey, prompt);
    default:
      return await callGemini(apiKey, prompt);
  }
}
