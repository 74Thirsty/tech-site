import { env } from "./env";

// ─── Puter.js Server-Side AI Client ──────────────────────────────────────────
// Calls Puter REST API directly via fetch — no SDK, no require(), no eval.
// User-pays model: each user covers their own usage.
// Auth token obtained via browser sign-in or environment variable.

const PUTER_API = "https://puter-api.puter.com/v1/puter-ai/chat";

export async function generateContent(prompt: string, model: string = "claude-sonnet-4-6"): Promise<string> {
  const token = env.puterAuthToken;
  if (!token) throw new Error("PUTER_AUTH_TOKEN not configured — sign in at /control → SYSTEM tab");

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

  // Extract text from Puter ChatResponse
  if (typeof data === "string") return data.trim();
  if (data?.message?.content?.[0]?.text) return data.message.content[0].text.trim();
  if (data?.text) return data.text.trim();
  if (Array.isArray(data?.message?.content)) {
    return data.message.content.map((c: any) => c?.text || "").filter(Boolean).join("\n").trim();
  }
  return JSON.stringify(data, null, 2);
}
