import { env } from "./env";

// ─── Puter.js Server-Side AI Client ──────────────────────────────────────────
// Uses Puter.js Node.js SDK for unlimited, free AI (Claude, GPT, Gemini).
// User-pays model: each user covers their own usage. No API keys needed.
// Auth token obtained via browser login or environment variable.

let puterInstance: any = null;

function getPuter(): any {
  if (puterInstance) return puterInstance;

  const token = env.puterAuthToken;
  if (!token) throw new Error("PUTER_AUTH_TOKEN not configured — sign in at Puter to get a token");

  const loadPuter = new Function("return require('@heyputer/puter.js/src/init.cjs')");
  const { init } = loadPuter();
  puterInstance = init(token);
  return puterInstance;
}

export async function generateContent(prompt: string, model: string = "claude-sonnet-4-6"): Promise<string> {
  const puter = getPuter();
  const result = await puter.ai.chat(prompt, { model });

  if (typeof result === "string") return result.trim();
  if (result?.message?.content?.[0]?.text) return result.message.content[0].text.trim();
  if (result?.text) return result.text.trim();
  if (Array.isArray(result?.message?.content)) {
    return result.message.content.map((c: any) => c?.text || "").filter(Boolean).join("\n").trim();
  }
  return JSON.stringify(result, null, 2);
}

export function resetPuter(): void {
  puterInstance = null;
}
