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

  // Dynamic require to avoid bundling issues in edge/client contexts
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { init } = require("@heyputer/puter.js/src/init.cjs");
  puterInstance = init(token);
  return puterInstance;
}

/**
 * Generate text using Puter.js AI. Drop-in replacement for Gemini generateContent.
 * @param prompt - The prompt to send
 * @param model - Model name (default: "claude-sonnet-4-6")
 * @returns The generated text
 */
export async function generateContent(prompt: string, model: string = "claude-sonnet-4-6"): Promise<string> {
  const puter = getPuter();
  const result = await puter.ai.chat(prompt, { model });

  // Extract text from Puter ChatResponse
  if (typeof result === "string") return result.trim();
  if (result?.message?.content?.[0]?.text) return result.message.content[0].text.trim();
  if (result?.text) return result.text.trim();
  if (Array.isArray(result?.message?.content)) {
    return result.message.content.map((c: any) => c?.text || "").filter(Boolean).join("\n").trim();
  }
  return JSON.stringify(result, null, 2);
}

/**
 * Reset the Puter instance (for testing or re-auth).
 */
export function resetPuter(): void {
  puterInstance = null;
}
