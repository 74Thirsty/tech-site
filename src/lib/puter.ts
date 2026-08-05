import { env } from "./env";

// ─── Puter.js Server-Side AI Client ──────────────────────────────────────────
// Uses Puter's OpenAI-compatible endpoint via fetch.
// User-pays model: each user covers their own usage.

const PUTER_API = "https://api.puter.com/puterai/openai/v1/chat/completions";

export async function generateContent(prompt: string, model: string = "claude-sonnet-4-6"): Promise<string> {
  const token = env.puterAuthToken;
  if (!token) throw new Error("PUTERJS_API_KEY not configured — add to KWallet or .env.local");

  const response = await fetch(PUTER_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Puter API ${response.status}: ${body.slice(0, 200)}`);
  }

  const data = await response.json();

  // OpenAI-compatible response format
  if (data?.choices?.[0]?.message?.content) return data.choices[0].message.content.trim();
  // Fallbacks
  if (typeof data === "string") return data.trim();
  if (data?.message?.content?.[0]?.text) return data.message.content[0].text.trim();
  if (data?.text) return data.text.trim();
  return JSON.stringify(data, null, 2);
}
